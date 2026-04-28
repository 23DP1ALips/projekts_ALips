const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(404).render('error', { pageTitle: req.t('error.404_title'), kods: 404, zinojums: req.t('error.user_not_found') });

        const [rindas] = await db.query(
            'SELECT lietotajs_id, lietotajvards, profila_apraksts, loma, statuss, registracijas_datums FROM lietotajs WHERE lietotajs_id = ?',
            [id]
        );
        const profils = rindas[0];
        if (!profils) return res.status(404).render('error', { pageTitle: req.t('error.404_title'), kods: 404, zinojums: req.t('error.user_not_found') });

        const [ieraksti] = await db.query(`
            SELECT i.ieraksts_id, i.virsraksts, i.izveidots,
                   k.nosaukums AS kategorijas_nosaukums, k.kategorija_id,
                   (SELECT COUNT(*) FROM komentars c WHERE c.ieraksts_id = i.ieraksts_id AND c.statuss = 'redzams') AS komentaru_skaits
            FROM ieraksts i
            JOIN kategorija k ON k.kategorija_id = i.kategorija_id
            WHERE i.autora_id = ? AND i.statuss = 'publicets'
            ORDER BY i.izveidots DESC
            LIMIT 20
        `, [id]);

        const [statRez] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM ieraksts WHERE autora_id = ? AND statuss = 'publicets') AS ierakstu_skaits,
                (SELECT COUNT(*) FROM komentars WHERE autora_id = ? AND statuss = 'redzams') AS komentaru_skaits
        `, [id, id]);

        res.render('lietotaji/profils', {
            pageTitle: req.t('profils.public_title', { user: profils.lietotajvards }),
            profils,
            ieraksti,
            statistika: statRez[0],
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
