# Vienota tiessaistes kopienu foruma platforma

Noslēguma darbs modulim **"Datu bāzu programmēšana"**.

- **Autors:** Alberts Lipšans
- **Skola:** Rīgas Valsts Tehnikums, Datorikas nodaļa
- **Programma:** Programmēšana
- **Mācību gads:** 2025./2026.

## Apraksts

Tīmekļa vietne — tiešsaistes kopienas forums, kas nodrošina ērtu, strukturētu un
lietotājiem pārskatāmu vidi savstarpējai komunikācijai, informācijas apmaiņai un
tematisko diskusiju organizēšanai. Sistēma centralizēti pārvalda foruma saturu un
lietotāju darbības, izmantojot relāciju datu bāzi, kas glabā lietotājus, kategorijas,
ierakstus, komentārus, balsojumus, privātās ziņas, paziņojumus, paroles atjaunošanas
žetonus, AI pieprasījumu žurnālu, atbalsta dienesta saraksti un audita ierakstus.

## Lietotāju lomas

Sistēmā ir definētas trīs lietotāju lomas. Katrai lomai ir savs pieejamo darbību kopums,
ko nodrošina servera puses autorizācijas pārbaudes (`middleware/auth.js`).

### Viesis (nereģistrēts apmeklētājs)

- Skatīt sākumlapu, kategoriju sarakstu un visus publicētos ierakstus
- Meklēt ierakstus pēc atslēgvārda, filtrēt pēc kategorijas, kārtot pēc datuma /
  populāra / balsoju / alfabēta
- Skatīt ieraksta detalizētu skatu un komentāru pavedienus (lasīšanas režīmā)
- Skatīt publiskos lietotāju profilus
- Atvērt atbalsta formu un nosūtīt ziņojumu (lieto IP rate limit)
- Mainīt valodu un tēmu

### Reģistrēts lietotājs

Manto visas viesa iespējas un papildus var:

- Izveidot, rediģēt, dzēst savus ierakstus (statusi: melnraksts / publicēts / slēgts)
- Pievienot komentārus un atbildes uz citiem komentāriem (neierobežota dziļuma
  pavedieni datu bāzē, vizuāli ar ievilkumu)
- Dzēst savus komentārus
- Balsot par citu lietotāju ierakstiem (vienreiz, atkārtota nospiešana noņem balsi)
- Veidot jaunas kategorijas (limitēts uz 3 dienā)
- Sūtīt un saņemt privātās ziņas
- Saņemt paziņojumus (komentāru, ziņu, atbildes, atbalsta atbildes)
- Pārvaldīt savu profilu, mainīt aprakstu un paroli
- Atjaunot paroli pa e-pastu, ja tā ir aizmirsta
- Izmantot AI asistentu ieraksta teksta uzlabošanai un virsraksta ierosināšanai
  (limitēts uz 10/min un 80/dien)
- Sūtīt un izsekot savus atbalsta pieprasījumus

### Administrators

Manto visas reģistrēta lietotāja iespējas un papildus iegūst pieeju `/admin` panelim:

- **Pārskats** – sistēmas statistika (lietotāji, ieraksti, komentāri, kategorijas,
  privātās ziņas), populārākie un jaunākie ieraksti, pēdējās administrācijas darbības
- **Lietotāji** – meklēšana, kārtošana, statusa maiņa (`aktīvs`/`bloķēts`/`neaktīvs`),
  lomas piešķiršana / noņemšana
- **Kategorijas** – izveide, rediģēšana, deaktivēšana, dzēšana, kārtošana pēc katras
  kolonnas
- **Saturs** – ierakstu un komentāru moderēšana (paslēpšana, slēgšana, dzēšana)
- **Atbalsts** – atbalsta dienesta uzdotie pieprasījumi, atbildes pa e-pastu un
  iekšējiem paziņojumiem
- **AI žurnāls** – visu AI pieprasījumu pārskats ar filtriem un statistiku
- **Audita žurnāls** – visu administratīvo darbību hronoloģisks žurnāls ar filtriem

