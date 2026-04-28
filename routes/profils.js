const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { pieprasitAutorizaciju } = require('../middleware/auth');
const { validetProfilu } = require('../utils/validacija');

const router = express.Router();
const HASH_RAUNDI = 12;

router.use(pieprasitAutorizaciju);

router.get('/', async (req, res, next) => {
    try {
        const id = req.session.lietotajs.lietotajs_id;
        const [rindas] = await db.query(
            'SELECT lietotajs_id, lietotajvards, epasts, profila_apraksts, loma, registracijas_datums FROM lietotajs WHERE lietotajs_id = ?',
            [id]
        );
        const lietotajs = rindas[0];
        const [statRez] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM ieraksts WHERE autora_id = ?) AS ierakstu_skaits,
                (SELECT COUNT(*) FROM komentars WHERE autora_id = ?) AS komentaru_skaits
        `, [id, id]);

        res.render('profils/profils', {
            pageTitle: req.t('profils.my_title'),
            mansProfils: lietotajs,
            statistika: statRez[0],
            forma: { profila_apraksts: lietotajs.profila_apraksts || '' },
            kludas: {},
            parolesKludas: {},
        });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const id = req.session.lietotajs.lietotajs_id;
        const { profila_apraksts = '' } = req.body;
        const kludas = validetProfilu({ profila_apraksts });

        if (Object.keys(kludas).length) {
            return rendereProfilu(req, res, next, { kludas, formaApraksts: profila_apraksts });
        }

        await db.query(
            'UPDATE lietotajs SET profila_apraksts = ? WHERE lietotajs_id = ?',
            [profila_apraksts.trim() || null, id]
        );
        req.flash('success', req.t('flash.profile_updated'));
        res.redirect('/profils');
    } catch (err) {
        next(err);
    }
});

router.post('/parole', async (req, res, next) => {
    try {
        const id = req.session.lietotajs.lietotajs_id;
        const { parole_pasreizeja = '', parole_jauna = '', parole_apstiprinata = '' } = req.body;
        const kludas = {};

        if (!parole_pasreizeja) kludas.parole_pasreizeja = 'validation.current_password_required';
        if (!parole_jauna || parole_jauna.length < 8 || !/[A-Za-z]/.test(parole_jauna) || !/\d/.test(parole_jauna)) {
            kludas.parole_jauna = 'validation.new_password_strength';
        }
        if (parole_jauna !== parole_apstiprinata) {
            kludas.parole_apstiprinata = 'validation.password_mismatch';
        }

        if (!Object.keys(kludas).length) {
            const [rindas] = await db.query('SELECT paroles_hash FROM lietotajs WHERE lietotajs_id = ?', [id]);
            const sakritiba = rindas[0] ? await bcrypt.compare(parole_pasreizeja, rindas[0].paroles_hash) : false;
            if (!sakritiba) {
                kludas.parole_pasreizeja = 'validation.current_password_wrong';
            }
        }

        if (Object.keys(kludas).length) {
            return rendereProfilu(req, res, next, { parolesKludas: kludas });
        }

        const hash = await bcrypt.hash(parole_jauna, HASH_RAUNDI);
        await db.query('UPDATE lietotajs SET paroles_hash = ? WHERE lietotajs_id = ?', [hash, id]);
        req.flash('success', req.t('flash.password_changed'));
        res.redirect('/profils');
    } catch (err) {
        next(err);
    }
});

async function rendereProfilu(req, res, next, papildus = {}) {
    try {
        const id = req.session.lietotajs.lietotajs_id;
        const [rindas] = await db.query(
            'SELECT lietotajs_id, lietotajvards, epasts, profila_apraksts, loma, registracijas_datums FROM lietotajs WHERE lietotajs_id = ?',
            [id]
        );
        const lietotajs = rindas[0];
        const [statRez] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM ieraksts WHERE autora_id = ?) AS ierakstu_skaits,
                (SELECT COUNT(*) FROM komentars WHERE autora_id = ?) AS komentaru_skaits
        `, [id, id]);
        res.status(papildus.kludas || papildus.parolesKludas ? 400 : 200).render('profils/profils', {
            pageTitle: req.t('profils.my_title'),
            mansProfils: lietotajs,
            statistika: statRez[0],
            forma: { profila_apraksts: papildus.formaApraksts !== undefined ? papildus.formaApraksts : (lietotajs.profila_apraksts || '') },
            kludas: papildus.kludas || {},
            parolesKludas: papildus.parolesKludas || {},
        });
    } catch (err) {
        next(err);
    }
}

module.exports = router;
