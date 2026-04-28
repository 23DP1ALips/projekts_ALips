const express = require('express');
const db = require('../config/db');
const { pieprasitAdministratoru } = require('../middleware/auth');
const { validetKategoriju } = require('../utils/validacija');
const { sutitEpastu } = require('../utils/epasts');
const { dabutSortInfo, orderBy } = require('../utils/sort');

const router = express.Router();

router.use(pieprasitAdministratoru);

router.get('/', async (req, res, next) => {
    try {
        const [skaiti] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM lietotajs) AS lietotaju_skaits,
                (SELECT COUNT(*) FROM lietotajs WHERE statuss = 'aktivs') AS aktivu_skaits,
                (SELECT COUNT(*) FROM ieraksts) AS ierakstu_skaits,
                (SELECT COUNT(*) FROM ieraksts WHERE statuss = 'publicets') AS publicetu_skaits,
                (SELECT COUNT(*) FROM komentars) AS komentaru_skaits,
                (SELECT COUNT(*) FROM kategorija) AS kategoriju_skaits,
                (SELECT COUNT(*) FROM privata_zina) AS zinu_skaits
        `);

        const [pa_kategorijam] = await db.query(`
            SELECT k.kategorija_id, k.nosaukums, COUNT(i.ieraksts_id) AS skaits
            FROM kategorija k
            LEFT JOIN ieraksts i ON i.kategorija_id = k.kategorija_id AND i.statuss = 'publicets'
            GROUP BY k.kategorija_id
            ORDER BY skaits DESC, k.nosaukums ASC
            LIMIT 10
        `);

        const [jaunakie_ieraksti] = await db.query(`
            SELECT i.ieraksts_id, i.virsraksts, i.izveidots, l.lietotajvards
            FROM ieraksts i
            JOIN lietotajs l ON l.lietotajs_id = i.autora_id
            ORDER BY i.izveidots DESC
            LIMIT 5
        `);

        const [populaarakie] = await db.query(`
            SELECT i.ieraksts_id, i.virsraksts, COUNT(c.komentars_id) AS komentaru_skaits
            FROM ieraksts i
            LEFT JOIN komentars c ON c.ieraksts_id = i.ieraksts_id AND c.statuss = 'redzams'
            WHERE i.statuss = 'publicets'
            GROUP BY i.ieraksts_id
            ORDER BY komentaru_skaits DESC, i.izveidots DESC
            LIMIT 5
        `);

        const [audita_pedejie] = await db.query(`
            SELECT a.audita_id, a.darbiba, a.objekta_tips, a.objekta_id, a.detalas, a.izveidots, l.lietotajvards
            FROM audita_zurnals a
            LEFT JOIN lietotajs l ON l.lietotajs_id = a.lietotajs_id
            ORDER BY a.izveidots DESC
            LIMIT 10
        `);

        res.render('admin/parskats', {
            pageTitle: req.t('admin.title') + ' - ' + req.t('admin.overview'),
            skaiti: skaiti[0],
            pa_kategorijam,
            jaunakie_ieraksti,
            populaarakie,
            audita_pedejie,
        });
    } catch (err) {
        next(err);
    }
});

const LIETOTAJU_SORT = {
    id: 'l.lietotajs_id',
    lietotajvards: 'l.lietotajvards',
    epasts: 'l.epasts',
    loma: 'l.loma',
    statuss: 'l.statuss',
    registracijas_datums: 'l.registracijas_datums',
    ierakstu_skaits: 'ierakstu_skaits',
    komentaru_skaits: 'komentaru_skaits',
};

router.get('/lietotaji', async (req, res, next) => {
    try {
        const meklesana = (req.query.meklesana || '').trim();
        const params = [];
        let kur = '';
        if (meklesana) {
            kur = 'WHERE l.lietotajvards LIKE ? OR l.epasts LIKE ?';
            params.push(`%${meklesana}%`, `%${meklesana}%`);
        }
        const sortInfo = dabutSortInfo(req, LIETOTAJU_SORT, 'registracijas_datums', 'desc');
        const orderClause = orderBy(sortInfo, LIETOTAJU_SORT, 'l.lietotajs_id ASC');

        const [lietotaji] = await db.query(`
            SELECT l.lietotajs_id, l.lietotajvards, l.epasts, l.loma, l.statuss, l.registracijas_datums,
                   (SELECT COUNT(*) FROM ieraksts WHERE autora_id = l.lietotajs_id) AS ierakstu_skaits,
                   (SELECT COUNT(*) FROM komentars WHERE autora_id = l.lietotajs_id) AS komentaru_skaits
            FROM lietotajs l
            ${kur}
            ${orderClause}
            LIMIT 100
        `, params);

        res.render('admin/lietotaji', {
            pageTitle: req.t('admin.title') + ' - ' + req.t('admin.users'),
            lietotaji,
            meklesana,
            sortInfo,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/lietotaji/:id/statuss', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { statuss } = req.body;
        if (!Number.isInteger(id) || !['aktivs', 'blokets', 'neaktivs'].includes(statuss)) {
            req.flash('error', req.t('flash.invalid_action'));
            return res.redirect('/admin/lietotaji');
        }
        if (id === req.session.lietotajs.lietotajs_id) {
            req.flash('error', req.t('flash.user_not_self_status'));
            return res.redirect('/admin/lietotaji');
        }
        await db.query('UPDATE lietotajs SET statuss = ? WHERE lietotajs_id = ?', [statuss, id]);
        await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'mainit_statusu', 'lietotajs', id, `statuss=${statuss}`);
        req.flash('success', req.t('flash.user_status_updated'));
        res.redirect('/admin/lietotaji');
    } catch (err) {
        next(err);
    }
});

router.post('/lietotaji/:id/loma', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { loma } = req.body;
        if (!Number.isInteger(id) || !['lietotajs', 'administrators'].includes(loma)) {
            req.flash('error', req.t('flash.invalid_action'));
            return res.redirect('/admin/lietotaji');
        }
        if (id === req.session.lietotajs.lietotajs_id && loma !== 'administrators') {
            req.flash('error', req.t('flash.user_not_self_admin'));
            return res.redirect('/admin/lietotaji');
        }
        await db.query('UPDATE lietotajs SET loma = ? WHERE lietotajs_id = ?', [loma, id]);
        await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'mainit_lomu', 'lietotajs', id, `loma=${loma}`);
        req.flash('success', req.t('flash.user_role_updated'));
        res.redirect('/admin/lietotaji');
    } catch (err) {
        next(err);
    }
});

const IERAKSTU_SORT = {
    id: 'i.ieraksts_id',
    virsraksts: 'i.virsraksts',
    autors: 'l.lietotajvards',
    kategorija: 'k.nosaukums',
    statuss: 'i.statuss',
    izveidots: 'i.izveidots',
};

const KOMENTARU_SORT = {
    id: 'c.komentars_id',
    teksts: 'c.teksts',
    autors: 'l.lietotajvards',
    ieraksts: 'i.virsraksts',
    statuss: 'c.statuss',
    izveidots: 'c.izveidots',
};

router.get('/saturs', async (req, res, next) => {
    try {
        const veids = req.query.veids === 'komentari' ? 'komentari' : 'ieraksti';
        let ieraksti = [];
        let komentari = [];
        let sortInfo;

        if (veids === 'ieraksti') {
            sortInfo = dabutSortInfo(req, IERAKSTU_SORT, 'izveidots', 'desc');
            const orderClause = orderBy(sortInfo, IERAKSTU_SORT, 'i.ieraksts_id ASC');
            const [rez] = await db.query(`
                SELECT i.ieraksts_id, i.virsraksts, i.statuss, i.izveidots,
                       l.lietotajvards, l.lietotajs_id, k.nosaukums AS kategorijas_nosaukums
                FROM ieraksts i
                JOIN lietotajs l ON l.lietotajs_id = i.autora_id
                JOIN kategorija k ON k.kategorija_id = i.kategorija_id
                ${orderClause}
                LIMIT 100
            `);
            ieraksti = rez;
        } else {
            sortInfo = dabutSortInfo(req, KOMENTARU_SORT, 'izveidots', 'desc');
            const orderClause = orderBy(sortInfo, KOMENTARU_SORT, 'c.komentars_id ASC');
            const [rez] = await db.query(`
                SELECT c.komentars_id, c.teksts, c.statuss, c.izveidots, c.ieraksts_id,
                       l.lietotajvards, l.lietotajs_id, i.virsraksts AS ieraksta_virsraksts
                FROM komentars c
                JOIN lietotajs l ON l.lietotajs_id = c.autora_id
                JOIN ieraksts i ON i.ieraksts_id = c.ieraksts_id
                ${orderClause}
                LIMIT 100
            `);
            komentari = rez;
        }

        res.render('admin/saturs', {
            pageTitle: req.t('admin.title') + ' - ' + req.t('admin.content'),
            veids,
            ieraksti,
            komentari,
            sortInfo,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/ieraksti/:id/statuss', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { statuss } = req.body;
        if (!Number.isInteger(id) || !['publicets', 'melnraksts', 'slegts'].includes(statuss)) {
            req.flash('error', req.t('flash.invalid_action'));
            return res.redirect('/admin/saturs');
        }
        await db.query('UPDATE ieraksts SET statuss = ? WHERE ieraksts_id = ?', [statuss, id]);
        await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'mainit_ieraksta_statusu', 'ieraksts', id, `statuss=${statuss}`);
        req.flash('success', req.t('flash.post_status_updated'));
        res.redirect('/admin/saturs?veids=ieraksti');
    } catch (err) {
        next(err);
    }
});

router.post('/ieraksti/:id/dzest', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/admin/saturs');
        await db.query('DELETE FROM ieraksts WHERE ieraksts_id = ?', [id]);
        await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'dzest_ierakstu', 'ieraksts', id, null);
        req.flash('success', req.t('flash.post_deleted'));
        res.redirect('/admin/saturs?veids=ieraksti');
    } catch (err) {
        next(err);
    }
});

router.post('/komentari/:id/statuss', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { statuss } = req.body;
        if (!Number.isInteger(id) || !['redzams', 'paslepts'].includes(statuss)) {
            req.flash('error', req.t('flash.invalid_action'));
            return res.redirect('/admin/saturs?veids=komentari');
        }
        await db.query('UPDATE komentars SET statuss = ? WHERE komentars_id = ?', [statuss, id]);
        await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'mainit_komentara_statusu', 'komentars', id, `statuss=${statuss}`);
        req.flash('success', req.t('flash.comment_status_updated'));
        res.redirect('/admin/saturs?veids=komentari');
    } catch (err) {
        next(err);
    }
});

router.post('/komentari/:id/dzest', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/admin/saturs?veids=komentari');
        await db.query('DELETE FROM komentars WHERE komentars_id = ?', [id]);
        await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'dzest_komentaru', 'komentars', id, null);
        req.flash('success', req.t('flash.comment_deleted'));
        res.redirect('/admin/saturs?veids=komentari');
    } catch (err) {
        next(err);
    }
});

const AUDITA_SORT = {
    id: 'a.audita_id',
    izveidots: 'a.izveidots',
    lietotajvards: 'l.lietotajvards',
    darbiba: 'a.darbiba',
};

router.get('/audita-zurnals', async (req, res, next) => {
    try {
        const filtrs = (req.query.darbiba || '').trim();
        const params = [];
        let kur = '';
        if (filtrs) {
            kur = 'WHERE a.darbiba = ?';
            params.push(filtrs);
        }
        const sortInfo = dabutSortInfo(req, AUDITA_SORT, 'izveidots', 'desc');
        const orderClause = orderBy(sortInfo, AUDITA_SORT, 'a.audita_id ASC');

        const [ieraksti] = await db.query(`
            SELECT a.audita_id, a.darbiba, a.objekta_tips, a.objekta_id, a.detalas, a.izveidots,
                   l.lietotajs_id, l.lietotajvards
            FROM audita_zurnals a
            LEFT JOIN lietotajs l ON l.lietotajs_id = a.lietotajs_id
            ${kur}
            ${orderClause}
            LIMIT 200
        `, params);

        const [darbibas] = await db.query('SELECT DISTINCT darbiba FROM audita_zurnals ORDER BY darbiba ASC');

        res.render('admin/audita-zurnals', {
            pageTitle: req.t('admin.title') + ' - ' + req.t('admin.audit'),
            ieraksti,
            darbibas: darbibas.map(d => d.darbiba),
            filtrs,
            sortInfo,
        });
    } catch (err) {
        next(err);
    }
});

router.get('/kategorijas', async (req, res, next) => {
    try {
        const { kategorijas } = await iegutKategorijas(req);
        res.render('admin/kategorijas', {
            pageTitle: req.t('admin.title') + ' - ' + req.t('admin.categories'),
            kategorijas,
            forma: { nosaukums: '', apraksts: '', secibas_nr: 0 },
            kludas: {},
            redigetId: null,
            sortInfo: dabutKategorijuSortInfo(req),
        });
    } catch (err) {
        next(err);
    }
});

router.get('/kategorijas/:id/rediget', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/admin/kategorijas');
        const { kategorijas } = await iegutKategorijas(req);
        const merka = kategorijas.find(k => k.kategorija_id === id);
        if (!merka) {
            req.flash('error', req.t('flash.category_not_found'));
            return res.redirect('/admin/kategorijas');
        }
        res.render('admin/kategorijas', {
            pageTitle: req.t('admin.title') + ' - ' + req.t('admin.categories'),
            kategorijas,
            forma: { nosaukums: merka.nosaukums, apraksts: merka.apraksts || '', secibas_nr: merka.secibas_nr, aktiva: merka.aktiva },
            kludas: {},
            redigetId: id,
            sortInfo: dabutKategorijuSortInfo(req),
        });
    } catch (err) {
        next(err);
    }
});

router.post('/kategorijas', async (req, res, next) => {
    try {
        const { nosaukums = '', apraksts = '', secibas_nr = 0 } = req.body;
        const kludas = validetKategoriju({ nosaukums, secibas_nr });

        if (Object.keys(kludas).length === 0) {
            try {
                await db.query(
                    'INSERT INTO kategorija (nosaukums, apraksts, secibas_nr, aktiva) VALUES (?, ?, ?, TRUE)',
                    [nosaukums.trim(), apraksts.trim() || null, Number(secibas_nr) || 0]
                );
                await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'izveidota_kategorija', 'kategorija', null, nosaukums.trim());
                req.flash('success', req.t('flash.category_added'));
                return res.redirect('/admin/kategorijas');
            } catch (kluda) {
                if (kluda && kluda.code === 'ER_DUP_ENTRY') {
                    kludas.nosaukums = 'validation.category_name_taken';
                } else {
                    throw kluda;
                }
            }
        }

        const { kategorijas } = await iegutKategorijas(req);
        res.status(400).render('admin/kategorijas', {
            pageTitle: req.t('admin.title') + ' - ' + req.t('admin.categories'),
            kategorijas,
            forma: { nosaukums, apraksts, secibas_nr },
            kludas,
            redigetId: null,
            sortInfo: dabutKategorijuSortInfo(req),
        });
    } catch (err) {
        next(err);
    }
});

router.post('/kategorijas/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/admin/kategorijas');
        const { nosaukums = '', apraksts = '', secibas_nr = 0, aktiva } = req.body;
        const kludas = validetKategoriju({ nosaukums, secibas_nr });

        if (Object.keys(kludas).length === 0) {
            try {
                await db.query(
                    'UPDATE kategorija SET nosaukums = ?, apraksts = ?, secibas_nr = ?, aktiva = ? WHERE kategorija_id = ?',
                    [nosaukums.trim(), apraksts.trim() || null, Number(secibas_nr) || 0, aktiva ? 1 : 0, id]
                );
                await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'rediget_kategorija', 'kategorija', id, nosaukums.trim());
                req.flash('success', req.t('flash.category_updated'));
                return res.redirect('/admin/kategorijas');
            } catch (kluda) {
                if (kluda && kluda.code === 'ER_DUP_ENTRY') {
                    kludas.nosaukums = 'validation.category_name_taken';
                } else {
                    throw kluda;
                }
            }
        }

        const { kategorijas } = await iegutKategorijas(req);
        res.status(400).render('admin/kategorijas', {
            pageTitle: req.t('admin.title') + ' - ' + req.t('admin.categories'),
            kategorijas,
            forma: { nosaukums, apraksts, secibas_nr, aktiva: !!aktiva },
            kludas,
            redigetId: id,
            sortInfo: dabutKategorijuSortInfo(req),
        });
    } catch (err) {
        next(err);
    }
});

router.post('/kategorijas/:id/dzest', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/admin/kategorijas');
        try {
            await db.query('DELETE FROM kategorija WHERE kategorija_id = ?', [id]);
            await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'dzest_kategorija', 'kategorija', id, null);
            req.flash('success', req.t('flash.category_deleted'));
        } catch (kluda) {
            if (kluda && kluda.code === 'ER_ROW_IS_REFERENCED_2') {
                req.flash('error', req.t('flash.category_in_use'));
            } else {
                throw kluda;
            }
        }
        res.redirect('/admin/kategorijas');
    } catch (err) {
        next(err);
    }
});

const AI_SORT = {
    id: 'a.ai_pieprasijums_id',
    izveidots: 'a.izveidots',
    lietotajvards: 'l.lietotajvards',
    darbiba: 'a.darbiba',
    ievades_garums: 'a.ievades_garums',
    izvades_garums: 'a.izvades_garums',
    avots: 'a.avots',
};

router.get('/ai-zurnals', async (req, res, next) => {
    try {
        const filtrsLietotajs = (req.query.lietotajs || '').trim();
        const filtrsAvots = ['claude', 'lokala', 'kluda', 'limits'].includes(req.query.avots) ? req.query.avots : '';
        const filtrsDarbiba = ['uzlabot', 'virsraksts'].includes(req.query.darbiba) ? req.query.darbiba : '';

        const nosacijumi = [];
        const params = [];
        if (filtrsLietotajs) {
            nosacijumi.push('l.lietotajvards LIKE ?');
            params.push(`%${filtrsLietotajs}%`);
        }
        if (filtrsAvots) {
            nosacijumi.push('a.avots = ?');
            params.push(filtrsAvots);
        }
        if (filtrsDarbiba) {
            nosacijumi.push('a.darbiba = ?');
            params.push(filtrsDarbiba);
        }
        const kur = nosacijumi.length ? 'WHERE ' + nosacijumi.join(' AND ') : '';
        const sortInfo = dabutSortInfo(req, AI_SORT, 'izveidots', 'desc');
        const orderClause = orderBy(sortInfo, AI_SORT, 'a.ai_pieprasijums_id ASC');

        const [zurnals] = await db.query(`
            SELECT a.ai_pieprasijums_id, a.darbiba, a.ievade_fragments, a.ievades_garums,
                   a.izvades_garums, a.avots, a.ip, a.izveidots,
                   l.lietotajs_id, l.lietotajvards
            FROM ai_pieprasijums a
            LEFT JOIN lietotajs l ON l.lietotajs_id = a.lietotajs_id
            ${kur}
            ${orderClause}
            LIMIT 200
        `, params);

        const [statistika] = await db.query(`
            SELECT
                COUNT(*) AS kopa,
                SUM(CASE WHEN avots = 'claude' THEN 1 ELSE 0 END) AS ar_claude,
                SUM(CASE WHEN avots = 'lokala' THEN 1 ELSE 0 END) AS ar_lokala,
                SUM(CASE WHEN avots = 'limits' THEN 1 ELSE 0 END) AS bloketi,
                SUM(ievades_garums) AS ievades_simboli,
                COALESCE(SUM(izvades_garums), 0) AS izvades_simboli,
                SUM(CASE WHEN izveidots >= NOW() - INTERVAL 1 DAY THEN 1 ELSE 0 END) AS pedeja_diena,
                SUM(CASE WHEN izveidots >= NOW() - INTERVAL 1 HOUR THEN 1 ELSE 0 END) AS pedeja_stunda
            FROM ai_pieprasijums
        `);

        const [topLietotaji] = await db.query(`
            SELECT l.lietotajs_id, l.lietotajvards, COUNT(*) AS pieprasijumi
            FROM ai_pieprasijums a
            JOIN lietotajs l ON l.lietotajs_id = a.lietotajs_id
            WHERE a.izveidots >= NOW() - INTERVAL 7 DAY
            GROUP BY l.lietotajs_id
            ORDER BY pieprasijumi DESC
            LIMIT 10
        `);

        res.render('admin/ai-zurnals', {
            pageTitle: req.t('admin.title') + ' - ' + req.t('admin_ai.title'),
            zurnals,
            statistika: statistika[0],
            topLietotaji,
            filtrs: { lietotajs: filtrsLietotajs, avots: filtrsAvots, darbiba: filtrsDarbiba },
            sortInfo,
        });
    } catch (err) {
        next(err);
    }
});

const ATBALSTA_SORT = {
    id: 'a.atbalsts_id',
    nosutitaja_vards: 'a.nosutitaja_vards',
    nosutitaja_epasts: 'a.nosutitaja_epasts',
    tema: 'a.tema',
    statuss: 'a.statuss',
    izveidots: 'a.izveidots',
};

router.get('/atbalsts', async (req, res, next) => {
    try {
        const filtrs = ['jauns', 'atbildets', 'aizverts'].includes(req.query.statuss) ? req.query.statuss : '';
        const params = [];
        let kur = '';
        if (filtrs) {
            kur = 'WHERE a.statuss = ?';
            params.push(filtrs);
        }
        const sortInfo = dabutSortInfo(req, ATBALSTA_SORT, 'izveidots', 'desc');
        const orderClause = orderBy(sortInfo, ATBALSTA_SORT, 'a.atbalsts_id ASC');

        const [pieprasijumi] = await db.query(`
            SELECT a.atbalsts_id, a.nosutitaja_vards, a.nosutitaja_epasts, a.tema, a.statuss, a.izveidots,
                   a.lietotajs_id, l.lietotajvards
            FROM atbalsta_zinojums a
            LEFT JOIN lietotajs l ON l.lietotajs_id = a.lietotajs_id
            ${kur}
            ${orderClause}
            LIMIT 200
        `, params);

        res.render('admin/atbalsts', {
            pageTitle: req.t('admin.title') + ' - ' + req.t('admin_atbalsts.title'),
            pieprasijumi,
            filtrs,
            sortInfo,
        });
    } catch (err) {
        next(err);
    }
});

router.get('/atbalsts/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/admin/atbalsts');
        const [rindas] = await db.query(`
            SELECT a.*, l.lietotajvards, atbildejis.lietotajvards AS atbildejusais
            FROM atbalsta_zinojums a
            LEFT JOIN lietotajs l ON l.lietotajs_id = a.lietotajs_id
            LEFT JOIN lietotajs atbildejis ON atbildejis.lietotajs_id = a.atbildejis_lietotajs_id
            WHERE a.atbalsts_id = ?
        `, [id]);
        const pieprasijums = rindas[0];
        if (!pieprasijums) return res.redirect('/admin/atbalsts');
        res.render('admin/atbalsts-skats', {
            pageTitle: pieprasijums.tema,
            pieprasijums,
            kludas: {},
            forma: { atbilde: pieprasijums.atbilde || '' },
        });
    } catch (err) {
        next(err);
    }
});

router.post('/atbalsts/:id/atbilde', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/admin/atbalsts');
        const { atbilde = '' } = req.body;
        const tirsAtbilde = atbilde.trim();

        const [rindas] = await db.query('SELECT * FROM atbalsta_zinojums WHERE atbalsts_id = ?', [id]);
        const pieprasijums = rindas[0];
        if (!pieprasijums) return res.redirect('/admin/atbalsts');

        if (!tirsAtbilde || tirsAtbilde.length < 5 || tirsAtbilde.length > 5000) {
            return res.status(400).render('admin/atbalsts-skats', {
                pageTitle: pieprasijums.tema,
                pieprasijums: { ...pieprasijums, atbildejusais: req.session.lietotajs.lietotajvards },
                kludas: { atbilde: 'admin_atbalsts.reply_required' },
                forma: { atbilde },
            });
        }

        await db.query(
            `UPDATE atbalsta_zinojums
             SET atbilde = ?, atbildejis_lietotajs_id = ?, statuss = 'atbildets', atbildets = NOW()
             WHERE atbalsts_id = ?`,
            [tirsAtbilde, req.session.lietotajs.lietotajs_id, id]
        );

        try {
            await sutitEpastu({
                to: pieprasijums.nosutitaja_epasts,
                subject: req.t('epasts.support_reply_subject', { subject: pieprasijums.tema }),
                text: [
                    req.t('epasts.support_reply_intro'),
                    '',
                    tirsAtbilde,
                    '',
                    '---',
                    `${req.t('atbalsts.your_message')}:`,
                    pieprasijums.zinojums,
                ].join('\n'),
            });
        } catch (kluda) {
            console.error('Atbalsta atbildes epasta kluda:', kluda);
        }

        if (pieprasijums.lietotajs_id) {
            try {
                const pazTeksts = JSON.stringify({
                    key: 'pazinojumi_atbalsts.replied',
                    params: { subject: pieprasijums.tema },
                });
                await db.query(
                    `INSERT INTO pazinojums (sanemeja_id, tips, teksts, avota_tips, avota_id)
                     VALUES (?, 'sistemas', ?, 'atbalsts', ?)`,
                    [pieprasijums.lietotajs_id, pazTeksts, id]
                );
            } catch (kluda) {
                console.error('Atbalsta atbildes pazinojuma kluda:', kluda);
            }
        }

        await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'atbalsts_atbilde', 'atbalsts', id, null);
        req.flash('success', req.t('atbalsts.success'));
        res.redirect('/admin/atbalsts');
    } catch (err) {
        next(err);
    }
});

router.post('/atbalsts/:id/aizvert', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/admin/atbalsts');
        await db.query(`UPDATE atbalsta_zinojums SET statuss = 'aizverts' WHERE atbalsts_id = ?`, [id]);
        await pierakstitAuditu(req.session.lietotajs.lietotajs_id, 'atbalsts_aizvert', 'atbalsts', id, null);
        res.redirect('/admin/atbalsts');
    } catch (err) {
        next(err);
    }
});

const KATEGORIJU_SORT = {
    id: 'k.kategorija_id',
    nosaukums: 'k.nosaukums',
    apraksts: 'k.apraksts',
    secibas_nr: 'k.secibas_nr',
    aktiva: 'k.aktiva',
    ierakstu_skaits: 'ierakstu_skaits',
};

async function iegutKategorijas(req) {
    const sortInfo = dabutSortInfo(req, KATEGORIJU_SORT, 'secibas_nr', 'asc');
    const sekundara = sortInfo.sort === 'nosaukums' ? 'k.kategorija_id ASC' : 'k.nosaukums ASC';
    const orderClause = orderBy(sortInfo, KATEGORIJU_SORT, sekundara);
    const [kategorijas] = await db.query(`
        SELECT k.kategorija_id, k.nosaukums, k.apraksts, k.secibas_nr, k.aktiva,
               COUNT(i.ieraksts_id) AS ierakstu_skaits
        FROM kategorija k
        LEFT JOIN ieraksts i ON i.kategorija_id = k.kategorija_id
        GROUP BY k.kategorija_id
        ${orderClause}
    `);
    return { kategorijas };
}

function dabutKategorijuSortInfo(req) {
    return dabutSortInfo(req, KATEGORIJU_SORT, 'secibas_nr', 'asc');
}

async function pierakstitAuditu(lietotajsId, darbiba, objektaTips, objektaId, detalas) {
    try {
        await db.query(
            'INSERT INTO audita_zurnals (lietotajs_id, darbiba, objekta_tips, objekta_id, detalas) VALUES (?, ?, ?, ?, ?)',
            [lietotajsId, darbiba, objektaTips, objektaId, detalas]
        );
    } catch (kluda) {
        console.error('Audita pieraksta kļūda:', kluda);
    }
}

module.exports = router;