## Datu bāzes shēma

Datu bāze sastāv no **11 tabulām** ar pilnīgu referenciālo integritāti
(`InnoDB` dzinējs, `utf8mb4_unicode_ci` salīdzināšana).

| Nr. | Tabula | Apraksts |
|---:|---|---|
| 1 | `lietotajs` | Lietotāju konti — lietotājvārds, e-pasts, `bcrypt` paroles hash, loma, statuss, profila apraksts, reģistrācijas datums |
| 2 | `kategorija` | Tematiskās sadaļas — nosaukums, apraksts, secības numurs, aktivitātes statuss |
| 3 | `ieraksts` | Foruma ieraksti — autors, kategorija, virsraksts, saturs, statuss (`melnraksts`/`publicēts`/`slēgts`), izveidots, atjaunots |
| 4 | `komentars` | Ierakstu komentāri ar pašatsauci `vecaks_komentars_id` (atbildēs) un statusu `redzams`/`paslēpts` |
| 5 | `balsojums` | Lietotāju balsojumi par ierakstiem (unikāls (`ieraksts_id`, `lietotajs_id`) — viens balsojums uz lietotāju) |
| 6 | `privata_zina` | Privātās ziņas starp diviem lietotājiem ar lasīšanas atzīmi |
| 7 | `pazinojums` | Sistēmas paziņojumi (komentāri, privātās ziņas, atbalsts) ar avota tipa atsauci |
| 8 | `paroles_atjaunosanas` | Paroles atjaunošanas žetoni — SHA-256 hash, derīguma termiņš, izmantošanas atzīme |
| 9 | `ai_pieprasijums` | AI pieprasījumu žurnāls — autors, darbība, ievades fragments, izvades garums, avots (`claude`/`lokala`/`limits`/`kluda`) |
| 10 | `atbalsta_zinojums` | Atbalsta dienesta pieprasījumi un atbildes ar statusu `jauns`/`atbildets`/`aizverts` |
| 11 | `audita_zurnals` | Visu administratīvo darbību hronoloģisks žurnāls |

### Datu integritātes mehānismi

- **Entītiju integritāte** — katrai tabulai `AUTO_INCREMENT` primārās atslēgas
- **Referenču integritāte** — ārējās atslēgas ar piemērotām `ON DELETE` /
  `ON UPDATE` stratēģijām (piem., `lietotajs` dzēšana kaskadē uz `pazinojums`,
  bet `RESTRICT` uz `ieraksts`)
- **Unikalitātes ierobežojumi** — `lietotajvards`, `epasts`, `kategorija.nosaukums`,
  paroles atjaunošanas žetona hash, balsojuma pāra `(ieraksts_id, lietotajs_id)`
- **Domēnu integritāte** — `ENUM` tipi statusiem un lomām, `BOOLEAN` aktivitātēm,
  `CHECK` ierobežojumi (`secibas_nr >= 0`, `sutitaja_id <> sanemeja_id`)

## Galvenā funkcionalitāte

### CRUD operācijas pa entītijām

| Entītija | Izveide | Lasīšana | Rediģēšana | Dzēšana |
|---|---|---|---|---|
| Ieraksti | `POST /ieraksti` | `GET /ieraksti`, `GET /ieraksti/:id` | `POST /ieraksti/:id` | `POST /ieraksti/:id/dzest` |
| Komentāri | `POST /ieraksti/:id/komentari` | iekļauti ieraksta skatā | – | `POST /komentari/:id/dzest` |
| Kategorijas | `POST /kategorijas/jauna` (lietotājs), `POST /admin/kategorijas` (admin) | `GET /kategorijas` | `POST /admin/kategorijas/:id` | `POST /admin/kategorijas/:id/dzest` |
| Privātās ziņas | `POST /zinas` | `GET /zinas/:lietotajsId` | – | – |
| Profila apraksts | – | `GET /profils` | `POST /profils` | – |
| Parole | – | – | `POST /profils/parole` vai `POST /atjaunot-paroli/:zetons` | – |
| Atbalsta pieprasījumi | `POST /atbalsts` | `GET /atbalsts/:id` | `POST /admin/atbalsts/:id/atbilde` | `POST /admin/atbalsts/:id/aizvert` |
| Balsojumi | `POST /ieraksti/:id/balsot` (toggle) | iekļauts ieraksta skatā | – | (toggle) |

