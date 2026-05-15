const test = require('node:test');
const assert = require('node:assert/strict');

const csrf = require('../utils/csrf');

function mockReq(method, sessionData, body, headers) {
    return {
        method,
        session: sessionData,
        body: body || {},
        headers: headers || {},
        is(type) { return (this.headers['content-type'] || '').includes(type); },
        t: (k) => k,
    };
}

function mockRes() {
    let kods = 200;
    let nogluts = null;
    return {
        statusCode: 200,
        locals: {},
        status(c) { this.statusCode = c; kods = c; return this; },
        render(view, data) { nogluts = { view, data, kods }; return this; },
        json(d) { nogluts = { json: d, kods: this.statusCode }; return this; },
        get nogluts() { return nogluts; },
    };
}

test('csrf: injectMiddleware uzstada locals.csrfToken un csrfField helperus', () => {
    const req = mockReq('GET', {});
    const res = mockRes();
    let nakamais = false;
    csrf.injectMiddleware(req, res, () => { nakamais = true; });

    assert.equal(nakamais, true);
    assert.ok(res.locals.csrfToken && res.locals.csrfToken.length > 20, 'csrfToken jabut iestatitam');
    assert.equal(typeof res.locals.csrfField, 'function');
    assert.equal(typeof res.locals.csrfMeta, 'function');
    assert.match(res.locals.csrfField(), /<input type="hidden" name="_csrf" value="[^"]+">/);
});

test('csrf: injectMiddleware atkārtoti izmanto esošo sesijas zetonu', () => {
    const sesija = { csrfToken: 'jau_eksistē_zetons_kas_ir_pietiekami_garš' };
    const req = mockReq('GET', sesija);
    const res = mockRes();
    csrf.injectMiddleware(req, res, () => {});
    assert.equal(res.locals.csrfToken, 'jau_eksistē_zetons_kas_ir_pietiekami_garš');
});

test('csrf: validateMiddleware ļauj GET pieprasījumiem bez zetona', () => {
    const req = mockReq('GET', { csrfToken: 'aaa' });
    const res = mockRes();
    let nakamais = false;
    csrf.validateMiddleware(req, res, () => { nakamais = true; });
    assert.equal(nakamais, true);
});

test('csrf: validateMiddleware bloķē POST bez zetona ar 403', () => {
    const req = mockReq('POST', { csrfToken: 'sesijas_zetons_kas_ir_garš_un_drošs' }, {});
    const res = mockRes();
    let nakamais = false;
    csrf.validateMiddleware(req, res, () => { nakamais = true; });

    assert.equal(nakamais, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.nogluts.view, 'error');
});

test('csrf: validateMiddleware bloķē POST ar nepareizu zetonu', () => {
    const req = mockReq('POST', { csrfToken: 'pareizais_zetons_garš' }, { _csrf: 'cits_zetons_garš' });
    const res = mockRes();
    csrf.validateMiddleware(req, res, () => {});
    assert.equal(res.statusCode, 403);
});

test('csrf: validateMiddleware ļauj POST ar pareizu zetonu body laukā', () => {
    const zetons = 'pareizais_zetons_kas_ir_pietiekami_garš';
    const req = mockReq('POST', { csrfToken: zetons }, { _csrf: zetons });
    const res = mockRes();
    let nakamais = false;
    csrf.validateMiddleware(req, res, () => { nakamais = true; });
    assert.equal(nakamais, true);
});

test('csrf: validateMiddleware ļauj POST ar pareizu zetonu x-csrf-token galvenē', () => {
    const zetons = 'pareizais_zetons_kas_ir_pietiekami_garš';
    const req = mockReq('POST', { csrfToken: zetons }, {}, { 'x-csrf-token': zetons });
    const res = mockRes();
    let nakamais = false;
    csrf.validateMiddleware(req, res, () => { nakamais = true; });
    assert.equal(nakamais, true);
});

test('csrf: validateMiddleware atgriež JSON, ja prasa application/json', () => {
    const req = mockReq('POST', { csrfToken: 'abc_garš_zetons' }, {}, { 'content-type': 'application/json', accept: 'application/json' });
    const res = mockRes();
    csrf.validateMiddleware(req, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.ok(res.nogluts.json, 'jāatgriež JSON nevis HTML');
});

test('csrf: csrfField HTML satur ekranētu zetonu', () => {
    const req = mockReq('GET', {});
    const res = mockRes();
    csrf.injectMiddleware(req, res, () => {});
    const html = res.locals.csrfField();
    assert.ok(html.includes('value="') && html.includes('"'));
    assert.ok(!html.includes('<script'), 'nedrīkst būt skripta tagu');
});
