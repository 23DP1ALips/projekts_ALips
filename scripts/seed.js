require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');

const PAROLE = 'Parole123';
const HASH_RAUNDI = 12;

const SAKUMA_TS = new Date('2026-04-20T00:00:00').getTime();
const TAGAD_TS = Date.now();
const STUNDA_MS = 60 * 60 * 1000;
const DIENA_MS = 24 * STUNDA_MS;

function nejausaMs(min, max) {
    if (max <= min) return min;
    return min + Math.random() * (max - min);
}
function mysqlDatums(d) {
    const date = d instanceof Date ? d : new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const LIETOTAJI = [
    { lietotajvards: 'admin', epasts: 'admin@forums.lv', loma: 'administrators', apraksts: 'Foruma administrators.' },
    { lietotajvards: 'anna', epasts: 'anna@example.com', loma: 'lietotajs', apraksts: 'Programmēšanas entuziaste.' },
    { lietotajvards: 'janis', epasts: 'janis@example.com', loma: 'lietotajs', apraksts: 'Datu zinātnes students.' },
    { lietotajvards: 'liga', epasts: 'liga@example.com', loma: 'lietotajs', apraksts: 'Web izstrādātāja.' },
    { lietotajvards: 'martins', epasts: 'martins@example.com', loma: 'lietotajs', apraksts: 'Linux lietotājs un open-source atbalstītājs.' },

    { lietotajvards: 'john_smith', epasts: 'john@example.com', loma: 'lietotajs', apraksts: 'Software engineer from London. Backend, Go, distributed systems.' },
    { lietotajvards: 'mary_jones', epasts: 'mary@example.com', loma: 'lietotajs', apraksts: 'UX designer focused on accessibility and design systems.' },
    { lietotajvards: 'alex_walker', epasts: 'alex@example.com', loma: 'lietotajs', apraksts: 'Cybersecurity researcher and CTF enthusiast.' },
    { lietotajvards: 'sarah_brown', epasts: 'sarah@example.com', loma: 'lietotajs', apraksts: 'Junior developer learning React and TypeScript.' },

    { lietotajvards: 'dmitry', epasts: 'dmitry@example.com', loma: 'lietotajs', apraksts: 'Дмитрий, разработчик из Риги. Node.js, Postgres, DevOps.' },
    { lietotajvards: 'olga', epasts: 'olga@example.com', loma: 'lietotajs', apraksts: 'Ольга, преподаватель информатики. Помогаю студентам с SQL и Python.' },
    { lietotajvards: 'sergey', epasts: 'sergey@example.com', loma: 'lietotajs', apraksts: 'Сергей, увлекаюсь машинным обучением и компьютерным зрением.' },
    { lietotajvards: 'natalia', epasts: 'natalia@example.com', loma: 'lietotajs', apraksts: 'Наталия, фронтенд-разработчик. React, Vue, дизайн-системы.' },
];

const KATEGORIJAS = [
    { nosaukums: 'Vispārīgi', apraksts: 'Vispārējas tēmas un sarunas par visu un neko.', secibas_nr: 1 },
    { nosaukums: 'Programmēšana', apraksts: 'Diskusijas par programmēšanas valodām, ietvariem un risinājumiem.', secibas_nr: 2 },
    { nosaukums: 'Datu bāzes', apraksts: 'SQL, NoSQL, datu modelēšana un veiktspēja.', secibas_nr: 3 },
    { nosaukums: 'Tehnoloģijas', apraksts: 'Jaunākās tehnoloģijas, gadžeti un tendences.', secibas_nr: 4 },
    { nosaukums: 'Mācības', apraksts: 'Resursi, materiāli, padomi mācībām.', secibas_nr: 5 },
];

const IERAKSTI = [
    { autors: 'anna', kategorija: 'Programmēšana', virsraksts: 'JavaScript vai Python iesācējiem?', saturs: 'Sveiki visiem! Esmu iesācēja un nevaru izlemt, ar kuru valodu sākt mācīties. Vai kāds varētu ieteikt savu pieredzi - kāpēc tieši Python vai JavaScript bija labākā izvēle pirmajai valodai?' },
    { autors: 'janis', kategorija: 'Datu bāzes', virsraksts: 'Indeksi MySQL: kad tos izmantot?', saturs: 'Strādāju pie projekta, kur ir liela tabula ar gandrīz miljonu ierakstu. Pamanīju, ka SELECT vaicājumi kļūst lēni. Kādi ir labākie ieteikumi indeksu pievienošanai un kā saprast, kuras kolonnas patiešām vajag indeksēt?' },
    { autors: 'liga', kategorija: 'Programmēšana', virsraksts: 'CSS Grid vai Flexbox?', saturs: 'Bieži strīdamies komandā - kuram ir labāk uzticēt izkārtojumus? Mans uzskats: Grid divdimensiju izkārtojumiem, Flexbox vienas līnijas elementu izkārtošanai. Ko domājat jūs?' },
    { autors: 'martins', kategorija: 'Tehnoloģijas', virsraksts: 'Linux uz vecāka klēpjdatora', saturs: 'Vai kāds ir izmēģinājis vieglas Linux distribūcijas (piem., Lubuntu, Xubuntu) uz vecākiem datoriem? Cik labi tās strādā ar 4 GB RAM?' },
    { autors: 'anna', kategorija: 'Mācības', virsraksts: 'Labākie bezmaksas resursi datu bāzēm', saturs: 'Apkopoju dažus labus bezmaksas resursus datu bāzu mācībām: SQLZoo, PostgreSQL Tutorial, MySQL dokumentācija. Lūdzu, papildiniet sarakstu ar saviem favorītiem!' },
    { autors: 'janis', kategorija: 'Vispārīgi', virsraksts: 'Sveiki forumam!', saturs: 'Tikko reģistrējos šajā forumā. Šķiet, ka šeit ir aktīva un draudzīga kopiena. Ceru uz interesantām diskusijām!' },
    { autors: 'liga', kategorija: 'Datu bāzes', virsraksts: 'Normalizācija praksē - cik tālu iet?', saturs: 'Teorija saka 3NF vai pat BCNF, bet praksē bieži redzu, ka tabulās tiek glabāti dublēti dati veiktspējas dēļ. Kā jūs balansējat starp normalizāciju un veiktspēju?' },
    { autors: 'martins', kategorija: 'Programmēšana', virsraksts: 'Git rebase vs merge', saturs: 'Komandā ir mūžsenais strīds: vai izmantot rebase vai merge? Kādas ir jūsu darba plūsmas un kāpēc?' },
    { autors: 'anna', kategorija: 'Tehnoloģijas', virsraksts: 'Kuru ārkārtas datora ekrānu izvēlēties?', saturs: 'Plānoju iegādāties otro monitoru programmēšanai. Vai ieteiktu 24" 1080p vai 27" 1440p? Kāda ir jūsu pieredze?' },
    { autors: 'janis', kategorija: 'Mācības', virsraksts: 'Kā gatavoties tehniskajām intervijām?', saturs: 'Drīz sāksies prakses meklēšana. Kādi resursi un padomi ir palīdzējuši jums sagatavoties tehniskajām intervijām?' },
    { autors: 'liga', kategorija: 'Vispārīgi', virsraksts: 'Iepazīšanās tēma', saturs: 'Sveiki! Esmu Līga, web izstrādātāja ar 3 gadu pieredzi. Ar prieku iepazīšos ar kopienu!' },
    { autors: 'martins', kategorija: 'Datu bāzes', virsraksts: 'PostgreSQL vai MySQL?', saturs: 'Sākšu jaunu projektu un domāju par datu bāzes izvēli. PostgreSQL ir bagātāks ar funkcijām, bet MySQL ir vienkāršāks deployēt. Ko ieteiktu?' },

    { autors: 'john_smith', kategorija: 'Programmēšana', virsraksts: 'Best Node.js framework in 2026?', saturs: 'I have used Express for years but the ecosystem has changed a lot. Has anyone moved to Fastify, Hono or Nitro recently? What was the migration like and was it worth it?' },
    { autors: 'mary_jones', kategorija: 'Tehnoloģijas', virsraksts: 'Designing a great dark mode in 2026', saturs: 'Dark mode is no longer just inverting colours. I am collecting design patterns that actually work: layered surfaces, lower saturation, careful contrast on accent colours. Share your favourite examples please!' },
    { autors: 'alex_walker', kategorija: 'Tehnoloģijas', virsraksts: 'How do you stay safe online in 2026?', saturs: 'Phishing has become almost impossible to spot since AI-generated voice and video became mainstream. What habits and tools do you rely on to keep your accounts safe? Hardware keys, password managers, anything else?' },
    { autors: 'sarah_brown', kategorija: 'Programmēšana', virsraksts: 'React hooks - which ones do you use the most?', saturs: 'I am still a junior dev and I find myself using useState and useEffect almost everywhere. Are there hooks you use so often that you miss them when working in another framework?' },
    { autors: 'john_smith', kategorija: 'Datu bāzes', virsraksts: 'SQLite or Postgres for small side projects?', saturs: 'For solo projects I love SQLite - one file, zero ops. But once I add a second service or background worker I miss Postgres features. Where do you draw the line?' },
    { autors: 'mary_jones', kategorija: 'Mācības', virsraksts: 'Free icon libraries every designer should know', saturs: 'My current go-to is Lucide, but I would love to hear what other designers are using in 2026. Bonus points for libraries with good accessibility metadata.' },

    { autors: 'dmitry', kategorija: 'Tehnoloģijas', virsraksts: 'Какой VPS-провайдер выбрать в 2026?', saturs: 'Использую Hetzner уже несколько лет, всё устраивает. Но коллеги рекомендуют посмотреть на новых европейских провайдеров. Кто чем пользуется и почему именно?' },
    { autors: 'olga', kategorija: 'Mācības', virsraksts: 'Опыт преподавания программирования онлайн', saturs: 'Веду курс по Python для школьников. Самое сложное - удерживать внимание онлайн. Поделитесь, какие приёмы работают у вас? Игровые проекты? Парное программирование?' },
    { autors: 'sergey', kategorija: 'Programmēšana', virsraksts: 'Какие ML-библиотеки используете в продакшене?', saturs: 'PyTorch для исследований, ONNX для деплоя, scikit-learn для классики. А что у вас в стеке для продакшена? Особенно интересно про MLOps-инструменты.' },
    { autors: 'natalia', kategorija: 'Programmēšana', virsraksts: 'TypeScript или JavaScript для нового проекта?', saturs: 'Начинаю новый фронтенд-проект, команда небольшая. Стоит ли сразу заводить TypeScript или начать с JavaScript и постепенно мигрировать? Какой опыт у вас?' },
    { autors: 'dmitry', kategorija: 'Tehnoloģijas', virsraksts: 'Опыт работы с Docker Compose в продакшене', saturs: 'Для маленьких сервисов Docker Compose выглядит проще, чем Kubernetes. У кого есть опыт реальной эксплуатации Compose в продакшене? Какие подводные камни?' },
    { autors: 'olga', kategorija: 'Datu bāzes', virsraksts: 'Лучшие книги по SQL для начинающих', saturs: 'Собираю список книг для своих студентов. Пока в списке: "SQL для простых смертных", "Изучаем SQL". Что бы вы добавили? Особенно интересны книги с практическими задачами.' },
];

const KOMENTARI = [
    { ieraksta_indekss: 0, autors: 'janis', teksts: 'Sāc ar Python - sintakse vienkāršāka, ātrāk var redzēt rezultātus.' },
    { ieraksta_indekss: 0, autors: 'liga', teksts: 'JavaScript ir noderīgs, ja gribi taisīt mājaslapas. Atkarīgs no mērķa.' },
    { ieraksta_indekss: 0, autors: 'martins', teksts: 'Es teiktu - abas! Bet sāc ar to, kas tev šobrīd vajadzīgs konkrētam mērķim.' },
    { ieraksta_indekss: 0, autors: 'sarah_brown', teksts: 'I started with Python and switched to JS later for web stuff. Python is much more forgiving as a first language.' },
    { ieraksta_indekss: 1, autors: 'liga', teksts: 'Skaties EXPLAIN izvadi - tā parādīs, kuras kolonnas tiek skenētas pilnā tabulā.' },
    { ieraksta_indekss: 1, autors: 'anna', teksts: 'Pievieno indeksus tām kolonnām, ko bieži izmanto WHERE un JOIN nosacījumos.' },
    { ieraksta_indekss: 1, autors: 'dmitry', teksts: 'Не забывай про composite indexes - порядок колонок имеет значение.' },
    { ieraksta_indekss: 2, autors: 'janis', teksts: 'Piekrītu - Grid sarežģītākiem layout, Flexbox komponentu iekšienē.' },
    { ieraksta_indekss: 2, autors: 'mary_jones', teksts: 'Same here. I also use container queries now for smaller component-level breakpoints.' },
    { ieraksta_indekss: 3, autors: 'anna', teksts: 'Es lietoju Lubuntu uz veca ThinkPad - strādā lieliski!' },
    { ieraksta_indekss: 4, autors: 'janis', teksts: 'Vēl iesaku Khan Academy SQL kursu un Mode Analytics SQL Tutorial.' },
    { ieraksta_indekss: 4, autors: 'olga', teksts: 'Очень хорошие задачи на sql-ex.ru, советую всем начинающим.' },
    { ieraksta_indekss: 5, autors: 'admin', teksts: 'Laipni lūdzam!' },
    { ieraksta_indekss: 5, autors: 'mary_jones', teksts: 'Welcome! Looks like a friendly community.' },
    { ieraksta_indekss: 6, autors: 'martins', teksts: 'Praksē bieži denormalizēju lasīšanas optimizācijai - bet tikai tad, kad ir reāls veiktspējas iemesls.' },
    { ieraksta_indekss: 7, autors: 'anna', teksts: 'Mēs izmantojam squash merge - vienkārši un tīri.' },
    { ieraksta_indekss: 7, autors: 'john_smith', teksts: 'Rebase locally to keep history clean, merge to main. Best of both worlds in my opinion.' },
    { ieraksta_indekss: 11, autors: 'janis', teksts: 'PostgreSQL bez šaubām, ja vajag JSON vai tipu drošumu.' },
    { ieraksta_indekss: 11, autors: 'sergey', teksts: 'Согласен с предыдущим комментарием. Postgres сильно опережает MySQL по типам данных.' },

    { ieraksta_indekss: 12, autors: 'sarah_brown', teksts: 'I migrated a small service from Express to Fastify and saw a noticeable latency drop. Migration was easier than expected.' },
    { ieraksta_indekss: 12, autors: 'dmitry', teksts: 'Hono работает прекрасно на edge - советую попробовать, если деплоитесь на Cloudflare Workers.' },
    { ieraksta_indekss: 13, autors: 'sarah_brown', teksts: 'Layered surfaces are the trick I was missing. Thanks for sharing!' },
    { ieraksta_indekss: 14, autors: 'john_smith', teksts: 'Hardware keys + a password manager has been my baseline for years. Saved me a few times already.' },
    { ieraksta_indekss: 14, autors: 'natalia', teksts: 'Также никогда не открываю ссылки из писем - всегда захожу на сайт напрямую.' },
    { ieraksta_indekss: 15, autors: 'mary_jones', teksts: 'useId is the underrated one for me - made accessible labels much easier.' },
    { ieraksta_indekss: 16, autors: 'mary_jones', teksts: 'I usually go Postgres unless the data really fits in a single file and never grows.' },
    { ieraksta_indekss: 18, autors: 'natalia', teksts: 'Hetzner отлично подходит. Цены и поддержка на высоте.' },
    { ieraksta_indekss: 19, autors: 'sergey', teksts: 'Парное программирование реально работает. Особенно с pet-проектами.' },
    { ieraksta_indekss: 20, autors: 'olga', teksts: 'Мы используем MLflow для трекинга экспериментов - очень удобно.' },
    { ieraksta_indekss: 21, autors: 'john_smith', teksts: 'Start with TypeScript from day one - retrofitting types into a JS codebase later is painful.' },
    { ieraksta_indekss: 21, autors: 'mary_jones', teksts: 'Strongly agree. Even a small team benefits from typed APIs between components.' },
    { ieraksta_indekss: 22, autors: 'alex_walker', teksts: 'Compose works fine for a single host. Once you need rolling deploys or HA, K8s starts to make sense.' },
    { ieraksta_indekss: 23, autors: 'sarah_brown', teksts: '"SQL Cookbook" by Anthony Molinaro is great for practical recipes.' },
];

const PRIVATAS_ZINAS = [
    { sutitajs: 'anna', sanemejs: 'janis', saturs: 'Sveiks! Vai vari ieteikt labu MySQL grāmatu?' },
    { sutitajs: 'janis', sanemejs: 'anna', saturs: 'Iesaku "High Performance MySQL" - klasika!' },
    { sutitajs: 'liga', sanemejs: 'martins', saturs: 'Vai darbojies pie atvērtā koda projektiem?' },
    { sutitajs: 'john_smith', sanemejs: 'mary_jones', saturs: 'Hi Mary - loved your post on dark mode. Do you have a recommended reading list?' },
    { sutitajs: 'mary_jones', sanemejs: 'john_smith', saturs: 'Hey! I will put one together this weekend and send it over.' },
    { sutitajs: 'dmitry', sanemejs: 'sergey', saturs: 'Привет! Видел твой пост про ML, у нас как раз есть похожий проект - можем обсудить?' },
    { sutitajs: 'olga', sanemejs: 'natalia', saturs: 'Здравствуйте! Не подскажете курс по React для начинающих?' },
];

async function palaist() {
    const con = await db.getConnection();
    try {
        console.log('Dzēšam esošos datus...');
        await con.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const tab of ['audita_zurnals', 'pazinojums', 'privata_zina', 'komentars', 'ieraksts', 'kategorija', 'lietotajs']) {
            await con.query(`TRUNCATE TABLE ${tab}`);
        }
        await con.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log(`Datumu logs: ${mysqlDatums(SAKUMA_TS)} → ${mysqlDatums(TAGAD_TS)}`);

        console.log('Pievienojam lietotājus ar nejaušiem reģistrācijas datumiem...');
        const hash = await bcrypt.hash(PAROLE, HASH_RAUNDI);
        const lietotajuId = {};
        const lietotajuDatumi = {};

        const regBeigas = SAKUMA_TS + 3 * DIENA_MS;

        for (const l of LIETOTAJI) {
            const regMs = l.lietotajvards === 'admin'
                ? SAKUMA_TS + STUNDA_MS
                : nejausaMs(SAKUMA_TS, Math.min(regBeigas, TAGAD_TS));
            const regDatums = new Date(regMs);
            lietotajuDatumi[l.lietotajvards] = regDatums;

            const [rez] = await con.query(
                'INSERT INTO lietotajs (lietotajvards, epasts, paroles_hash, loma, profila_apraksts, registracijas_datums) VALUES (?, ?, ?, ?, ?, ?)',
                [l.lietotajvards, l.epasts, hash, l.loma, l.apraksts, mysqlDatums(regDatums)]
            );
            lietotajuId[l.lietotajvards] = rez.insertId;
        }

        console.log('Pievienojam kategorijas...');
        const kategorijuId = {};
        for (const k of KATEGORIJAS) {
            const [rez] = await con.query(
                'INSERT INTO kategorija (nosaukums, apraksts, secibas_nr, aktiva) VALUES (?, ?, ?, TRUE)',
                [k.nosaukums, k.apraksts, k.secibas_nr]
            );
            kategorijuId[k.nosaukums] = rez.insertId;
        }

        console.log('Pievienojam ierakstus ar nejaušiem datumiem...');
        const ierakstuId = [];
        const ierakstuDatumi = [];
        for (const i of IERAKSTI) {
            const minMs = lietotajuDatumi[i.autors].getTime() + STUNDA_MS;
            const izveidots = new Date(nejausaMs(Math.max(SAKUMA_TS, minMs), TAGAD_TS));
            const izveidotsStr = mysqlDatums(izveidots);
            const [rez] = await con.query(
                'INSERT INTO ieraksts (autora_id, kategorija_id, virsraksts, saturs, statuss, izveidots, atjauninats) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [lietotajuId[i.autors], kategorijuId[i.kategorija], i.virsraksts, i.saturs, 'publicets', izveidotsStr, izveidotsStr]
            );
            ierakstuId.push(rez.insertId);
            ierakstuDatumi.push(izveidots);
        }

        console.log('Pievienojam komentārus ar nejaušiem datumiem (pēc ieraksta)...');
        for (const k of KOMENTARI) {
            const postDate = ierakstuDatumi[k.ieraksta_indekss];
            const minMs = postDate.getTime() + 5 * 60 * 1000;
            const izveidots = new Date(nejausaMs(Math.min(minMs, TAGAD_TS - 60 * 1000), TAGAD_TS));
            await con.query(
                'INSERT INTO komentars (ieraksts_id, autora_id, teksts, izveidots) VALUES (?, ?, ?, ?)',
                [ierakstuId[k.ieraksta_indekss], lietotajuId[k.autors], k.teksts, mysqlDatums(izveidots)]
            );
        }

        console.log('Pievienojam privātās ziņas ar nejaušiem datumiem...');
        for (const z of PRIVATAS_ZINAS) {
            const minMs = Math.max(
                lietotajuDatumi[z.sutitajs].getTime(),
                lietotajuDatumi[z.sanemejs].getTime()
            ) + STUNDA_MS;
            const nosutits = new Date(nejausaMs(Math.min(minMs, TAGAD_TS - 60 * 1000), TAGAD_TS));
            await con.query(
                'INSERT INTO privata_zina (sutitaja_id, sanemeja_id, saturs, nosutits) VALUES (?, ?, ?, ?)',
                [lietotajuId[z.sutitajs], lietotajuId[z.sanemejs], z.saturs, mysqlDatums(nosutits)]
            );
        }

        console.log('Pievienojam paziņojumus...');
        await con.query(
            `INSERT INTO pazinojums (sanemeja_id, tips, teksts, avota_tips, avota_id) VALUES (?, 'sistemas', ?, NULL, NULL)`,
            [lietotajuId.anna, JSON.stringify({ key: 'pazinojumi.system_welcome' })]
        );

        console.log('Pievienojam audita ierakstu...');
        await con.query(
            `INSERT INTO audita_zurnals (lietotajs_id, darbiba, objekta_tips, objekta_id, detalas) VALUES (?, ?, NULL, NULL, ?)`,
            [lietotajuId.admin, 'sistemas_inicializesana', 'Datu bāze inicializēta ar paraugu datiem.']
        );

        console.log(`\nGatavs! Pievienoti ${LIETOTAJI.length} lietotāji, ${IERAKSTI.length} ieraksti, ${KOMENTARI.length} komentāri.`);
        console.log(`Visi konti izmanto paroli: ${PAROLE}`);
        console.log('\nLietotāji:');
        Object.keys(lietotajuId).forEach((v) => console.log('  - ' + v));
    } finally {
        con.release();
        await db.end();
    }
}

palaist().catch((kluda) => {
    console.error('Kļūda inicializējot datus:', kluda);
    process.exit(1);
});
