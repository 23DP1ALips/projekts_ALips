const LIETOTAJVARDA_REGEX = /^[a-zA-Z0-9._-]{3,50}$/;
const EPASTA_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validetRegistraciju({ lietotajvards, epasts, parole, paroleApstiprinata }) {
    const kludas = {};

    if (!lietotajvards || !LIETOTAJVARDA_REGEX.test(lietotajvards.trim())) {
        kludas.lietotajvards = 'validation.username_format';
    }
    if (!epasts || !EPASTA_REGEX.test(epasts.trim()) || epasts.length > 100) {
        kludas.epasts = 'validation.email_invalid';
    }
    if (!parole || parole.length < 8 || parole.length > 100) {
        kludas.parole = 'validation.password_length';
    } else if (!/[A-Za-z]/.test(parole) || !/\d/.test(parole)) {
        kludas.parole = 'validation.password_strength';
    }
    if (parole !== paroleApstiprinata) {
        kludas.paroleApstiprinata = 'validation.password_mismatch';
    }

    return kludas;
}

function validetPieslegsanos({ identifikators, parole }) {
    const kludas = {};
    if (!identifikators || !identifikators.trim()) {
        kludas.identifikators = 'validation.identifier_required';
    }
    if (!parole) {
        kludas.parole = 'validation.password_required';
    }
    return kludas;
}

function validetIerakstu({ virsraksts, saturs, kategorija_id }) {
    const kludas = {};
    if (!virsraksts || virsraksts.trim().length < 4 || virsraksts.length > 150) {
        kludas.virsraksts = 'validation.title_length';
    }
    if (!saturs || saturs.trim().length < 10) {
        kludas.saturs = 'validation.content_length';
    }
    if (!kategorija_id || !Number.isInteger(Number(kategorija_id))) {
        kludas.kategorija_id = 'validation.category_required';
    }
    return kludas;
}

function validetKomentaru({ teksts }) {
    const kludas = {};
    if (!teksts || teksts.trim().length < 2 || teksts.length > 2000) {
        kludas.teksts = 'validation.comment_length';
    }
    return kludas;
}

function validetKategoriju({ nosaukums, secibas_nr }) {
    const kludas = {};
    if (!nosaukums || nosaukums.trim().length < 2 || nosaukums.length > 80) {
        kludas.nosaukums = 'validation.category_name_length';
    }
    if (secibas_nr !== undefined && secibas_nr !== '' && (!Number.isInteger(Number(secibas_nr)) || Number(secibas_nr) < 0)) {
        kludas.secibas_nr = 'validation.category_seq_invalid';
    }
    return kludas;
}

function validetZinu({ sanemejs, saturs }) {
    const kludas = {};
    if (!sanemejs || !sanemejs.trim()) {
        kludas.sanemejs = 'validation.recipient_required';
    }
    if (!saturs || saturs.trim().length < 1 || saturs.length > 5000) {
        kludas.saturs = 'validation.message_length';
    }
    return kludas;
}

function validetProfilu({ profila_apraksts }) {
    const kludas = {};
    if (profila_apraksts && profila_apraksts.length > 255) {
        kludas.profila_apraksts = 'validation.description_length';
    }
    return kludas;
}

function validetAtbalstu({ vards, epasts, tema, zinojums }) {
    const kludas = {};
    if (!vards || !vards.trim() || vards.length > 100) {
        kludas.vards = 'validation.name_required';
    }
    if (!epasts || !EPASTA_REGEX.test(epasts.trim()) || epasts.length > 100) {
        kludas.epasts = 'validation.email_invalid';
    }
    if (!tema || !tema.trim() || tema.length > 150) {
        kludas.tema = 'validation.subject_required';
    }
    if (!zinojums || zinojums.trim().length < 10 || zinojums.length > 5000) {
        kludas.zinojums = 'validation.support_message_length';
    }
    return kludas;
}

module.exports = {
    validetRegistraciju,
    validetPieslegsanos,
    validetIerakstu,
    validetKomentaru,
    validetKategoriju,
    validetZinu,
    validetProfilu,
    validetAtbalstu,
};
