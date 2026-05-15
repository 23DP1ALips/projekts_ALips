const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPostFilter, parseDate } = require('../utils/postFilters');

test('parseDate: pieņem ISO datumu YYYY-MM-DD', () => {
    assert.equal(parseDate('2026-04-25'), '2026-04-25');
    assert.equal(parseDate('  2026-04-25  '), '2026-04-25');
});

test('parseDate: noraida nederīgus formātus', () => {
    assert.equal(parseDate('25/04/2026'), null);
    assert.equal(parseDate('2026-13-50'), null);
    assert.equal(parseDate(''), null);
    assert.equal(parseDate(undefined), null);
    assert.equal(parseDate('drop table'), null);
});

test('buildPostFilter: nav filtru → atgriež tikai noklusējuma statusa nosacījumu', () => {
    const r = buildPostFilter({});
    assert.equal(r.whereSql, 'i.statuss = ?');
    assert.deepEqual(r.parametri, ['publicets']);
});

test('buildPostFilter: meklēšanas atslēgvārds tiek iesaiņots ar % LIKE pattern', () => {
    const r = buildPostFilter({ meklesana: 'react hooks' });
    assert.ok(r.whereSql.includes('(i.virsraksts LIKE ? OR i.saturs LIKE ?)'));
    assert.deepEqual(r.parametri, ['publicets', '%react hooks%', '%react hooks%']);
});

test('buildPostFilter: kategorija tiek pievienota tikai kā parametrs (pozitīvs vesels skaitlis)', () => {
    const r = buildPostFilter({ kategorija: '3' });
    assert.ok(r.whereSql.includes('i.kategorija_id = ?'));
    assert.deepEqual(r.parametri, ['publicets', 3]);
});

test('buildPostFilter: nederīga kategorija tiek ignorēta (nepievieno parametru)', () => {
    const r1 = buildPostFilter({ kategorija: 'abc' });
    assert.equal(r1.whereSql, 'i.statuss = ?');
    const r2 = buildPostFilter({ kategorija: '-5' });
    assert.equal(r2.whereSql, 'i.statuss = ?');
    const r3 = buildPostFilter({ kategorija: '0' });
    assert.equal(r3.whereSql, 'i.statuss = ?');
});

test('buildPostFilter: autora filtrs izmanto LIKE uz l.lietotajvards', () => {
    const r = buildPostFilter({ autors: 'anna' });
    assert.ok(r.whereSql.includes('l.lietotajvards LIKE ?'));
    assert.deepEqual(r.parametri, ['publicets', '%anna%']);
});

test('buildPostFilter: datumu diapazons pievieno >= un <= ar pilnas dienas robežām', () => {
    const r = buildPostFilter({ datums_no: '2026-04-20', datums_lidz: '2026-04-25' });
    assert.ok(r.whereSql.includes('i.izveidots >= ?'));
    assert.ok(r.whereSql.includes('i.izveidots <= ?'));
    assert.deepEqual(r.parametri, ['publicets', '2026-04-20 00:00:00', '2026-04-25 23:59:59']);
});

test('buildPostFilter: nederīgi datumi tiek ignorēti', () => {
    const r = buildPostFilter({ datums_no: 'bad', datums_lidz: '2026/04/25' });
    assert.equal(r.parametri.length, 1);
    assert.deepEqual(r.parametri, ['publicets']);
});

test('buildPostFilter: visi filtri kombinēti — visi nosacījumi un parametri pareizā secībā', () => {
    const r = buildPostFilter({
        meklesana: 'react',
        kategorija: '2',
        autors: 'sarah',
        datums_no: '2026-04-20',
        datums_lidz: '2026-04-27',
    });
    assert.equal(
        r.whereSql,
        'i.statuss = ? AND (i.virsraksts LIKE ? OR i.saturs LIKE ?) AND i.kategorija_id = ? AND l.lietotajvards LIKE ? AND i.izveidots >= ? AND i.izveidots <= ?'
    );
    assert.deepEqual(r.parametri, [
        'publicets',
        '%react%', '%react%',
        2,
        '%sarah%',
        '2026-04-20 00:00:00',
        '2026-04-27 23:59:59',
    ]);
});

test('buildPostFilter: piespiestStatuss var tikt pārrakstīts (admins skata melnrakstus)', () => {
    const r = buildPostFilter({}, { piespiestStatuss: 'melnraksts' });
    assert.deepEqual(r.parametri, ['melnraksts']);
});

test('buildPostFilter: atlautAutorStatusu ļauj user-piedavāto statusu, ja tas ir derīgs', () => {
    const r = buildPostFilter({ statuss: 'slegts' }, { atlautAutorStatusu: true });
    assert.deepEqual(r.parametri, ['slegts']);
});

test('buildPostFilter: atlautAutorStatusu ar nederīgu statusu krīt atpakaļ uz noklusējumu', () => {
    const r = buildPostFilter({ statuss: 'DROP TABLE' }, { atlautAutorStatusu: true });
    assert.deepEqual(r.parametri, ['publicets']);
});

test('buildPostFilter: SQL injekcija meklēšanas laukā ir neefektīva — vērtība tiek nodota tikai kā parametrs', () => {
    const launais = `'; DROP TABLE lietotajs; --`;
    const r = buildPostFilter({ meklesana: launais });
    // SQL satur tikai placeholder ?, nevis launais teksts
    assert.ok(!r.whereSql.includes('DROP TABLE'));
    assert.ok(!r.whereSql.includes('--'));
    // Parametros — kā teksts, gatavs sagatavotam vaicājumam
    assert.equal(r.parametri[1], `%${launais}%`);
});

test('buildPostFilter: SQL injekcijas mēģinājums kategorijas laukā tiek noraidīts', () => {
    const r = buildPostFilter({ kategorija: '1; DROP TABLE lietotajs' });
    // Number() atgriezīs NaN → kategorija tiek izlaista
    assert.equal(r.whereSql, 'i.statuss = ?');
    assert.deepEqual(r.parametri, ['publicets']);
});

test('buildPostFilter: SQL injekcijas mēģinājums datuma laukā tiek noraidīts', () => {
    const r = buildPostFilter({ datums_no: "2026-04-20'; DROP TABLE--" });
    // parseDate prasa stingru YYYY-MM-DD formātu, citi tiek atmesti
    assert.equal(r.whereSql, 'i.statuss = ?');
});

test('buildPostFilter: normalizetas vērtības tiek atgrieztas formas atjaunošanai', () => {
    const r = buildPostFilter({
        meklesana: '  trimmed  ',
        kategorija: '5',
        autors: '  user  ',
        datums_no: '2026-04-20',
    });
    assert.equal(r.normalize.meklesana, 'trimmed');
    assert.equal(r.normalize.kategorijaId, 5);
    assert.equal(r.normalize.autors, 'user');
    assert.equal(r.normalize.datumsNo, '2026-04-20');
    assert.equal(r.normalize.datumsLidz, null);
});
