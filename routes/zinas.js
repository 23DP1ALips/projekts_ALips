const express = require('express');
const db = require('../config/db');
const { pieprasitAutorizaciju } = require('../middleware/auth');
const { validetZinu } = require('../utils/validacija');

const router = express.Router();

router.use(pieprasitAutorizaciju);

router.get('/', async (req, res, next) => {
    try {
        const manaId = req.session.lietotajs.lietotajs_id;

        const [sarunas] = await db.query(`
            SELECT otrs.lietotajs_id, otrs.lietotajvards,
                   pz.saturs AS pedejas_saturs, pz.nosutits AS pedejas_nosutits,
                   pz.sutitaja_id AS pedejas_sutitajs,
                   (SELECT COUNT(*) FROM privata_zina pz2
                    WHERE pz2.sanemeja_id = ? AND pz2.sutitaja_id = otrs.lietotajs_id AND pz2.izlasita = FALSE) AS nelasitas
            FROM (
                SELECT MAX(zina_id) AS pedejas_zina_id,
                       CASE WHEN sutitaja_id = ? THEN sanemeja_id ELSE sutitaja_id END AS otrs_id
                FROM privata_zina
                WHERE sutitaja_id = ? OR sanemeja_id = ?
                GROUP BY otrs_id
            ) AS jaunakas
            JOIN privata_zina pz ON pz.zina_id = jaunakas.pedejas_zina_id
            JOIN lietotajs otrs ON otrs.lietotajs_id = jaunakas.otrs_id
            ORDER BY pz.nosutits DESC
        `, [manaId, manaId, manaId, manaId]);

        res.render('zinas/saraksts', {
            pageTitle: req.t('zinas.title'),
            sarunas,
            aktivaSaruna: null,
            zinas: [],
            saruntotajs: null,
            forma: { sanemejs: '', saturs: '' },
            kludas: {},
        });
    } catch (err) {
        next(err);
    }
});

router.get('/jauna', async (req, res, next) => {
    try {
        const manaId = req.session.lietotajs.lietotajs_id;
        const [sarunas] = await iegutSarunuSarakstu(manaId);
        res.render('zinas/saraksts', {
            pageTitle: req.t('zinas.new'),
            sarunas,
            aktivaSaruna: null,
            zinas: [],
            saruntotajs: null,
            forma: { sanemejs: req.query.lietotajs || '', saturs: '' },
            kludas: {},
            jaunaForma: true,
        });
    } catch (err) {
        next(err);
    }
});

router.get('/:lietotajsId', async (req, res, next) => {
    try {
        const manaId = req.session.lietotajs.lietotajs_id;
        const otrsId = Number(req.params.lietotajsId);
        if (!Number.isInteger(otrsId) || otrsId === manaId) return res.redirect('/zinas');

        const [otrsRez] = await db.query('SELECT lietotajs_id, lietotajvards FROM lietotajs WHERE lietotajs_id = ?', [otrsId]);
        const otrs = otrsRez[0];
        if (!otrs) {
            req.flash('error', req.t('flash.user_not_found'));
            return res.redirect('/zinas');
        }

        const [zinas] = await db.query(`
            SELECT zina_id, sutitaja_id, sanemeja_id, saturs, nosutits, izlasita
            FROM privata_zina
            WHERE (sutitaja_id = ? AND sanemeja_id = ?) OR (sutitaja_id = ? AND sanemeja_id = ?)
            ORDER BY nosutits ASC, zina_id ASC
        `, [manaId, otrsId, otrsId, manaId]);

        await db.query(
            'UPDATE privata_zina SET izlasita = TRUE WHERE sanemeja_id = ? AND sutitaja_id = ? AND izlasita = FALSE',
            [manaId, otrsId]
        );

        const [sarunas] = await iegutSarunuSarakstu(manaId);

        res.render('zinas/saraksts', {
            pageTitle: req.t('zinas.thread_with', { user: otrs.lietotajvards }),
            sarunas,
            aktivaSaruna: otrsId,
            zinas,
            saruntotajs: otrs,
            forma: { sanemejs: otrs.lietotajvards, saturs: '' },
            kludas: {},
        });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const manaId = req.session.lietotajs.lietotajs_id;
        const { sanemejs = '', saturs = '' } = req.body;
        const kludas = validetZinu({ sanemejs, saturs });

        let saruntotajs = null;
        if (!kludas.sanemejs) {
            const tirsId = sanemejs.trim();
            const [rindas] = await db.query(
                'SELECT lietotajs_id, lietotajvards, statuss FROM lietotajs WHERE lietotajvards = ? OR epasts = ? LIMIT 1',
                [tirsId, tirsId.toLowerCase()]
            );
            saruntotajs = rindas[0];
            if (!saruntotajs) {
                kludas.sanemejs = 'validation.recipient_not_found';
            } else if (saruntotajs.lietotajs_id === manaId) {
                kludas.sanemejs = 'validation.recipient_self';
            } else if (saruntotajs.statuss !== 'aktivs') {
                kludas.sanemejs = 'validation.recipient_blocked';
            }
        }

        if (Object.keys(kludas).length) {
            const [sarunas] = await iegutSarunuSarakstu(manaId);
            return res.status(400).render('zinas/saraksts', {
                pageTitle: req.t('zinas.title'),
                sarunas,
                aktivaSaruna: saruntotajs ? saruntotajs.lietotajs_id : null,
                zinas: [],
                saruntotajs,
                forma: { sanemejs, saturs },
                kludas,
                jaunaForma: true,
            });
        }

        await db.query(
            'INSERT INTO privata_zina (sutitaja_id, sanemeja_id, saturs) VALUES (?, ?, ?)',
            [manaId, saruntotajs.lietotajs_id, saturs.trim()]
        );

        try {
            const pazTeksts = JSON.stringify({
                key: 'pazinojumi.new_private_message',
                params: { user: req.session.lietotajs.lietotajvards },
            });
            await db.query(
                `INSERT INTO pazinojums (sanemeja_id, tips, teksts, avota_tips, avota_id)
                 VALUES (?, 'privata_zina', ?, 'lietotajs', ?)`,
                [saruntotajs.lietotajs_id, pazTeksts, manaId]
            );
        } catch (kluda) {
            console.error('Paziņojuma izveides kļūda:', kluda);
        }

        res.redirect('/zinas/' + saruntotajs.lietotajs_id);
    } catch (err) {
        next(err);
    }
});

async function iegutSarunuSarakstu(manaId) {
    return db.query(`
        SELECT otrs.lietotajs_id, otrs.lietotajvards,
               pz.saturs AS pedejas_saturs, pz.nosutits AS pedejas_nosutits,
               pz.sutitaja_id AS pedejas_sutitajs,
               (SELECT COUNT(*) FROM privata_zina pz2
                WHERE pz2.sanemeja_id = ? AND pz2.sutitaja_id = otrs.lietotajs_id AND pz2.izlasita = FALSE) AS nelasitas
        FROM (
            SELECT MAX(zina_id) AS pedejas_zina_id,
                   CASE WHEN sutitaja_id = ? THEN sanemeja_id ELSE sutitaja_id END AS otrs_id
            FROM privata_zina
            WHERE sutitaja_id = ? OR sanemeja_id = ?
            GROUP BY otrs_id
        ) AS jaunakas
        JOIN privata_zina pz ON pz.zina_id = jaunakas.pedejas_zina_id
        JOIN lietotajs otrs ON otrs.lietotajs_id = jaunakas.otrs_id
        ORDER BY pz.nosutits DESC
    `, [manaId, manaId, manaId, manaId]);
}

module.exports = router;
