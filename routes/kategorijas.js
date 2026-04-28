const express = require('express');
const db = require('../config/db');
const { pieprasitAutorizaciju } = require('../middleware/auth');
const { validetKategoriju } = require('../utils/validacija');
const { patereetCheck } = require('../utils/rateLimiter');

const router = express.Router();

const KATEGORIJAS_LIMITI = (lietotajsId) => ([
    { key: `kategorija:user:${lietotajsId}:dien`, max: 3, windowMs: 24 * 60 * 60 * 1000 },
]);

router.get('/', async (req, res, next) => {
    try {
        const [rindas] = await db.query(`
            SELECT k.kategorija_id, k.nosaukums, k.apraksts, k.secibas_nr, k.aktiva,
                   COUNT(i.ieraksts_id) AS ierakstu_skaits
            FROM kategorija k
            LEFT JOIN ieraksts i
                ON i.kategorija_id = k.kategorija_id AND i.statuss = 'publicets'
            WHERE k.aktiva = TRUE
            GROUP BY k.kategorija_id
            ORDER BY k.secibas_nr ASC, k.nosaukums ASC
        `);
        res.render('kategorijas/saraksts', {
            pageTitle: req.t('kategorijas.title'),
            kategorijas: rindas,
        });
    } catch (err) {
        next(err);
    }
});

router.get('/jauna', pieprasitAutorizaciju, (req, res) => {
    res.render('kategorijas/jauna', {
        pageTitle: req.t('kategorijas.create_title'),
        forma: { nosaukums: '', apraksts: '' },
        kludas: {},
    });
});

router.post('/jauna', pieprasitAutorizaciju, async (req, res, next) => {
    try {
        const { nosaukums = '', apraksts = '' } = req.body;
        const kludas = validetKategoriju({ nosaukums });

        if (Object.keys(kludas).length === 0) {
            const limits = patereetCheck(KATEGORIJAS_LIMITI(req.session.lietotajs.lietotajs_id));
            if (!limits.ok) {
                req.flash('error', req.t('kategorijas.rate_limited', { hours: Math.ceil(limits.retryAfterSec / 3600) }));
                return res.redirect('/kategorijas');
            }

            try {
                const [rez] = await db.query(
                    'INSERT INTO kategorija (nosaukums, apraksts, secibas_nr, aktiva) VALUES (?, ?, ?, TRUE)',
                    [nosaukums.trim(), apraksts.trim() || null, 100]
                );
                req.flash('success', req.t('kategorijas.created'));
                return res.redirect('/ieraksti/jauns?kategorija=' + rez.insertId);
            } catch (kluda) {
                if (kluda && kluda.code === 'ER_DUP_ENTRY') {
                    kludas.nosaukums = 'validation.category_name_taken';
                } else {
                    throw kluda;
                }
            }
        }

        res.status(400).render('kategorijas/jauna', {
            pageTitle: req.t('kategorijas.create_title'),
            forma: { nosaukums, apraksts },
            kludas,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
