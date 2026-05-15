require('dotenv').config();
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
        };
    }
    return {
        host: process.env.DB_HOST || process.env.MYSQLHOST,
        port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
        user: process.env.DB_USER || process.env.MYSQLUSER,
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
        database: process.env.DB_NAME || process.env.MYSQLDATABASE,
    };
}

const lietotajvards = process.argv[2];
const jaunaLoma = process.argv[3] || 'administrators';

if (!lietotajvards || !['administrators', 'lietotajs'].includes(jaunaLoma)) {
    console.error('Lietojums: node scripts/promoteUser.js <lietotajvards> [administrators|lietotajs]');
    process.exit(1);
}

(async () => {
    const con = await mysql.createConnection(dabutSavienojumu());
    const [rez] = await con.execute(
        'UPDATE lietotajs SET loma = ? WHERE lietotajvards = ?',
        [jaunaLoma, lietotajvards]
    );
    if (rez.affectedRows === 0) {
        console.error(`Lietotājs '${lietotajvards}' nav atrasts.`);
        await con.end();
        process.exit(2);
    }
    console.log(`Atjaunoja ${rez.affectedRows} rindu. Lietotājs '${lietotajvards}' tagad ir '${jaunaLoma}'.`);
    await con.end();
})().catch((kluda) => {
    console.error('Kļūda:', kluda.message);
    process.exit(1);
});
