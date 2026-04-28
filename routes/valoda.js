const express = require('express');
const { ATBALSTITAS } = require('../utils/i18n');

const router = express.Router();

router.post('/:kods', (req, res) => {
    const kods = req.params.kods;
    if (!ATBALSTITAS.includes(kods)) {
        return res.redirect('back');
    }
    res.cookie('lang', kods, {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 365,
        path: '/',
    });
    const merka = drosaAdrese(req.body.atpakal) || drosaAdrese(req.get('referrer')) || '/';
    res.redirect(merka);
});

function drosaAdrese(adrese) {
    if (!adrese || typeof adrese !== 'string') return null;
    try {
        if (adrese.startsWith('/') && !adrese.startsWith('//')) return adrese;
        const url = new URL(adrese);
        if (url.host === '' || url.pathname.startsWith('/')) return url.pathname + url.search + url.hash;
    } catch (_) { /* ignore */ }
    return null;
}

module.exports = router;
