const express = require('express');
const db = require('../config/db');
const { pieprasitAutorizaciju } = require('../middleware/auth');
const { patereetCheck, dabutIp } = require('../utils/rateLimiter');

const router = express.Router();

router.use(pieprasitAutorizaciju);
router.use(express.json({ limit: '64kb' }));

const AI_LIMITI = (lietotajsId) => ([
    { key: `ai:user:${lietotajsId}:min`, max: 10, windowMs: 60 * 1000 },
    { key: `ai:user:${lietotajsId}:dien`, max: 80, windowMs: 24 * 60 * 60 * 1000 },
]);

router.post('/uzlabot', async (req, res) => {
    const teksts = (req.body && req.body.teksts || '').trim();
    if (!teksts || teksts.length < 5) {
        return res.status(400).json({ kluda: req.t('validation.ai_text_too_short') });
    }
    if (teksts.length > 4000) {
        return res.status(400).json({ kluda: req.t('validation.ai_text_too_long') });
    }

    const limits = patereetCheck(AI_LIMITI(req.session.lietotajs.lietotajs_id));
    if (!limits.ok) {
        await pierakstit(req, 'uzlabot', teksts, null, 'limits');
        return res.status(429)
            .set('Retry-After', String(limits.retryAfterSec))
            .json({ kluda: req.t('validation.rate_limit_ai', { seconds: limits.retryAfterSec }) });
    }

    try {
        const rezultats = await izsauktClaude(
            'You are a writing assistant for an online community forum. The user will send you a draft of a forum post. Return an improved version of that text in THE SAME LANGUAGE as the input (whether Latvian, English, Russian, or any other language - never translate). Fix grammar and punctuation, make the wording flow more naturally, but preserve the author\'s meaning, tone, and structure. Do NOT add greetings, explanations, disclaimers, or quotation marks. Return ONLY the improved text.',
            teksts
        );
        await pierakstit(req, 'uzlabot', teksts, rezultats, 'claude');
        res.json({ rezultats });
    } catch (kluda) {
        console.error('AI uzlabosanas kluda:', kluda.message);
        const fallback = vienkarsiUzlabot(teksts);
        await pierakstit(req, 'uzlabot', teksts, fallback, 'lokala');
        res.json({ rezultats: fallback, avots: 'lokala' });
    }
});

router.post('/virsraksts', async (req, res) => {
    const teksts = (req.body && req.body.teksts || '').trim();
    if (!teksts || teksts.length < 20) {
        return res.status(400).json({ kluda: req.t('validation.ai_title_too_short') });
    }
    if (teksts.length > 4000) {
        return res.status(400).json({ kluda: req.t('validation.ai_text_too_long') });
    }

    const limits = patereetCheck(AI_LIMITI(req.session.lietotajs.lietotajs_id));
    if (!limits.ok) {
        await pierakstit(req, 'virsraksts', teksts, null, 'limits');
        return res.status(429)
            .set('Retry-After', String(limits.retryAfterSec))
            .json({ kluda: req.t('validation.rate_limit_ai', { seconds: limits.retryAfterSec }) });
    }

    try {
        const rezultats = await izsauktClaude(
            'You are a title generator for an online community forum. The user will send you the body of a forum post. Suggest ONE short, clear, informative title in THE SAME LANGUAGE as the post (whether Latvian, English, Russian, or any other language - never translate). Maximum 100 characters. No quotation marks, no emoji, no preamble, no explanations. Return ONLY the title as a single line of plain text.',
            teksts
        );
        const tirs = rezultats.split('\n')[0].replace(/^["'„"]/, '').replace(/["'""]$/, '').trim().slice(0, 150);
        await pierakstit(req, 'virsraksts', teksts, tirs, 'claude');
        res.json({ rezultats: tirs });
    } catch (kluda) {
        console.error('AI virsraksta kluda:', kluda.message);
        const fallback = vienkarsiVirsraksts(teksts);
        await pierakstit(req, 'virsraksts', teksts, fallback, 'lokala');
        res.json({ rezultats: fallback, avots: 'lokala' });
    }
});

async function pierakstit(req, darbiba, ievade, izvade, avots) {
    try {
        await db.query(
            `INSERT INTO ai_pieprasijums (lietotajs_id, darbiba, ievade_fragments, ievades_garums, izvades_garums, avots, ip)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.session.lietotajs.lietotajs_id,
                darbiba,
                ievade ? ievade.slice(0, 500) : null,
                ievade ? ievade.length : 0,
                izvade ? izvade.length : null,
                avots,
                dabutIp(req),
            ]
        );
    } catch (kluda) {
        console.error('AI zurnala pieraksta kluda:', kluda.message);
    }
}

async function izsauktClaude(sistemasInstrukcija, lietotajaTeksts) {
    const atsleeg = process.env.ANTHROPIC_API_KEY;
    if (!atsleeg) {
        throw new Error('Anthropic API atslēga nav konfigurēta.');
    }

    const atbilde = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': atsleeg,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: sistemasInstrukcija,
            messages: [{ role: 'user', content: lietotajaTeksts }],
        }),
    });

    if (!atbilde.ok) {
        const tekstaKluda = await atbilde.text().catch(() => '');
        throw new Error(`Claude API kļūda ${atbilde.status}: ${tekstaKluda.slice(0, 200)}`);
    }

    const dati = await atbilde.json();
    const sat = (dati.content || []).find(b => b.type === 'text');
    if (!sat) throw new Error('Claude atbilde tukša.');
    return sat.text.trim();
}

function vienkarsiUzlabot(teksts) {
    const normalizets = teksts.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
    const teikumi = normalizets.split(/(?<=[.!?])\s+/).map(t => {
        if (!t) return t;
        const pirmais = t.charAt(0).toUpperCase();
        let pareizais = pirmais + t.slice(1);
        if (!/[.!?…]$/.test(pareizais)) pareizais += '.';
        return pareizais;
    });
    return teikumi.join(' ');
}

function vienkarsiVirsraksts(teksts) {
    const tirs = teksts.replace(/\s+/g, ' ').trim();
    const pirmais = tirs.split(/[.!?\n]/)[0] || tirs;
    let virsraksts = pirmais.trim().slice(0, 100);
    if (virsraksts.length) {
        virsraksts = virsraksts.charAt(0).toUpperCase() + virsraksts.slice(1);
    }
    return virsraksts;
}

module.exports = router;
