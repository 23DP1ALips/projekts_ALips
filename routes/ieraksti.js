const express = require('express');
const db = require('../config/db');
const { pieprasitAutorizaciju } = require('../middleware/auth');
const { validetIerakstu, validetKomentaru } = require('../utils/validacija');

const router = express.Router();

const ATLAUTI_LAPAS_LIELUMI = [10, 20, 50];
const KARTOSANAS_VARIANTI = {
    jaunakie: 'i.izveidots DESC',
    vecakie: 'i.izveidots ASC',
    populaarakie: 'komentaru_skaits DESC, i.izveidots DESC',
    visvairak_balsoti: 'balsu_skaits DESC, i.izveidots DESC',
    alfabetiski: 'i.virsraksts ASC',
};

function veidotKomentaruKoku(rindas) {
    const karte = new Map();
    rindas.forEach((k) => {
        k.atbildes = [];
        karte.set(k.komentars_id, k);
    });
    const koks = [];
    rindas.forEach((k) => {
        if (k.vecaks_komentars_id && karte.has(k.vecaks_komentars_id)) {
            karte.get(k.vecaks_komentars_id).atbildes.push(k);
        } else {
            koks.push(k);
        }
    });
    return koks;
}

router.get('/', async (req, res, next) => {
    try {
        const meklesana = (req.query.meklesana || '').trim();
        const kategorijaId = Number(req.query.kategorija) || null;
        const noklusejumaKart = res.locals.iestatijumi && res.locals.iestatijumi.kartosana ? res.locals.iestatijumi.kartosana : 'jaunakie';
        const kartosana = KARTOSANAS_VARIANTI[req.query.kartosana] ? req.query.kartosana : noklusejumaKart;
        const noklusejumaLielums = res.locals.iestatijumi && res.locals.iestatijumi.lapas_lielums ? res.locals.iestatijumi.lapas_lielums : 10;
        const LAPAS_LIELUMS = ATLAUTI_LAPAS_LIELUMI.includes(noklusejumaLielums) ? noklusejumaLielums : 10;
        const lapa = Math.max(1, Number(req.query.lapa) || 1);
        const nobide = (lapa - 1) * LAPAS_LIELUMS;

        const nosacijumi = ['i.statuss = ?'];
        const parametri = ['publicets'];

        if (meklesana) {
            nosacijumi.push('(i.virsraksts LIKE ? OR i.saturs LIKE ?)');
            parametri.push(`%${meklesana}%`, `%${meklesana}%`);
        }
        if (kategorijaId) {
            nosacijumi.push('i.kategorija_id = ?');
            parametri.push(kategorijaId);
        }
        const kur = nosacijumi.join(' AND ');

        const [skaitsRez] = await db.query(`SELECT COUNT(*) AS skaits FROM ieraksts i WHERE ${kur}`, parametri);
        const kopaSkaits = skaitsRez[0].skaits;
        const kopaLapas = Math.max(1, Math.ceil(kopaSkaits / LAPAS_LIELUMS));

        const [ieraksti] = await db.query(`
            SELECT i.ieraksts_id, i.virsraksts, i.saturs, i.izveidots, i.atjauninats,
                   l.lietotajvards AS autora_vards, l.lietotajs_id AS autora_id,
                   k.nosaukums AS kategorijas_nosaukums, k.kategorija_id,
                   (SELECT COUNT(*) FROM komentars c WHERE c.ieraksts_id = i.ieraksts_id AND c.statuss = 'redzams') AS komentaru_skaits,
                   (SELECT COUNT(*) FROM balsojums b WHERE b.ieraksts_id = i.ieraksts_id) AS balsu_skaits
            FROM ieraksts i
            JOIN lietotajs l ON l.lietotajs_id = i.autora_id
            JOIN kategorija k ON k.kategorija_id = i.kategorija_id
            WHERE ${kur}
            ORDER BY ${KARTOSANAS_VARIANTI[kartosana]}
            LIMIT ? OFFSET ?
        `, [...parametri, LAPAS_LIELUMS, nobide]);

        const [kategorijas] = await db.query(`
            SELECT kategorija_id, nosaukums FROM kategorija WHERE aktiva = TRUE ORDER BY secibas_nr ASC, nosaukums ASC
        `);

        res.render('ieraksti/saraksts', {
            pageTitle: req.t('ieraksti.page_title'),
            ieraksti,
            kategorijas,
            filtri: { meklesana, kategorijaId, kartosana },
            lapa,
            kopaLapas,
            kopaSkaits,
        });
    } catch (err) {
        next(err);
    }
});