### Ierakstu kārtošana, filtrēšana, meklēšana

Ierakstu sarakstā (`/ieraksti`) ir vienota meklēšanas forma ar šādiem laukiem,
ko var brīvi kombinēt:

- **Meklēšana** pēc atslēgvārda virsrakstā vai saturā (`LIKE %...%`)
- **Kategorija** — atlase pēc tematiskās sadaļas
- **Autors** — daļēja sakritība pēc lietotājvārda (`LIKE %...%`)
- **Datumu diapazons** — `no datuma` un `līdz datumam` (HTML5 `<input type="date">`)
- **Kārtošana** pēc piecām opcijām:
    - Jaunākie (`izveidots DESC`)
    - Vecākie (`izveidots ASC`)
    - Visvairāk balsotie (`balsu_skaits DESC`)
    - Visvairāk komentētie (`komentaru_skaits DESC`)
    - Alfabētiski (`virsraksts ASC`)
- **Lapas dalījums** pa 10 / 20 / 50 (lietotāja izvēle iestatījumos)

Filtru loģika ir pilnībā izolēta `utils/postFilters.js` modulī un atsevišķi
testēta (skat. `tests/postFilters.test.js`). Visi parametri tiek nodoti caur
sagatavotiem vaicājumiem — neviens lietotāja ievadītais teksts neparādās SQL
virknes interpolācijā. Datumi tiek apstiprināti ar stingru `YYYY-MM-DD`
regulāro izteiksmi pirms tie tiek izmantoti vaicājumā.

### Administratīvās tabulas — kārtojamās kolonnas

Visas administrācijas tabulas izmanto vienoto `sortLink()` palīgfunkciju
([utils/sort.js](utils/sort.js)). Klikšķis uz kolonnas virsraksta sakārto pēc
tās; atkārtots klikšķis maina virzienu (`▲` / `▼`).

| Tabula | Kolonnas, pa kurām var kārtot |
|---|---|
| Lietotāji | id, lietotājvārds, e-pasts, loma, statuss, reģistrācijas datums, ierakstu skaits |
| Kategorijas | id, nosaukums, apraksts, secības numurs, aktīva, ierakstu skaits |
| Ieraksti (admin) | id, virsraksts, autors, kategorija, statuss, datums |
| Komentāri (admin) | id, teksts, autors, ieraksts, statuss, datums |
| Atbalsta pieprasījumi | id, sūtītāja vārds, e-pasts, tēma, statuss, datums |
| AI žurnāls | id, datums, lietotājs, darbība, ievades garums, avots |
| Audita žurnāls | id, datums, lietotājs, darbība |

### Statistika un agregācija

Administrācijas pārskata lapa (`/admin`) demonstrē vairākus agregātos vaicājumus:

- Kopējais lietotāju, aktīvo lietotāju, ierakstu, publicētu ierakstu, komentāru,
  kategoriju un privāto ziņu skaits (`COUNT` skenējumi)
- Ieraksti pa kategorijām (`GROUP BY` ar `LEFT JOIN`)
- 5 populārākie ieraksti (sakārtoti pēc komentāru skaita ar apakšvaicājumu)
- 5 jaunākie ieraksti
- 10 pēdējās administratīvās darbības (`audita_zurnals`)

AI žurnāla lapa (`/admin/ai-zurnals`) papildina ar:

- Pieprasījumu kopējo skaitu un sadalījumu pa avotiem (`claude` / `lokala` /
  `limits`)
- Pieprasījumu skaitu pēdējā stundā un dienā
- 10 aktīvākajiem AI lietotājiem pēdējās 7 dienās

## Izmantotie izstrādes rīki un tehnoloģijas

