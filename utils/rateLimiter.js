const veikals = new Map();

function patereetCheck(parbaudes) {
    const now = Date.now();

    for (const p of parbaudes) {
        const arr = (veikals.get(p.key) || []).filter((ts) => now - ts < p.windowMs);
        if (arr.length >= p.max) {
            veikals.set(p.key, arr);
            const retryAfterSec = Math.max(1, Math.ceil((arr[0] + p.windowMs - now) / 1000));
            return { ok: false, retryAfterSec, exceededKey: p.key };
        }
    }

    for (const p of parbaudes) {
        const arr = (veikals.get(p.key) || []).filter((ts) => now - ts < p.windowMs);
        arr.push(now);
        veikals.set(p.key, arr);
    }
    return { ok: true };
}

function dabutIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (xff && typeof xff === 'string') return xff.split(',')[0].trim();
    return req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
}

setInterval(() => {
    const tagad = Date.now();
    const dienaMs = 24 * 60 * 60 * 1000;
    for (const [k, arr] of veikals.entries()) {
        const filtered = arr.filter((ts) => tagad - ts < dienaMs);
        if (filtered.length === 0) veikals.delete(k);
        else veikals.set(k, filtered);
    }
}, 60 * 60 * 1000).unref();

module.exports = { patereetCheck, dabutIp };
