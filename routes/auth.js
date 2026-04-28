const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { validetRegistraciju, validetPieslegsanos } = require('../utils/validacija');
const { noverstAutorizetus } = require('../middleware/auth');

const router = express.Router();
const HASH_RAUNDI = 12;

router.get('/registreties', noverstAutorizetus, (req, res) => {
    res.render('auth/registreties', {
        pageTitle: req.t('auth.register_title'),
        forma: { lietotajvards: '', epasts: '' },
        kludas: {},
    });
});

router.post('/registreties', noverstAutorizetus, async (req, res, next) => {
    try {
        const { lietotajvards = '', epasts = '', parole = '', paroleApstiprinata = '' } = req.body;
        const kludas = validetRegistraciju({ lietotajvards, epasts, parole, paroleApstiprinata });

        if (Object.keys(kludas).length) {
            return res.status(400).render('auth/registreties', {
                pageTitle: req.t('auth.register_title'),
                forma: { lietotajvards, epasts },
                kludas,
            });
        }

        const tirsLietotajvards = lietotajvards.trim();
        const tirsEpasts = epasts.trim().toLowerCase();

        const [esosie] = await db.query(
            'SELECT lietotajs_id, lietotajvards, epasts FROM lietotajs WHERE lietotajvards = ? OR epasts = ? LIMIT 1',
            [tirsLietotajvards, tirsEpasts]
        );
        if (esosie.length) {
            const e = esosie[0];
            if (e.lietotajvards === tirsLietotajvards) kludas.lietotajvards = 'validation.username_taken';
            if (e.epasts === tirsEpasts) kludas.epasts = 'validation.email_taken';
            return res.status(409).render('auth/registreties', {
                pageTitle: req.t('auth.register_title'),
                forma: { lietotajvards, epasts },
                kludas,
            });
        }

        const hash = await bcrypt.hash(parole, HASH_RAUNDI);
        const [rez] = await db.query(
            'INSERT INTO lietotajs (lietotajvards, epasts, paroles_hash, loma) VALUES (?, ?, ?, ?)',
            [tirsLietotajvards, tirsEpasts, hash, 'lietotajs']
        );

        req.session.lietotajs = {
            lietotajs_id: rez.insertId,
            lietotajvards: tirsLietotajvards,
            epasts: tirsEpasts,
            loma: 'lietotajs',
        };
        req.flash('success', req.t('flash.register_success'));
        res.redirect('/');
    } catch (err) {
        next(err);
    }
});

router.get('/pieslegties', noverstAutorizetus, (req, res) => {
    res.render('auth/pieslegties', {
        pageTitle: req.t('auth.login_title'),
        forma: { identifikators: '' },
        kludas: {},
        nakamais: req.query.nakamais || '',
    });
});

router.post('/pieslegties', noverstAutorizetus, async (req, res, next) => {
    try {
        const { identifikators = '', parole = '' } = req.body;
        const nakamais = req.body.nakamais || '';
        const kludas = validetPieslegsanos({ identifikators, parole });
        if (Object.keys(kludas).length) {
            return res.status(400).render('auth/pieslegties', {
                pageTitle: req.t('auth.login_title'),
                forma: { identifikators },
                kludas,
                nakamais,
            });
        }

        const tirsId = identifikators.trim();
        const [rindas] = await db.query(
            'SELECT lietotajs_id, lietotajvards, epasts, paroles_hash, loma, statuss FROM lietotajs WHERE lietotajvards = ? OR epasts = ? LIMIT 1',
            [tirsId, tirsId.toLowerCase()]
        );

        const lietotajs = rindas[0];
        const sakritiba = lietotajs ? await bcrypt.compare(parole, lietotajs.paroles_hash) : false;

        if (!lietotajs || !sakritiba) {
            return res.status(401).render('auth/pieslegties', {
                pageTitle: req.t('auth.login_title'),
                forma: { identifikators },
                kludas: { visparigs: 'auth.wrong_credentials' },
                nakamais,
            });
        }

        if (lietotajs.statuss !== 'aktivs') {
            return res.status(403).render('auth/pieslegties', {
                pageTitle: req.t('auth.login_title'),
                forma: { identifikators },
                kludas: { visparigs: 'auth.blocked' },
                nakamais,
            });
        }

        req.session.regenerate((kluda) => {
            if (kluda) return next(kluda);
            req.session.lietotajs = {
                lietotajs_id: lietotajs.lietotajs_id,
                lietotajvards: lietotajs.lietotajvards,
                epasts: lietotajs.epasts,
                loma: lietotajs.loma,
            };
            req.flash('success', req.t('flash.login_success'));
            const merka = drosaAdrese(nakamais);
            res.redirect(merka || '/');
        });
    } catch (err) {
        next(err);
    }
});

router.post('/iziet', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('forum.sid');
        res.redirect('/');
    });
});

function drosaAdrese(adrese) {
    if (!adrese || typeof adrese !== 'string') return null;
    if (!adrese.startsWith('/') || adrese.startsWith('//')) return null;
    return adrese;
}

module.exports = router;
