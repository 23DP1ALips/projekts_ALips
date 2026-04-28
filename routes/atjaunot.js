const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { sutitEpastu } = require('../utils/epasts');
const { patereetCheck, dabutIp } = require('../utils/rateLimiter');
const { noverstAutorizetus } = require('../middleware/auth');

const router = express.Router();
const HASH_RAUNDI = 12;
const ZETONA_DERIGUMS_MS = 60 * 60 * 1000;

const PASSWORD_LIMITI = (atslega) => ([
    { key: `parole:${atslega}:30min`, max: 3, windowMs: 30 * 60 * 1000 },
    { key: `parole:${atslega}:dien`, max: 10, windowMs: 24 * 60 * 60 * 1000 },
]);

function basesUrl(req) {
    const baze = process.env.BASE_URL;
    if (baze) return baze.replace(/\/$/, '');
    return `${req.protocol}://${req.get('host')}`;
}

function hashotZetonu(zetons) {
    return crypto.createHash('sha256').update(zetons, 'utf8').digest('hex');
}

router.get('/aizmirsu-paroli', noverstAutorizetus, (req, res) => {
    res.render('atjaunot/aizmirsu', {
        pageTitle: req.t('paroles_atjaunosana.request_title'),
        forma: { epasts: '' },
        kludas: {},
        nosutits: false,
    });
});

router.post('/aizmirsu-paroli', noverstAutorizetus, async (req, res, next) => {
    try {
        const epasts = (req.body.epasts || '').trim().toLowerCase();
        if (!epasts || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(epasts)) {
            return res.status(400).render('atjaunot/aizmirsu', {
                pageTitle: req.t('paroles_atjaunosana.request_title'),
                forma: { epasts: req.body.epasts || '' },
                kludas: { epasts: 'validation.email_invalid' },
                nosutits: false,
            });
        }

        const ip = dabutIp(req);
        const limits = patereetCheck(PASSWORD_LIMITI(`ip:${ip}|email:${epasts}`));
        if (!limits.ok) {
            req.flash('error', req.t('validation.rate_limit_password', { seconds: limits.retryAfterSec }));
            return res.redirect('/aizmirsu-paroli');
        }

        const [rindas] = await db.query(
            'SELECT lietotajs_id, lietotajvards, statuss FROM lietotajs WHERE epasts = ? LIMIT 1',
            [epasts]
        );
        const lietotajs = rindas[0];

        if (lietotajs && lietotajs.statuss === 'aktivs') {
            const zetons = crypto.randomBytes(32).toString('hex');
            const zetonaHash = hashotZetonu(zetons);
            const derigsLidz = new Date(Date.now() + ZETONA_DERIGUMS_MS);

            await db.query(
                `INSERT INTO paroles_atjaunosanas (lietotajs_id, zetona_hash, derigs_lidz, ip)
                 VALUES (?, ?, ?, ?)`,
                [lietotajs.lietotajs_id, zetonaHash, derigsLidz, ip]
            );

            const url = `${basesUrl(req)}/atjaunot-paroli/${zetons}`;
            try {
                await sutitEpastu({
                    to: epasts,
                    subject: req.t('paroles_atjaunosana.email_subject'),
                    text: req.t('paroles_atjaunosana.email_body', { user: lietotajs.lietotajvards, url }),
                });
            } catch (kluda) {
                console.error('Paroles atjaunosanas epasta kluda:', kluda.message);
            }
        }

        res.render('atjaunot/aizmirsu', {
            pageTitle: req.t('paroles_atjaunosana.request_title'),
            forma: { epasts },
            kludas: {},
            nosutits: true,
        });
    } catch (err) {
        next(err);
    }
});

router.get('/atjaunot-paroli/:zetons', noverstAutorizetus, async (req, res, next) => {
    try {
        const zetons = req.params.zetons;
        const lietotajs = await dabutDerigaZetonaLietotaju(zetons);
        if (!lietotajs) {
            req.flash('error', req.t('paroles_atjaunosana.invalid_token'));
            return res.redirect('/aizmirsu-paroli');
        }
        res.render('atjaunot/jauna', {
            pageTitle: req.t('paroles_atjaunosana.new_title'),
            zetons,
            kludas: {},
        });
    } catch (err) {
        next(err);
    }
});

router.post('/atjaunot-paroli/:zetons', noverstAutorizetus, async (req, res, next) => {
    try {
        const zetons = req.params.zetons;
        const { parole = '', paroleApstiprinata = '' } = req.body;

        const kludas = {};
        if (!parole || parole.length < 8 || parole.length > 100) {
            kludas.parole = 'validation.password_length';
        } else if (!/[A-Za-z]/.test(parole) || !/\d/.test(parole)) {
            kludas.parole = 'validation.password_strength';
        }
        if (parole !== paroleApstiprinata) {
            kludas.paroleApstiprinata = 'validation.password_mismatch';
        }

        if (Object.keys(kludas).length) {
            return res.status(400).render('atjaunot/jauna', {
                pageTitle: req.t('paroles_atjaunosana.new_title'),
                zetons,
                kludas,
            });
        }

        const lietotajs = await dabutDerigaZetonaLietotaju(zetons);
        if (!lietotajs) {
            req.flash('error', req.t('paroles_atjaunosana.invalid_token'));
            return res.redirect('/aizmirsu-paroli');
        }

        const hash = await bcrypt.hash(parole, HASH_RAUNDI);
        await db.query(
            'UPDATE lietotajs SET paroles_hash = ? WHERE lietotajs_id = ?',
            [hash, lietotajs.lietotajs_id]
        );
        await db.query(
            'UPDATE paroles_atjaunosanas SET izmantots = TRUE WHERE lietotajs_id = ? AND izmantots = FALSE',
            [lietotajs.lietotajs_id]
        );

        req.flash('success', req.t('paroles_atjaunosana.success'));
        res.redirect('/pieslegties');
    } catch (err) {
        next(err);
    }
});

async function dabutDerigaZetonaLietotaju(zetons) {
    if (!zetons || typeof zetons !== 'string' || !/^[a-f0-9]{64}$/.test(zetons)) return null;
    const zetonaHash = hashotZetonu(zetons);
    const [rindas] = await db.query(
        `SELECT z.zetons_id, l.lietotajs_id, l.lietotajvards, l.epasts
         FROM paroles_atjaunosanas z
         JOIN lietotajs l ON l.lietotajs_id = z.lietotajs_id
         WHERE z.zetona_hash = ? AND z.izmantots = FALSE AND z.derigs_lidz > NOW() AND l.statuss = 'aktivs'
         LIMIT 1`,
        [zetonaHash]
    );
    return rindas[0] || null;
}

module.exports = router;
