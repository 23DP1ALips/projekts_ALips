const ATLAUTI_STATUSI = ['publicets', 'melnraksts', 'slegts'];

function parseDate(value) {
    if (!value || typeof value !== 'string') return null;
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
    if (Number.isNaN(dt.getTime())) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
}

function tirsString(s, maxLength) {
    if (!s || typeof s !== 'string') return '';
    const t = s.trim();
    if (!t) return '';
    return maxLength ? t.slice(0, maxLength) : t;
}

function buildPostFilter(query, options) {
    options = options || {};
    const piespiestStatuss = options.piespiestStatuss || 'publicets';
    const atlautAutorStatusu = !!options.atlautAutorStatusu;

    const meklesana = tirsString(query.meklesana, 150);
    const kategorijaId = Number(query.kategorija) || null;
    const autors = tirsString(query.autors, 50);
    const datumsNo = parseDate(query.datums_no);
    const datumsLidz = parseDate(query.datums_lidz);
    const statussIzvele = atlautAutorStatusu && ATLAUTI_STATUSI.includes(query.statuss) ? query.statuss : null;

    const nosacijumi = [];
    const parametri = [];

    if (statussIzvele) {
        nosacijumi.push('i.statuss = ?');
        parametri.push(statussIzvele);
    } else {
        nosacijumi.push('i.statuss = ?');
        parametri.push(piespiestStatuss);
    }

    if (meklesana) {
        nosacijumi.push('(i.virsraksts LIKE ? OR i.saturs LIKE ?)');
        parametri.push(`%${meklesana}%`, `%${meklesana}%`);
    }
    if (kategorijaId && Number.isInteger(kategorijaId) && kategorijaId > 0) {
        nosacijumi.push('i.kategorija_id = ?');
        parametri.push(kategorijaId);
    }
    if (autors) {
        nosacijumi.push('l.lietotajvards LIKE ?');
        parametri.push(`%${autors}%`);
    }
    if (datumsNo) {
        nosacijumi.push('i.izveidots >= ?');
        parametri.push(`${datumsNo} 00:00:00`);
    }
    if (datumsLidz) {
        nosacijumi.push('i.izveidots <= ?');
        parametri.push(`${datumsLidz} 23:59:59`);
    }

    return {
        whereSql: nosacijumi.join(' AND '),
        parametri,
        normalize: {
            meklesana,
            kategorijaId,
            autors,
            datumsNo,
            datumsLidz,
            statuss: statussIzvele,
        },
    };
}

module.exports = { buildPostFilter, parseDate, ATLAUTI_STATUSI };
