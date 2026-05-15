require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const flash = require('connect-flash');

const { formatDatums, nl2br, saisinat, tulkotPazinojumu } = require('./utils/format');
const { buildSortLink } = require('./utils/sort');
const csrf = require('./utils/csrf');
const i18n = require('./utils/i18n');
const { dabutIestatijumus } = require('./routes/iestatijumi');
const db = require('./config/db');

const SESSION_SECRET = process.env.SESSION_SECRET;
const NEDROSI_NOKLUSEJUMI = new Set(['mainit-uz-savu-noslepumu', 'parmainit-uz-savu-noslepumu', 'change-me', 'secret']);
if (!SESSION_SECRET || SESSION_SECRET.length < 32 || NEDROSI_NOKLUSEJUMI.has(SESSION_SECRET)) {
    console.error('FATAL: SESSION_SECRET environment variable is required and must be at least 32 characters.');
    console.error('Generate a secure value with:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"');
    console.error('Set it in your .env file as SESSION_SECRET=...');
    process.exit(1);
}

const app = express();

// Aiz hostinga reverse proxy (Railway/Render/u.c.) - uztic vienai HTTP-galvenei
// X-Forwarded-Proto, lai express-session zinatu, ka pieprasijums nak ar TLS.
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 'loopback, linklocal, uniquelocal');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    name: 'forum.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
    },
}));
app.use(flash());

app.use(i18n.middleware());

app.use(csrf.injectMiddleware);

app.use((req, res, next) => {
    res.locals.lietotajs = req.session.lietotajs || null;
    res.locals.flash = {
        success: req.flash('success'),
        error: req.flash('error'),
        info: req.flash('info'),
    };
    res.locals.pageTitle = 'Forums';
    res.locals.path = req.path;
    res.locals.query = req.query;
    res.locals.format = { formatDatums, nl2br, saisinat, tulkotPazinojumu };
    res.locals.nelasitiPazinojumi = 0;
    res.locals.nelasitasZinas = 0;
    res.locals.iestatijumi = dabutIestatijumus(req);
    res.locals.sortLink = (kolonna, virsraksts, sortInfo) => buildSortLink(kolonna, virsraksts, sortInfo, req.query);
    next();
});

app.use(csrf.validateMiddleware);

app.use(async (req, res, next) => {
    if (!req.session.lietotajs) return next();
    try {
        const [rez] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM pazinojums WHERE sanemeja_id = ? AND izlasits = FALSE) AS pazinojumi,
                (SELECT COUNT(*) FROM privata_zina WHERE sanemeja_id = ? AND izlasita = FALSE) AS zinas
        `, [req.session.lietotajs.lietotajs_id, req.session.lietotajs.lietotajs_id]);
        res.locals.nelasitiPazinojumi = rez[0].pazinojumi;
        res.locals.nelasitasZinas = rez[0].zinas;
    } catch (kluda) {
        console.error('Nelasīto skaitīšanas kļūda:', kluda);
    }
    next();
});

app.get('/', (req, res) => {
    res.render('home', { pageTitle: req.t('home.title') });
});

app.use('/valoda', require('./routes/valoda'));
app.use('/iestatijumi', require('./routes/iestatijumi'));
app.use('/atbalsts', require('./routes/atbalsts'));
app.use('/', require('./routes/atjaunot'));
app.use('/', require('./routes/auth'));
app.use('/kategorijas', require('./routes/kategorijas'));
app.use('/ieraksti', require('./routes/ieraksti'));
app.use('/komentari', require('./routes/komentari'));
app.use('/zinas', require('./routes/zinas'));
app.use('/pazinojumi', require('./routes/pazinojumi'));
app.use('/profils', require('./routes/profils'));
app.use('/lietotaji', require('./routes/lietotaji'));
app.use('/ai', require('./routes/ai'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
    res.status(404).render('error', { pageTitle: req.t('error.404_title'), kods: 404, zinojums: req.t('error.404_msg') });
});

app.use((err, req, res, _next) => {
    console.error(err);
    res.status(500).render('error', { pageTitle: req.t('error.title'), kods: 500, zinojums: req.t('error.500_msg') });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`Forums klausās uz http://localhost:${port}`);
});
