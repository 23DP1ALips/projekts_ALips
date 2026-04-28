const express = require('express');
const db = require('../config/db');
const { pieprasitAutorizaciju } = require('../middleware/auth');

const router = express.Router();

router.use(pieprasitAutorizaciju);

router.get('/', async (req, res, next) => {
    try {
        const manaId = req.session.lietotajs.lietotajs_id;
        const [pazinojumi] = await db.query(`
            SELECT pazinojums_id, tips, teksts, avota_tips, avota_id, izlasits, izveidots
            FROM pazinojums
            WHERE sanemeja_id = ?
            ORDER BY izveidots DESC
            LIMIT 100
        `, [manaId]);

        res.render('pazinojumi/saraksts', {
            pageTitle: req.t('pazinojumi.title'),
            pazinojumi,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/lasits', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/pazinojumi');
        await db.query(
            'UPDATE pazinojums SET izlasits = TRUE WHERE pazinojums_id = ? AND sanemeja_id = ?',
            [id, req.session.lietotajs.lietotajs_id]
        );
        const merka = pazinojumaMerka(req.body.tips, req.body.avota_tips, req.body.avota_id);
        res.redirect(merka || '/pazinojumi');
    } catch (err) {
        next(err);
    }
});

router.post('/visi-lasit', async (req, res, next) => {
    try {
        await db.query(
            'UPDATE pazinojums SET izlasits = TRUE WHERE sanemeja_id = ? AND izlasits = FALSE',
            [req.session.lietotajs.lietotajs_id]
        );
        req.flash('success', req.t('flash.all_notifications_read'));
        res.redirect('/pazinojumi');
    } catch (err) {
        next(err);
    }
});

function pazinojumaMerka(tips, avotaTips, avotaId) {
    const id = Number(avotaId);
    if (!Number.isInteger(id)) return null;
    if (tips === 'komentars' && avotaTips === 'ieraksts') return '/ieraksti/' + id;
    if (tips === 'privata_zina' && avotaTips === 'lietotajs') return '/zinas/' + id;
    return null;
}

module.exports = router;