| Slānis | Tehnoloģija |
|---|---|
| Izpildvide | Node.js (≥ 18) |
| Tīmekļa ietvars | Express 4 |
| Veidnes | EJS (servera puses renderēšana, atkārtoti izmantojamas partial veidnes) |
| Datu bāze | MySQL 8 / MariaDB ar `mysql2` draiveri (savienojumu kopa, sagatavoti vaicājumi) |
| Autentifikācija | `express-session`, `bcrypt` (12 raundi), `connect-flash` paziņojumiem |
| E-pasts | `nodemailer` (SMTP, ar dev-rezīma izvadi konsolē, ja nav konfigurēts) |
| AI | Anthropic Claude API (`claude-haiku-4-5`) ar lokālu rezerves variantu |
| Stili | Tīrs CSS (CSS mainīgie, gaišā / tumšā / sistēmas tēma) |
| PWA | `manifest.json`, Service Worker (offline cache app shell) |
| Internacionalizācija | Pielāgota `t()` palīgfunkcija ar JSON tulkojumu failiem (LV/EN/RU) |
| Testēšana | Node.js iebūvētais `node:test` runner |

## Sistēmas palaišanas instrukcija

### 1. Priekšnosacījumi

- Node.js 18 vai jaunāks (`node -v`)
- MySQL 8 vai MariaDB 10.4+ (XAMPP der izcili)

### 2. Atkarību instalēšana

```
npm install
```

### 3. Vides mainīgo konfigurēšana

Nokopējiet `.env.example` uz `.env` un norādiet datu bāzes savienojuma datus,
sesijas noslēpumu un (neobligāti) AI / SMTP konfigurāciju:

```
PORT=3000
BASE_URL=
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=forums
SESSION_SECRET=parmainit-uz-savu-noslepumu

ANTHROPIC_API_KEY=          # neobligāts: ja tukšs, AI strādā lokālā fallback režīmā
SUPPORT_EMAIL=
SMTP_HOST=                  # neobligāts: ja tukšs, e-pasti tiek izvadīti konsolē
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### 4. Datu bāzes izveide

```sql
CREATE DATABASE forums CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```
mysql -u root -p forums < sql/schema.sql
```

Ja jums jau ir vecāka shēmas versija, palaidiet migrācijas no
`sql/migrations/` mapes secīgā kārtībā (atjauno tikai izmaiņu daļu, esošos
datus saglabā).

### 5. Paraugu datu pievienošana (neobligāti)

```
npm run seed
```

Skripts pievienos 13 lietotājus (LV, EN, RU vārdiem), 5 kategorijas, 24
ierakstus, vairāk nekā 30 komentāru un dažas privātās ziņas. Visu testa
kontu parole ir `Parole123`. Datumi tiek randomizēti starp 2026-04-20 00:00
un palaišanas laiku.

### 6. Servera palaišana

```
npm start          # standarta palaišana
npm run dev        # ar automātisku pārstartēšanu (--watch režīms)
```

Vietne būs pieejama: <http://localhost:3000>.

## Testa konti pēc seed skripta

| Lietotājvārds | Loma | Parole |
|---|---|---|
| `admin` | administrators | `Parole123` |
| `anna`, `janis`, `liga`, `martins` | lietotajs | `Parole123` |
| `john_smith`, `mary_jones`, `alex_walker`, `sarah_brown` | lietotajs | `Parole123` |
| `dmitry`, `olga`, `sergey`, `natalia` | lietotajs | `Parole123` |

## Testēšana

Automatiskie vienības testi:

```
npm test
```

41 testi 4 failos, kas pierāda drošības un filtrēšanas pareizību:

