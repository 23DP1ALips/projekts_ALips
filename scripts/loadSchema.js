require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function dabutSavienojumu() {
    const urls = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;
    if (urls) {
        const u = new URL(urls);
        return {
            host: u.hostname,
            port: Number(u.port) || 3306,
            user: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
            database: u.pathname.replace(/^\//, '') || undefined,
            avots: 'URL string',
        };
    }
    return {
        host: process.env.DB_HOST || process.env.MYSQLHOST,
        port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
        user: process.env.DB_USER || process.env.MYSQLUSER,
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
        database: process.env.DB_NAME || process.env.MYSQLDATABASE,
        avots: 'atsevišķi mainīgie',
    };
}

(async () => {
    const cfg = dabutSavienojumu();
    console.log(`Savienojuma avots: ${cfg.avots}`);
    console.log(`  host:     ${cfg.host || '(trūkst)'}`);
    console.log(`  port:     ${cfg.port}`);
    console.log(`  user:     ${cfg.user || '(trūkst)'}`);
    console.log(`  database: ${cfg.database || '(trūkst)'}`);
    console.log(`  password: ${cfg.password ? '(iestatīts, ' + cfg.password.length + ' simboli)' : '(trūkst)'}`);

    if (!cfg.host || !cfg.user || !cfg.database) {
        console.error('\nTrūkst nepieciešamie savienojuma dati. Pieejamie MYSQL_* / DB_* mainīgie:');
        Object.keys(process.env)
            .filter((k) => k.startsWith('MYSQL') || k.startsWith('DB_') || k === 'DATABASE_URL')
            .forEach((k) => console.error('  ' + k));
        process.exit(1);
    }

    const con = await mysql.createConnection({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        multipleStatements: true,
        connectTimeout: 15000,
    });
    console.log('\nSavienojums izveidots. Ielādējam shēmu...');
    const sqlFails = path.join(__dirname, '..', 'sql', 'schema.sql');
    const sql = fs.readFileSync(sqlFails, 'utf8');
    await con.query(sql);
    console.log('Shēma veiksmīgi izveidota.');
    await con.end();
})().catch((kluda) => {
    console.error('\nShēmas ielādes kļūda:');
    console.error('  message:    ', kluda.message || '(tukšs)');
    if (kluda.code) console.error('  code:       ', kluda.code);
    if (kluda.errno) console.error('  errno:      ', kluda.errno);
    if (kluda.sqlState) console.error('  sqlState:   ', kluda.sqlState);
    if (kluda.sqlMessage) console.error('  sqlMessage: ', kluda.sqlMessage);
    if (!kluda.message && !kluda.code) console.error('  raw:        ', JSON.stringify(kluda));
    process.exit(1);
});
