const test = require('node:test');
const assert = require('node:assert/strict');

const { patereetCheck } = require('../utils/rateLimiter');

function unikalsKey(prefiks) {
    return `${prefiks}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

test('rateLimiter: zem limita visi pieprasijumi tiek atļauti', () => {
    const k = unikalsKey('test1');
    for (let i = 0; i < 5; i++) {
        const r = patereetCheck([{ key: k, max: 5, windowMs: 60_000 }]);
        assert.equal(r.ok, true, `pieprasijums ${i + 1} jabut atļautam`);
    }
});

test('rateLimiter: pirmais pieprasijums virs limita tiek bloķēts ar retryAfterSec', () => {
    const k = unikalsKey('test2');
    for (let i = 0; i < 3; i++) {
        patereetCheck([{ key: k, max: 3, windowMs: 60_000 }]);
    }
    const r = patereetCheck([{ key: k, max: 3, windowMs: 60_000 }]);
    assert.equal(r.ok, false);
    assert.ok(r.retryAfterSec > 0, 'retryAfterSec jabut pozitīvam');
    assert.equal(r.exceededKey, k);
});

test('rateLimiter: vairāki limiti — neviens netiek patereets, ja viens bloķē', () => {
    const k1 = unikalsKey('test3-min');
    const k2 = unikalsKey('test3-dien');
    // Aizpildīt pirmo limitu līdz robežai
    for (let i = 0; i < 5; i++) {
        patereetCheck([
            { key: k1, max: 5, windowMs: 60_000 },
            { key: k2, max: 100, windowMs: 86400_000 },
        ]);
    }
    // Tagad pirmais limit ir aizpildīts; otrs vēl nav
    const r = patereetCheck([
        { key: k1, max: 5, windowMs: 60_000 },
        { key: k2, max: 100, windowMs: 86400_000 },
    ]);
    assert.equal(r.ok, false);
    assert.equal(r.exceededKey, k1);

    // Otrais limit nav patereets — joprojām var izsaukt ar tikai to atslēgu
    const tikai_dien = patereetCheck([{ key: k2, max: 100, windowMs: 86400_000 }]);
    assert.equal(tikai_dien.ok, true);
});

test('rateLimiter: dažādas atslēgas tiek skaitītas neatkarīgi', () => {
    const a = unikalsKey('test4-a');
    const b = unikalsKey('test4-b');
    for (let i = 0; i < 3; i++) {
        patereetCheck([{ key: a, max: 3, windowMs: 60_000 }]);
    }
    const aBloķēts = patereetCheck([{ key: a, max: 3, windowMs: 60_000 }]);
    const bAtļauts = patereetCheck([{ key: b, max: 3, windowMs: 60_000 }]);
    assert.equal(aBloķēts.ok, false);
    assert.equal(bAtļauts.ok, true);
});

test('rateLimiter: vecākie laiki ārpus loga netiek skaitīti', async () => {
    const k = unikalsKey('test5');
    const ws = 200; // 200 ms logs

    // Aizpildīt limitu līdz robežai un parbaudīt, ka tas ir bloķēts
    for (let i = 0; i < 3; i++) {
        const r = patereetCheck([{ key: k, max: 3, windowMs: ws }]);
        assert.equal(r.ok, true);
    }
    const bloķēts = patereetCheck([{ key: k, max: 3, windowMs: ws }]);
    assert.equal(bloķēts.ok, false);

    // Pagaidiet, līdz logs paiet
    await new Promise((res) => setTimeout(res, ws + 50));

    // Pēc loga beigām, jāļauj jaunus pieprasījumus
    const tagad = patereetCheck([{ key: k, max: 3, windowMs: ws }]);
    assert.equal(tagad.ok, true);
});