- [tests/validacija.test.js](tests/validacija.test.js) — 10 testi: visu validācijas funkciju robežgadījumi (paroles spēks, paroļu sakritība, ieraksta lauku robežas, komentāra garums, kategoriju, ziņu validācija)
- [tests/rateLimiter.test.js](tests/rateLimiter.test.js) — 5 testi: rate limita robeža netiek pārkāpta zem limita, retryAfterSec aprēķins, vairāku limitu kombinācija, dažādas atslēgas tiek izolētas, slīdošā loga laika logs
- [tests/csrf.test.js](tests/csrf.test.js) — 9 testi: žetonu ģenerēšana, atkārtota lietošana sesijā, GET izlaišana, POST bez žetona bloķēšana, POST ar nepareizu žetonu bloķēšana, POST ar pareizu žetonu body laukā un x-csrf-token galvenē, JSON atbildes formāts, HTML ekranēšana
- [tests/postFilters.test.js](tests/postFilters.test.js) — 17 testi: tukšs filtrs, atslēgvārds, kategorija, autors, datumu diapazons, visi kombinēti, nederīgu vērtību noraidīšana, **SQL injekcijas mēģinājumi** meklēšanā / kategorijā / datumā tiek nepieļauti

Manuālie testēšanas gadījumi (20 gadījumi) ir aprakstīti
[tests/test-cases.md](tests/test-cases.md).

## Drošība — OWASP Top 10

| OWASP riska kategorija | Risinājums sistēmā |
|---|---|
| **A01 Broken Access Control** | Servera puses lomu un autorības pārbaudes katrā maršrutā (`pieprasitAutorizaciju`, `pieprasitAdministratoru`). Klienta puses pārbaudes ir tikai UX, nevis drošības līmenī. |
| **A02 Cryptographic Failures** | Paroles glabājas tikai kā `bcrypt` jaucējkods (12 raundi). Paroles atjaunošanas žetoni glabāti kā SHA-256 hash. Sesijas sīkdatne `httpOnly` un `sameSite=lax`. |
| **A03 Injection** | Visi SQL vaicājumi izmanto **sagatavotos vaicājumus** (`mysql2` `?` placeholderi). EJS pēc noklusējuma ekranē mainīgos (`<%= %>`), kas pasargā no XSS. |
| **A04 Insecure Design** | Atsevišķas validācijas funkcijas katrai entītijai ([utils/validacija.js](utils/validacija.js)). Validācija atgriež atslēgas, nevis tekstu, lai novērstu tulkošanas dublēšanos. |
| **A05 Security Misconfiguration** | `.env` neglabā kodā, ir `.gitignore` izņēmumā. **Helmet** uzliek pilnu HTTP drošības galveņu kopumu (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Cross-Origin-*); HSTS automātiski tikai produkcijā. **`SESSION_SECRET` ir obligāts** — serveris atsakās startēt, ja tas nav iestatīts vai īsāks par 32 simboliem. Atsevišķi seed dati ar pilnu paraugu kopu. |
| **A06 Vulnerable Components** | Atkarību saraksts ir apzināts un minimāls. `package.json` fiksētas versijas ar `^` augšējo robežu. |
| **A07 Auth Failures** | Pieslēgšanās rate limit (5 mēģinājumi 15 min), paroles atjaunošanas rate limit (3 stundā), CSRF aizsardzība uz visām POST formām, sesijas regenerēšana pēc pieslēgšanās. |
| **A08 Data Integrity Failures** | Datu bāzē izpildi unikalitātes un ārējās atslēgas, atjaunošanas žetoni vienreizēji. |
| **A09 Logging Failures** | Audita žurnāls visām administratīvajām darbībām, AI pieprasījumu žurnāls, atbalsta sarakste glabājas DB. |
| **A10 SSRF** | Vienīgais ārējais HTTP izsaukums ir uz Anthropic API (fiksēts URL, nav lietotāja kontrolēta), e-pastu sūtīšana ir tikai uz konfigurēto SMTP. |

### Rate limit politika

Visu rate limitu īsteno [utils/rateLimiter.js](utils/rateLimiter.js)
ar slīdošā loga algoritmu atmiņā.

