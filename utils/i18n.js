const fs = require('fs');
const path = require('path');

const ATBALSTITAS = ['lv', 'en', 'ru'];
const NOKLUSEJUMA = 'lv';

const locales = {};

function ieladet() {
    for (const kods of ATBALSTITAS) {
        const fails = path.join(__dirname, '..', 'locales', `${kods}.json`);
        try {
            const teksts = fs.readFileSync(fails, 'utf8');
            locales[kods] = JSON.parse(teksts);
        } catch (kluda) {
            console.error(`Nevareja ieladet locales/${kods}.json:`, kluda.message);
            locales[kods] = {};
        }
    }
}
ieladet();

function megusiOrigKey(obj, atslega) {
    if (!atslega) return undefined;
    return atslega.split('.').reduce((iesp, dala) => (iesp && typeof iesp === 'object' ? iesp[dala] : undefined), obj);
}

function aizvietot(virkne, parametri) {
    if (!parametri || typeof virkne !== 'string') return virkne;
    return virkne.replace(/\{(\w+)\}/g, (m, k) => (parametri[k] !== undefined ? String(parametri[k]) : m));
}

function translate(lang, atslega, parametri) {
    if (atslega === undefined || atslega === null) return '';
    const lietot = ATBALSTITAS.includes(lang) ? lang : NOKLUSEJUMA;
    let v = megusiOrigKey(locales[lietot], atslega);
    if (v === undefined && lietot !== NOKLUSEJUMA) {
        v = megusiOrigKey(locales[NOKLUSEJUMA], atslega);
    }
    if (v === undefined) return atslega;
    return aizvietot(v, parametri);
}

function noteiktValodu(req) {
    const noCookie = parseValodaCookie(req.headers.cookie);
    if (noCookie && ATBALSTITAS.includes(noCookie)) return noCookie;
    const noHeader = parseAcceptLanguage(req.headers['accept-language']);
    if (noHeader) return noHeader;
    return NOKLUSEJUMA;
}

function parseValodaCookie(cookieHeader) {
    if (!cookieHeader) return null;
    const dalas = cookieHeader.split(';').map(s => s.trim());
    for (const d of dalas) {
        const [n, v] = d.split('=');
        if (n === 'lang') return decodeURIComponent(v || '');
    }
    return null;
}

function parseAcceptLanguage(header) {
    if (!header) return null;
    const ieprasitas = header.split(',').map(s => s.split(';')[0].trim().toLowerCase().slice(0, 2));
    for (const v of ieprasitas) {
        if (ATBALSTITAS.includes(v)) return v;
    }
    return null;
}

function middleware() {
    return function (req, res, next) {
        const lang = noteiktValodu(req);
        req.lang = lang;
        const t = (atslega, parametri) => translate(lang, atslega, parametri);
        req.t = t;
        res.locals.lang = lang;
        res.locals.atbalstitasValodas = ATBALSTITAS;
        res.locals.t = t;
        next();
    };
}

module.exports = {
    middleware,
    translate,
    ATBALSTITAS,
    NOKLUSEJUMA,
};