router.get('/jauns', pieprasitAutorizaciju, async (req, res, next) => {
    try {
        const [kategorijas] = await db.query(
            'SELECT kategorija_id, nosaukums FROM kategorija WHERE aktiva = TRUE ORDER BY secibas_nr, nosaukums'
        );
        res.render('ieraksti/forma', {
            pageTitle: req.t('ieraksti.new_title'),
            kategorijas,
            forma: { virsraksts: '', saturs: '', kategorija_id: '' },
            kludas: {},
            redigetId: null,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/', pieprasitAutorizaciju, async (req, res, next) => {
    try {
        const { virsraksts = '', saturs = '', kategorija_id = '' } = req.body;
        const kludas = validetIerakstu({ virsraksts, saturs, kategorija_id });

        if (Object.keys(kludas).length) {
            const [kategorijas] = await db.query(
                'SELECT kategorija_id, nosaukums FROM kategorija WHERE aktiva = TRUE ORDER BY secibas_nr, nosaukums'
            );
            return res.status(400).render('ieraksti/forma', {
                pageTitle: req.t('ieraksti.new_title'),
                kategorijas,
                forma: { virsraksts, saturs, kategorija_id },
                kludas,
                redigetId: null,
            });
        }

        const [rez] = await db.query(
            'INSERT INTO ieraksts (autora_id, kategorija_id, virsraksts, saturs, statuss) VALUES (?, ?, ?, ?, ?)',
            [req.session.lietotajs.lietotajs_id, Number(kategorija_id), virsraksts.trim(), saturs.trim(), 'publicets']
        );
        req.flash('success', req.t('flash.post_published'));
        res.redirect('/ieraksti/' + rez.insertId);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(404).render('error', { pageTitle: req.t('error.404_title'), kods: 404, zinojums: req.t('error.post_not_found') });

        const [ieraksti] = await db.query(`
            SELECT i.ieraksts_id, i.virsraksts, i.saturs, i.statuss, i.izveidots, i.atjauninats,
                   l.lietotajvards AS autora_vards, l.lietotajs_id AS autora_id,
                   k.nosaukums AS kategorijas_nosaukums, k.kategorija_id,
                   (SELECT COUNT(*) FROM balsojums b WHERE b.ieraksts_id = i.ieraksts_id) AS balsu_skaits
            FROM ieraksts i
            JOIN lietotajs l ON l.lietotajs_id = i.autora_id
            JOIN kategorija k ON k.kategorija_id = i.kategorija_id
            WHERE i.ieraksts_id = ?
        `, [id]);

        const ieraksts = ieraksti[0];
        if (!ieraksts) return res.status(404).render('error', { pageTitle: req.t('error.404_title'), kods: 404, zinojums: req.t('error.post_not_found') });

        const lietotajs = req.session.lietotajs;
        const irAdmins = lietotajs && lietotajs.loma === 'administrators';
        if (ieraksts.statuss !== 'publicets' && !(lietotajs && (lietotajs.lietotajs_id === ieraksts.autora_id || irAdmins))) {
            return res.status(403).render('error', { pageTitle: req.t('error.403_title'), kods: 403, zinojums: req.t('error.no_permission_post') });
        }

        const [komentariFlat] = await db.query(`
            SELECT c.komentars_id, c.teksts, c.statuss, c.izveidots, c.autora_id, c.vecaks_komentars_id,
                   l.lietotajvards AS autora_vards
            FROM komentars c
            JOIN lietotajs l ON l.lietotajs_id = c.autora_id
            WHERE c.ieraksts_id = ?
            ORDER BY c.izveidots ASC
        `, [id]);
        const komentari = veidotKomentaruKoku(komentariFlat);

        let lietotaja_balsoja = false;
        if (lietotajs) {
            const [bal] = await db.query(
                'SELECT 1 FROM balsojums WHERE ieraksts_id = ? AND lietotajs_id = ? LIMIT 1',
                [id, lietotajs.lietotajs_id]
            );
            lietotaja_balsoja = bal.length > 0;
        }

        res.render('ieraksti/skats', {
            pageTitle: ieraksts.virsraksts,
            ieraksts,
            komentari,
            komentaruKopskaits: komentariFlat.length,
            lietotaja_balsoja,
            varRedigēt: !!(lietotajs && (lietotajs.lietotajs_id === ieraksts.autora_id || irAdmins)),
            irAdmins,
            komentaraForma: { teksts: '', vecaks_komentars_id: '' },
            komentaraKludas: {},
        });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/rediget', pieprasitAutorizaciju, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const [rindas] = await db.query('SELECT * FROM ieraksts WHERE ieraksts_id = ?', [id]);
        const ieraksts = rindas[0];
        if (!ieraksts) return res.status(404).render('error', { pageTitle: req.t('error.404_title'), kods: 404, zinojums: req.t('error.post_not_found') });

        const lietotajs = req.session.lietotajs;
        const irAdmins = lietotajs.loma === 'administrators';
        if (lietotajs.lietotajs_id !== ieraksts.autora_id && !irAdmins) {
            return res.status(403).render('error', { pageTitle: req.t('error.403_title'), kods: 403, zinojums: req.t('error.no_permission_edit_post') });
        }

        const [kategorijas] = await db.query(
            'SELECT kategorija_id, nosaukums FROM kategorija WHERE aktiva = TRUE ORDER BY secibas_nr, nosaukums'
        );
        res.render('ieraksti/forma', {
            pageTitle: req.t('ieraksti.edit_title'),
            kategorijas,
            forma: { virsraksts: ieraksts.virsraksts, saturs: ieraksts.saturs, kategorija_id: ieraksts.kategorija_id, statuss: ieraksts.statuss },
            kludas: {},
            redigetId: id,
            irAdmins,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/:id', pieprasitAutorizaciju, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const [rindas] = await db.query('SELECT * FROM ieraksts WHERE ieraksts_id = ?', [id]);
        const ieraksts = rindas[0];
        if (!ieraksts) return res.status(404).render('error', { pageTitle: req.t('error.404_title'), kods: 404, zinojums: req.t('error.post_not_found') });

        const lietotajs = req.session.lietotajs;
        const irAdmins = lietotajs.loma === 'administrators';
        if (lietotajs.lietotajs_id !== ieraksts.autora_id && !irAdmins) {
            return res.status(403).render('error', { pageTitle: req.t('error.403_title'), kods: 403, zinojums: req.t('error.no_permission_edit') });
        }

        const { virsraksts = '', saturs = '', kategorija_id = '', statuss } = req.body;
        const kludas = validetIerakstu({ virsraksts, saturs, kategorija_id });

        if (Object.keys(kludas).length) {
            const [kategorijas] = await db.query(
                'SELECT kategorija_id, nosaukums FROM kategorija WHERE aktiva = TRUE ORDER BY secibas_nr, nosaukums'
            );
            return res.status(400).render('ieraksti/forma', {
                pageTitle: req.t('ieraksti.edit_title'),
                kategorijas,
                forma: { virsraksts, saturs, kategorija_id, statuss },
                kludas,
                redigetId: id,
                irAdmins,
            });
        }

        const derigsStatuss = ['melnraksts', 'publicets', 'slegts'].includes(statuss) ? statuss : ieraksts.statuss;

        await db.query(
            'UPDATE ieraksts SET virsraksts = ?, saturs = ?, kategorija_id = ?, statuss = ? WHERE ieraksts_id = ?',
            [virsraksts.trim(), saturs.trim(), Number(kategorija_id), derigsStatuss, id]
        );
        req.flash('success', req.t('flash.post_updated'));
        res.redirect('/ieraksti/' + id);
    } catch (err) {
        next(err);
    }
});

router.post('/:id/komentari', pieprasitAutorizaciju, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const [rindas] = await db.query('SELECT ieraksts_id, autora_id, statuss FROM ieraksts WHERE ieraksts_id = ?', [id]);
        const ieraksts = rindas[0];
        if (!ieraksts) return res.status(404).render('error', { pageTitle: req.t('error.404_title'), kods: 404, zinojums: req.t('error.post_not_found') });
        if (ieraksts.statuss === 'slegts') {
            req.flash('error', req.t('flash.post_closed'));
            return res.redirect('/ieraksti/' + id);
        }

        const { teksts = '', vecaks_komentars_id = '' } = req.body;
        const kludas = validetKomentaru({ teksts });

        let vecaksId = null;
        let vecaksAutorsId = null;
        if (vecaks_komentars_id) {
            const vid = Number(vecaks_komentars_id);
            if (Number.isInteger(vid)) {
                const [vrindas] = await db.query(
                    'SELECT komentars_id, ieraksts_id, autora_id FROM komentars WHERE komentars_id = ?',
                    [vid]
                );
                if (vrindas[0] && vrindas[0].ieraksts_id === id) {
                    vecaksId = vid;
                    vecaksAutorsId = vrindas[0].autora_id;
                }
            }
        }

        if (Object.keys(kludas).length) {
            return res.redirect('/ieraksti/' + id + '#komentari');
        }

        await db.query(
            'INSERT INTO komentars (ieraksts_id, autora_id, vecaks_komentars_id, teksts) VALUES (?, ?, ?, ?)',
            [id, req.session.lietotajs.lietotajs_id, vecaksId, teksts.trim()]
        );

        const sutitajaId = req.session.lietotajs.lietotajs_id;
        const sutitajaVards = req.session.lietotajs.lietotajvards;

        try {
            if (vecaksId && vecaksAutorsId && vecaksAutorsId !== sutitajaId) {
                const pazTeksts = JSON.stringify({
                    key: 'pazinojumi.new_comment_on_post',
                    params: { user: sutitajaVards },
                });
                await db.query(
                    `INSERT INTO pazinojums (sanemeja_id, tips, teksts, avota_tips, avota_id)
                     VALUES (?, 'komentars', ?, 'ieraksts', ?)`,
                    [vecaksAutorsId, pazTeksts, id]
                );
            } else if (!vecaksId && ieraksts.autora_id !== sutitajaId) {
                const pazTeksts = JSON.stringify({
                    key: 'pazinojumi.new_comment_on_post',
                    params: { user: sutitajaVards },
                });
                await db.query(
                    `INSERT INTO pazinojums (sanemeja_id, tips, teksts, avota_tips, avota_id)
                     VALUES (?, 'komentars', ?, 'ieraksts', ?)`,
                    [ieraksts.autora_id, pazTeksts, id]
                );
            }
        } catch (kluda) {
            console.error('Paziņojuma izveides kļūda:', kluda);
        }

        req.flash('success', req.t('flash.comment_added'));
        res.redirect('/ieraksti/' + id + '#komentari');
    } catch (err) {
        next(err);
    }
});

router.post('/:id/balsot', pieprasitAutorizaciju, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.redirect('/ieraksti');

        const [rindas] = await db.query(
            'SELECT ieraksts_id, autora_id, statuss FROM ieraksts WHERE ieraksts_id = ?',
            [id]
        );
        const ieraksts = rindas[0];
        if (!ieraksts || ieraksts.statuss !== 'publicets') return res.redirect('/ieraksti');

        const lietotajsId = req.session.lietotajs.lietotajs_id;
        if (ieraksts.autora_id === lietotajsId) {
            req.flash('error', req.t('balsojums.self_vote'));
            return res.redirect('/ieraksti/' + id);
        }

        const [esosie] = await db.query(
            'SELECT balsojums_id FROM balsojums WHERE ieraksts_id = ? AND lietotajs_id = ? LIMIT 1',
            [id, lietotajsId]
        );
        if (esosie.length) {
            await db.query('DELETE FROM balsojums WHERE balsojums_id = ?', [esosie[0].balsojums_id]);
        } else {
            await db.query(
                'INSERT INTO balsojums (ieraksts_id, lietotajs_id) VALUES (?, ?)',
                [id, lietotajsId]
            );
        }

        const atpakal = req.get('referrer');
        if (atpakal && atpakal.includes('/ieraksti') && !atpakal.includes('/balsot')) {
            return res.redirect(atpakal);
        }
        res.redirect('/ieraksti/' + id);
    } catch (err) {
        next(err);
    }
});

router.post('/:id/dzest', pieprasitAutorizaciju, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const [rindas] = await db.query('SELECT * FROM ieraksts WHERE ieraksts_id = ?', [id]);
        const ieraksts = rindas[0];
        if (!ieraksts) return res.redirect('/ieraksti');

        const lietotajs = req.session.lietotajs;
        const irAdmins = lietotajs.loma === 'administrators';
        if (lietotajs.lietotajs_id !== ieraksts.autora_id && !irAdmins) {
            return res.status(403).render('error', { pageTitle: req.t('error.403_title'), kods: 403, zinojums: req.t('error.no_permission_delete') });
        }

        await db.query('DELETE FROM ieraksts WHERE ieraksts_id = ?', [id]);
        req.flash('success', req.t('flash.post_deleted'));
        res.redirect('/ieraksti');
    } catch (err) {
        next(err);
    }
});

module.exports = router;