| Darbība | Atslēga | Limits |
|---|---|---|
| AI pieprasījumi | lietotājs | 10 / min, 80 / dien |
| Atbalsta pieprasījumi | lietotājs vai IP | 3 / 10 min, 10 / dien |
| Paroles atjaunošana | IP+e-pasts | 3 / 30 min, 10 / dien |
| Pieslēgšanās mēģinājumi | IP | 5 / 15 min |
| Lietotāja kategoriju veidošana | lietotājs | 3 / dien |

## Pieejamība — WCAG 2.1 AA

- **Semantiska HTML struktūra** — `<header>`, `<nav>`, `<main>`, `<footer>`,
  `<article>`, `<section>` semantiskie tagi visās lapās
- **"Skip to content" saite** lapas augšā klaviatūras lietotājiem
- **`aria-label`** atribūti navigācijai un meklēšanas formām
- **`aria-current="page"`** aktīvajām saitēm un lappuses navigācijai
- **`aria-live="polite"`** AI asistenta statusa atjauninājumiem
- **`aria-pressed`** tēmas izvēles un balsošanas pogām
- **`aria-sort`** kārtojamām tabulu kolonnām
- **Saistītas etiķetes** visiem ievades laukiem (`<label for>`); palīginstrukcijas
  pa `aria-describedby`
- **Saskatāmības kontrasts** atbilst AA līmenim gan gaišajā, gan tumšajā tēmā
- **`prefers-color-scheme`** atbalsts un manuāla tēmas izvēle iestatījumos
- **`prefers-reduced-motion`** automātiski atspējo animācijas; manuāla iestatījumu
  opcija
- **Klaviatūras navigācija** strādā visās formās un sarakstos; redzams fokusa
  indikators (`outline`)

## PWA — Progresīva tīmekļa aplikācija

- **`manifest.json`** ar nosaukumu, ikonām (SVG, gan parastās, gan `maskable`),
  tēmas krāsu, displeja režīmu `standalone` un saīsnēm uz biežāk izmantotajām
  lapām (Jauns ieraksts, Paziņojumi)
- **Service Worker (`/sw.js`)** ar versiju kontroli kešam:
    - Pirmajā instalēšanā kešo lapas korpusu (CSS, JS, manifest, ikona)
    - HTML pieprasījumiem — `network-first` ar atgriešanos uz kešu, ja nav tīkla
    - Statiskām vietām — `cache-first`
    - Versijas maiņa (`forum-cache-vN`) automātiski izdzēš veco kešu
- **Atbildīga lapas izkārtošana** — strādā uz mobilā tālruņa, planšetes un
  desktop (CSS Grid + Flexbox + media queries)
- **Aplikācija ir uzstādāma** kā mobilā / desktop aplikācija no Chromium tipa
  pārlūkiem (Chrome, Edge, Brave, Opera)

## Internacionalizācija

Sistēma atbalsta trīs valodas pilnā apjomā:

- **Latviešu (lv)** — noklusējuma valoda
- **Angļu (en)**
- **Krievu (ru)**

Tulkojumus glabā `locales/{lv,en,ru}.json` faili. `t('key')` palīgfunkcija
([utils/i18n.js](utils/i18n.js)) atrisina hierarhiskas atslēgas (piem.,
`auth.login_title`). Validācijas un flash ziņojumi tiek atgriezti kā atslēgas
un pārtulkoti veidnē, kas nodrošina tulkojumu konsekvenci.

Valodas izvēle saglabājas sīkdatnē `lang` ar 1 gada derīguma termiņu.
Sākotnējā vērtība tiek noteikta no `Accept-Language` HTTP galvenes.

Notikumu paziņojumi (jauns komentārs, jauna privātā ziņa) tiek glabāti DB kā
JSON ar atslēgu un parametriem, kas ļauj tos parādīt katram lietotājam viņa
izvēlētajā valodā.

## Projekta struktūra

