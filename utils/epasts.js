let nodemailer;
try { nodemailer = require('nodemailer'); } catch (_) { nodemailer = null; }

let kesetsTransports = null;
let kesetsKonfiguracija = null;

function isKonfigurets() {
    return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && nodemailer);
}

function dabutTransport() {
    if (!isKonfigurets()) return null;

    const tagadeja = `${process.env.SMTP_HOST}|${process.env.SMTP_PORT}|${process.env.SMTP_USER}|${process.env.SMTP_PASS}|${process.env.SMTP_SECURE}`;
    if (kesetsTransports && kesetsKonfiguracija === tagadeja) return kesetsTransports;

    kesetsTransports = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
        auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
    });
    kesetsKonfiguracija = tagadeja;
    return kesetsTransports;
}

async function sutitEpastu({ to, subject, text, replyTo }) {
    const no = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
    const transport = dabutTransport();

    if (!transport) {
        console.log('\n--- EPASTA SIMULACIJA (SMTP nav konfigurets) ---');
        console.log('From:    ', no);
        console.log('To:      ', to);
        if (replyTo) console.log('Reply-To:', replyTo);
        console.log('Subject: ', subject);
        console.log('---');
        console.log(text);
        console.log('--- /EPASTA SIMULACIJA ---\n');
        return { simulated: true };
    }

    const rezultats = await transport.sendMail({
        from: no,
        to,
        subject,
        text,
        replyTo,
    });
    return { simulated: false, messageId: rezultats.messageId };
}

module.exports = { sutitEpastu, isKonfigurets };
