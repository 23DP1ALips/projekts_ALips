const crypto = require('crypto');

const ATBRIVOTI_PATHS = new Set([
    '/valoda',
]);

function isamHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dabutZetonu(req) {
    if (!req.session) return null;
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(24).toString('base64url');
    }
    return req.session.csrfToken;
}

function timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    try {
        return crypto.timingSafeEqual(ba, bb);
    } catch (_) {
        return false;
    }
}

function injectMiddleware(req, res, next) {
    const token = dabutZetonu(req);
    res.locals.csrfToken = token;
    res.locals.csrfField = () => token
        ? `<input type="hidden" name="_csrf" value="${isamHtml(token)}">`
        : '';
    res.locals.csrfMeta = () => token
        ? `<meta name="csrf-token" content="${isamHtml(token)}">`
        : '';
    next();
}

function validateMiddleware(req, res, next) {
    const drosaaMetode = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
    if (drosaaMetode) return next();

    const piedavajumzetons = (req.body && req.body._csrf)
        || req.headers['x-csrf-token']
        || req.headers['csrf-token'];
    const sesijasZetons = req.session && req.session.csrfToken;

    if (!sesijasZetons || !timingSafeEqual(piedavajumzetons || '', sesijasZetons)) {
        if (req.is('application/json') || req.headers.accept === 'application/json') {
            return res.status(403).json({ kluda: req.t ? req.t('error.csrf') : 'CSRF token invalid or missing.' });
        }
        return res.status(403).render('error', {
            pageTitle: req.t ? req.t('error.403_title') : 'Forbidden',
            kods: 403,
            zinojums: req.t ? req.t('error.csrf') : 'Sessijas drošības žetons nav derīgs vai trūkst. Atveriet lapu vēlreiz un mēģiniet vēlreiz.',
        });
    }
    next();
}

module.exports = { injectMiddleware, validateMiddleware, ATBRIVOTI_PATHS };