```
forum/
├── config/
│   └── db.js                     MySQL savienojumu kopa
├── locales/
│   ├── lv.json                   latviešu tulkojumi
│   ├── en.json                   angļu tulkojumi
│   └── ru.json                   krievu tulkojumi
├── middleware/
│   └── auth.js                   autorizācijas un lomu pārbaudes
├── public/                       statiskās vietas
│   ├── css/style.css
│   ├── js/app.js
│   ├── icons/                    PWA ikonas (SVG)
│   ├── manifest.json
│   └── sw.js
├── routes/                       Express maršrutētāji
│   ├── auth.js                   /pieslegties, /registreties, /iziet
│   ├── atjaunot.js               paroles atjaunošana
│   ├── kategorijas.js            publiskās kategorijas + lietotāja izveide
│   ├── ieraksti.js               ierakstu CRUD + komentāri + balsojumi
│   ├── komentari.js              komentāru dzēšana
│   ├── zinas.js                  privātās ziņas
│   ├── pazinojumi.js             paziņojumi
│   ├── profils.js                lietotāja profila pārvaldība
│   ├── lietotaji.js              publiskie profili
│   ├── ai.js                     AI asistenta endpoint-i
│   ├── atbalsts.js               atbalsta dienesta forma
│   ├── valoda.js                 valodas pārslēgšana
│   ├── iestatijumi.js            UI iestatījumi
│   └── admin.js                  visi administrācijas maršruti
├── scripts/
│   └── seed.js                   paraugu datu inicializācija
├── sql/
│   ├── schema.sql                pilnā shēma (11 tabulas)
│   └── migrations/               inkrementālās migrācijas
│       ├── 001_atbalsta_zinojums.sql
│       ├── 002_ai_pieprasijums.sql
│       ├── 003_paroles_atjaunosanas.sql
│       └── 004_replies_un_balsojumi.sql
├── tests/
│   ├── validacija.test.js        vienības testi (node:test)
│   └── test-cases.md             manuālie testēšanas gadījumi
├── utils/
│   ├── format.js                 datuma formatēšana, ekranēšana, paziņojumu tulkošana
│   ├── validacija.js             servera puses validācija (atgriež tulkošanas atslēgas)
│   ├── i18n.js                   tulkojumu ielāde un t() palīgfunkcija
│   ├── csrf.js                   CSRF žetonu izveide un validācija
│   ├── rateLimiter.js            slīdošā loga rate limiter
│   ├── sort.js                   tabulu kārtošanas palīgfunkcijas
│   └── epasts.js                 SMTP e-pastu sūtītājs ar dev fallback
├── views/                        EJS veidnes (skat. saraksts zemāk)
├── server.js                     aplikācijas ieejas punkts
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Skatu (`views/`) saraksts

```
views/
├── partials/header.ejs, footer.ejs    kopējās lapas daļas
├── home.ejs                            sākumlapa
├── error.ejs                           kļūdu lapa (404, 403, 500)
├── auth/                               pieslēgšanās un reģistrācija
├── atjaunot/                           paroles atjaunošana
├── kategorijas/                        publiskās un lietotāja kategorijas
├── ieraksti/                           ierakstu saraksts, skats, forma + komentāru pavedieni
├── zinas/                              privātās ziņas
├── pazinojumi/                         paziņojumi
├── profils/                            lietotāja profila pārvaldība
├── lietotaji/                          publiskie lietotāju profili
├── atbalsts/                           atbalsta dienesta forma un skats
├── iestatijumi/                        UI iestatījumi (tēma, valoda, lapas lielums)
└── admin/                              administrācijas panelis (8 lapas + admin nav)
```

## Hostings

Aplikācija ir gatava deploymentam jebkurā Node.js + MySQL hostā (Railway,
Render, Fly.io, Oracle Cloud Free Tier). Kritiski iestatījumi pirms deploya:

- `NODE_ENV=production`
- `BASE_URL=https://your-domain.lv` (paroles atjaunošanas saitēm un canonical URL)
- `SESSION_SECRET` — izveido jaunu garu nejaušu virkni
- `ANTHROPIC_API_KEY` un `SMTP_*` saglabā tikai hostinga vides mainīgajos, nevis
  failā

## Licence

Akadēmisks darbs Rīgas Valsts Tehnikuma vajadzībām.
