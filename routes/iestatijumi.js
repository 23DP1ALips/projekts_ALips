const express = require('express');
const { ATBALSTITAS } = require('../utils/i18n');

const router = express.Router();

const KARTOSANAS_VARIANTI = ['jaunakie', 'vecakie', 'populaarakie', 'alfabetiski'];
const LAPAS_LIELUMI = [10, 20, 50];
const TEMAS = ['auto', 'gaisa', 'tumsa'];

router.get('/', (req, res) => {
    res.render('iestatijumi/skats', {
        pageTitle: req.t('iestatijumi.title'),
        iest: dabutIestatijumus(req),
    });
});

router.post('/', (req, res) => {
    const valoda = ATBALSTITAS.includes(req.body.valoda) ? req.body.valoda : 'lv';
    const tema = TEMAS.includes(req.body.tema) ? req.body.tema : 'auto';
    const lapas_lielums = LAPAS_LIELUMI.includes(Number(req.body.lapas_lielums)) ? Number(req.body.lapas_lielums) : 10;
    const noklusejuma_kartosana = KARTOSANAS_VARIANTI.includes(req.body.kartosana) ? req.body.kartosana : 'jaunakie';
    const samazinatas_animacijas = req.body.samazinatas_animacijas === '1';

    const opcijas = { httpOnly: false, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 365, path: '/' };
    res.cookie('lang', valoda, opcijas);
    res.cookie('tema', tema, opcijas);
    res.cookie('lapas_lielums', String(lapas_lielums), opcijas);
    res.cookie('kartosana', noklusejuma_kartosana, opcijas);
    res.cookie('samazinatas_animacijas', samazinatas_animacijas ? '1' : '0', opcijas);

    req.flash('success', req.t('iestatijumi.saved'));
    res.redirect('/iestatijumi');
});

router.post('/atjaunot', (req, res) => {
    const opcijas = { path: '/' };
    res.clearCookie('lang', opcijas);
    res.clearCookie('tema', opcijas);
    res.clearCookie('lapas_lielums', opcijas);
    res.clearCookie('kartosana', opcijas);
    res.clearCookie('samazinatas_animacijas', opcijas);
    req.flash('success', req.t('iestatijumi.reset_done'));
    res.redirect('/iestatijumi');
});

function dabutIestatijumus(req) {
    const cookies = parseAllCookies(req.headers.cookie);
    return {
        valoda: ATBALSTITAS.includes(cookies.lang) ? cookies.lang : (req.lang || 'lv'),
        tema: TEMAS.includes(cookies.tema) ? cookies.tema : 'auto',
        lapas_lielums: LAPAS_LIELUMI.includes(Number(cookies.lapas_lielums)) ? Number(cookies.lapas_lielums) : 10,
        kartosana: KARTOSANAS_VARIANTI.includes(cookies.kartosana) ? cookies.kartosana : 'jaunakie',
        samazinatas_animacijas: cookies.samazinatas_animacijas === '1',
    };
}

function parseAllCookies(header) {
    const r = {};
    if (!header) return r;
    header.split(';').forEach((d) => {
        const [n, v] = d.trim().split('=');
        if (n) r[n] = decodeURIComponent(v || '');
    });
    return r;
}

module.exports = router;
module.exports.dabutIestatijumus = dabutIestatijumus;
