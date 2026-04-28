const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function isam(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => HTML_ESC[c]);
}

function dabutSortInfo(req, atlautasKolonnas, defaultColumn, defaultDir) {
    const sort = atlautasKolonnas[req.query.sort] ? req.query.sort : defaultColumn;
    const dir = req.query.dir === 'desc' || req.query.dir === 'asc'
        ? req.query.dir
        : (defaultDir === 'desc' ? 'desc' : 'asc');
    return { sort, dir };
}

function orderBy(sortInfo, atlautasKolonnas, secundary) {
    const sqlKolonna = atlautasKolonnas[sortInfo.sort];
    const sqlDir = sortInfo.dir === 'desc' ? 'DESC' : 'ASC';
    return `ORDER BY ${sqlKolonna} ${sqlDir}` + (secundary ? `, ${secundary}` : '');
}

function buildSortLink(kolonna, virsraksts, sortInfo, esoSieParams) {
    const aktivais = sortInfo.sort === kolonna;
    const nakamaisDir = aktivais && sortInfo.dir === 'asc' ? 'desc' : 'asc';
    const bulta = aktivais ? (sortInfo.dir === 'asc' ? ' ▲' : ' ▼') : '';
    const klase = aktivais ? 'sort-aktivs' : '';
    const aria = aktivais ? (sortInfo.dir === 'asc' ? 'ascending' : 'descending') : 'none';

    const params = new URLSearchParams();
    if (esoSieParams && typeof esoSieParams === 'object') {
        for (const k of Object.keys(esoSieParams)) {
            if (k === 'sort' || k === 'dir') continue;
            const v = esoSieParams[k];
            if (v === undefined || v === null || v === '') continue;
            params.set(k, String(v));
        }
    }
    params.set('sort', kolonna);
    params.set('dir', nakamaisDir);

    return `<a href="?${params.toString()}" class="sort-saite ${klase}" aria-sort="${aria}">${isam(virsraksts)}${bulta}</a>`;
}

module.exports = { dabutSortInfo, orderBy, buildSortLink };
