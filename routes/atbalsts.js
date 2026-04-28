const express = require('express');
const db = require('../config/db');
const { validetAtbalstu } = require('../utils/validacija');
const { sutitEpastu, isKonfigurets } = require('../utils/epasts');
const { patereetCheck, dabutIp } = require('../utils/rateLimiter');

const router = express.Router();

const SUPPORT_LIMITI = (id) => ([
    { key: `support:${id}:10min`, max: 3, windowMs: 10 * 60 * 1000 },
    { key: `support:${id}:dien`, max: 10, windowMs: 24 * 60 * 60 * 1000 },
]);

router.get('/', async (req, res, next) => {
    try {
        let mans_pieprasijumi = [];
        if (req.session.lietotajs) {
            const [rindas] = await db.query(
                `SELECT atbalsts_id, tema, statuss, izveidots, atbildets
                 FROM atbalsta_zinojums WHERE lietotajs_id = ? ORDER BY izveidots DESC LIMIT 50`,
                [req.session.lietotajs.lietotajs_id]
            );
            mans_pieprasijumi = rindas;
        }
        const lietotajsDati = req.session.lietotajs;
        res.render('atbalsts/forma', {
            pageTitle: req.t('atbalsts.title'),
            forma: {
                vards: lietotajsDati ? lietotajsDati.lietotajvards : '',
                epasts: lietotajsDati ? lietotajsDati.epasts : '',
                tema: '',
                zinojums: '',
            },
            kludas: {},
            supportEmail: process.env.SUPPORT_EMAIL || '',
            smtpKonfigurets: isKonfigurets(),
            mans_pieprasijumi,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const lietotajsDati = req.session.lietotajs;
        const { vards = '', epasts = '', tema = '', zinojums = '' } = req.body;

        const limitsAtslega = lietotajsDati ? `user:${lietotajsDati.lietotajs_id}` : `ip:${dabutIp(req)}`;
        const limits = patereetCheck(SUPPORT_LIMITI(limitsAtslega));
        if (!limits.ok) {
            req.flash('error', req.t('validation.rate_limit_support', { seconds: limits.retryAfterSec }));
            return res.redirect('/atbalsts');
        }

        const kludas = validetAtbalstu({ vards, epasts, tema, zinojums });

        if (Object.keys(kludas).length) {
            let mans_pieprasijumi = [];
            if (lietotajsDati) {
                const [rindas] = await db.query(
                    `SELECT atbalsts_id, tema, statuss, izveidots, atbildets
                     FROM atbalsta_zinojums WHERE lietotajs_id = ? ORDER BY izveidots DESC LIMIT 50`,
                    [lietotajsDati.lietotajs_id]
                );
                mans_pieprasijumi = rindas;
            }
            return res.status(400).render('atbalsts/forma', {
                pageTitle: req.t('atbalsts.title'),
                forma: { vards, epasts, tema, zinojums },
                kludas,
                supportEmail: process.env.SUPPORT_EMAIL || '',
                smtpKonfigurets: isKonfigurets(),
                mans_pieprasijumi,
            });
        }

        const [rez] = await db.query(
            `INSERT INTO atbalsta_zinojums
             (lietotajs_id, nosutitaja_vards, nosutitaja_epasts, tema, zinojums)
             VALUES (?, ?, ?, ?, ?)`,
            [
                lietotajsDati ? lietotajsDati.lietotajs_id : null,
                vards.trim(),
                epasts.trim().toLowerCase(),
                tema.trim(),
                zinojums.trim(),
            ]
        );

        const supportEmail = process.env.SUPPORT_EMAIL;
        if (supportEmail) {
            try {
                const lietotajaInfo = lietotajsDati
                    ? `Konts: ${lietotajsDati.lietotajvards} (#${lietotajsDati.lietotajs_id})`
                    : `Viesis (nav reģistrēts)`;
                await sutitEpastu({
                    to: supportEmail,
                    replyTo: epasts.trim(),
                    subject: req.t('epasts.support_subject_admin', { subject: tema.trim() }),
                    text: [
                        req.t('epasts.support_body_intro'),
                        '',
                        `${req.t('atbalsts.name_label')}: ${vards.trim()}`,
                        `${req.t('atbalsts.email_label')}: ${epasts.trim()}`,
                        lietotajaInfo,
                        '',
                        `${req.t('atbalsts.subject_label')}: ${tema.trim()}`,
                        '',
                        `${req.t('atbalsts.message_label')}:`,
                        zinojums.trim(),
                        '',
                        `--`,
                        `Atbalsta pieprasījuma ID: ${rez.insertId}`,
                    ].join('\n'),
                });
            } catch (kluda) {
                console.error('Atbalsta epasta sutisanas kluda:', kluda);
            }
        }

        if (lietotajsDati) {
            try {
                const pazTeksts = JSON.stringify({
                    key: 'pazinojumi_atbalsts.submitted',
                    params: { subject: tema.trim() },
                });
                await db.query(
                    `INSERT INTO pazinojums (sanemeja_id, tips, teksts, avota_tips, avota_id)
                     VALUES (?, 'sistemas', ?, 'atbalsts', ?)`,
                    [lietotajsDati.lietotajs_id, pazTeksts, rez.insertId]
                );
            } catch (kluda) {
                console.error('Atbalsta pazinojuma kluda:', kluda);
            }
        }

        req.flash('success', req.t('atbalsts.success'));
        res.redirect('/atbalsts');
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/atbalsts');
        const [rindas] = await db.query(
            `SELECT a.*, atbildejis.lietotajvards AS atbildejusais
             FROM atbalsta_zinojums a
             LEFT JOIN lietotajs atbildejis ON atbildejis.lietotajs_id = a.atbildejis_lietotajs_id
             WHERE a.atbalsts_id = ?`,
            [id]
        );
        const pieprasijums = rindas[0];
        if (!pieprasijums) return res.redirect('/atbalsts');

        const lietotajsDati = req.session.lietotajs;
        const irAdmins = lietotajsDati && lietotajsDati.loma === 'administrators';
        const irIpasnieks = lietotajsDati && pieprasijums.lietotajs_id === lietotajsDati.lietotajs_id;
        if (!irAdmins && !irIpasnieks) {
            return res.status(403).render('error', {
                pageTitle: req.t('error.403_title'),
                kods: 403,
                zinojums: req.t('error.403_msg'),
            });
        }

        res.render('atbalsts/skats', {
            pageTitle: pieprasijums.tema,
            pieprasijums,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
