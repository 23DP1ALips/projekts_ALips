const express = require('express');
const db = require('../config/db');
const { pieprasitAutorizaciju } = require('../middleware/auth');

const router = express.Router();

router.post('/:id/dzest', pieprasitAutorizaciju, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('back');

        const [rindas] = await db.query('SELECT komentars_id, ieraksts_id, autora_id FROM komentars WHERE komentars_id = ?', [id]);
        const komentars = rindas[0];
        if (!komentars) {
            req.flash('error', req.t('flash.comment_not_found'));
            return res.redirect('back');
        }

        const lietotajs = req.session.lietotajs;
        const irAdmins = lietotajs.loma === 'administrators';
        if (lietotajs.lietotajs_id !== komentars.autora_id && !irAdmins) {
            return res.status(403).render('error', { pageTitle: req.t('error.403_title'), kods: 403, zinojums: req.t('error.no_permission_delete_comment') });
        }

        await db.query('DELETE FROM komentars WHERE komentars_id = ?', [id]);
        if (irAdmins && lietotajs.lietotajs_id !== komentars.autora_id) {
            await db.query(
                'INSERT INTO audita_zurnals (lietotajs_id, darbiba, objekta_tips, objekta_id, detalas) VALUES (?, ?, ?, ?, ?)',
                [lietotajs.lietotajs_id, 'dzest_komentaru', 'komentars', id, `Ieraksts #${komentars.ieraksts_id}`]
            );
        }
        req.flash('success', req.t('flash.comment_deleted'));
        res.redirect('/ieraksti/' + komentars.ieraksts_id);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
