const test = require('node:test');
const assert = require('node:assert/strict');

const {
    validetRegistraciju,
    validetPieslegsanos,
    validetIerakstu,
    validetKomentaru,
    validetKategoriju,
    validetZinu,
} = require('../utils/validacija');

test('Registracija: derigi dati neatgriez kludas', () => {
    const kludas = validetRegistraciju({
        lietotajvards: 'lietotajs1',
        epasts: 'parbaude@example.com',
        parole: 'Parole12',
        paroleApstiprinata: 'Parole12',
    });
    assert.deepEqual(kludas, {});
});

test('Registracija: parole bez cipara vai burta tiek noraidita', () => {
    const kludas = validetRegistraciju({
        lietotajvards: 'lietotajs1',
        epasts: 'parbaude@example.com',
        parole: 'paroleonly',
        paroleApstiprinata: 'paroleonly',
    });
    assert.ok(kludas.parole, 'jaatgriez paroles kluda');
});

test('Registracija: paroles nesakrit', () => {
    const kludas = validetRegistraciju({
        lietotajvards: 'lietotajs1',
        epasts: 'a@b.com',
        parole: 'Parole12',
        paroleApstiprinata: 'Cita99',
    });
    assert.ok(kludas.paroleApstiprinata);
});

test('Pieslegsanas: tukss identifikators atgriez kludu', () => {
    const kludas = validetPieslegsanos({ identifikators: '', parole: 'jebkura' });
    assert.ok(kludas.identifikators);
});

test('Ieraksts: trukstoss virsraksts tiek noraidits', () => {
    const kludas = validetIerakstu({ virsraksts: '', saturs: 'pietiekami garš teksts', kategorija_id: 1 });
    assert.ok(kludas.virsraksts);
});

test('Ieraksts: derigi dati neatgriez kludas', () => {
    const kludas = validetIerakstu({
        virsraksts: 'Pirmais ieraksts',
        saturs: 'Šis ir foruma ieraksts ar pietiekamu saturu.',
        kategorija_id: 2,
    });
    assert.deepEqual(kludas, {});
});

test('Komentars: pārāk īss tiek noraidīts', () => {
    const kludas = validetKomentaru({ teksts: 'a' });
    assert.ok(kludas.teksts);
});

test('Kategorija: tukšs nosaukums tiek noraidīts', () => {
    const kludas = validetKategoriju({ nosaukums: '', secibas_nr: 0 });
    assert.ok(kludas.nosaukums);
});

test('Kategorija: negatīva secības nr tiek noraidīta', () => {
    const kludas = validetKategoriju({ nosaukums: 'Tema', secibas_nr: -3 });
    assert.ok(kludas.secibas_nr);
});

test('Zina: tukss saturs tiek noraidits', () => {
    const kludas = validetZinu({ sanemejs: 'kāds', saturs: '' });
    assert.ok(kludas.saturs);
});
