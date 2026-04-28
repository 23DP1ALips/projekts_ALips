function formatDatums(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isam(html) {
    if (html === null || html === undefined) return '';
    return String(html)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function nl2br(text) {
    return isam(text).replace(/\r?\n/g, '<br>');
}

function saisinat(text, limit = 160) {
    if (!text) return '';
    const t = String(text).trim();
    return t.length > limit ? t.slice(0, limit - 1) + '…' : t;
}

function tulkotPazinojumu(teksts, t) {
    if (!teksts) return '';
    if (typeof teksts === 'string' && teksts.startsWith('{')) {
        try {
            const dati = JSON.parse(teksts);
            if (dati && dati.key) return t(dati.key, dati.params || {});
        } catch (_) { /* fall through to plain text */ }
    }
    return teksts;
}

module.exports = { formatDatums, isam, nl2br, saisinat, tulkotPazinojumu };
