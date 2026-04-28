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
lietotāju darbības, izmantojot relāciju datu bāzi, kas glabā ierakstus, komentārus,
privātās ziņas, paziņojumus, kategorijas un audita ierakstus.

## Galvenā funkcionalitāte

- Reģistrācija, autentifikācija un sesiju pārvaldība (parole tiek glabāta `bcrypt` formā).
- Trīs lietotāju lomas — viesis, reģistrēts lietotājs, administrators.
- Ierakstu apskate, meklēšana pēc atslēgvārda, filtrēšana pēc kategorijas, kārtošana
  (jaunākie, vecākie, populārākie, alfabētiski) un lappuses (10 ieraksti uz lapu).
- Ierakstu izveide, rediģēšana, dzēšana un statusa maiņa (melnraksts/publicēts/slēgts).
- Komentāru pievienošana, dzēšana un moderēšana.
- Privāto ziņu apmaiņa starp diviem reģistrētiem lietotājiem ar sarunu skatu.
- Paziņojumi par jauniem komentāriem un privātajām ziņām, ar nelasīto skaitītāju navigācijā.
- Profila datu pārvaldība (apraksts un paroles maiņa) un publiskais lietotāja profils
  ar viņa pēdējiem ierakstiem.
- AI asistents teksta uzlabošanai un virsraksta ieteikšanai (Anthropic Claude API,
  ar lokālu rezerves variantu, ja API atslēga nav konfigurēta).
- Administrācijas panelis: pārskats ar statistiku, lietotāju pārvaldība (bloķēšana,
  lomu maiņa), satura moderēšana (ierakstu un komentāru paslēpšana / dzēšana),
  kategoriju pārvaldība un audita žurnāls.

## Datu bāzes tabulas

Datu bāze sastāv no **7 tabulām**:

1. `lietotajs` — lietotāju konti, lomas un statuss.
2. `kategorija` — tematiskās sadaļas.
3. `ieraksts` — foruma ieraksti.
4. `komentars` — komentāri par ierakstiem.
5. `privata_zina` — privātās ziņas starp lietotājiem.
6. `pazinojums` — sistēmas paziņojumi par notikumiem.
7. `audita_zurnals` — administrācijas darbību žurnāls.

Ārējās atslēgas, unikālie ierobežojumi (`lietotajvards`, `epasts`, `kategorija.nosaukums`),
`CHECK` ierobežojumi (`secibas_nr >= 0`, `sutitaja_id <> sanemeja_id`) un statusu
`ENUM` lauki nodrošina entītiju, referenču un domēnu integritāti.

## Izmantotie izstrādes rīki un tehnoloģijas

| Slānis | Tehnoloģija |
|---|---|
| Izpildvide | Node.js (≥ 18) |
| Tīmekļa ietvars | Express 4 |
| Veidnes | EJS |
| Datu bāze | MySQL / MariaDB ar `mysql2` draiveri (savienojumu kopa, sagatavoti vaicājumi) |
| Autentifikācija | `express-session`, `bcrypt` (12 raundi), `connect-flash` paziņojumiem |
| Stili | Tīrs CSS (CSS mainīgie, atbalstīts gaišais un tumšais režīms) |
| AI | Anthropic Claude API (`claude-haiku-4-5`) ar lokālu rezerves variantu |
| PWA | `manifest.json`, Service Worker (offline cache app shell) |
| Testēšana | Node.js iebūvētais `node:test` runner |

## Sistēmas palaišanas instrukcija

### 1. Priekšnosacījumi

- Node.js 18 vai jaunāks (`node -v`).
- MySQL 8 vai MariaDB 10.4+.

### 2. Atkarību instalēšana

```
npm install
```

### 3. Vides mainīgo konfigurēšana

Nokopējiet `.env.example` uz `.env` un norādiet datu bāzes savienojuma datus un
sesijas noslēpumu:

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=...
DB_NAME=forums
SESSION_SECRET=parmainit-uz-savu-noslepumu
ANTHROPIC_API_KEY=          # neobligāts: ja tukšs, AI asistents strādā lokāli
```

### 4. Datu bāzes izveide

Izveidojiet datu bāzi un palaidiet shēmu:

```sql
CREATE DATABASE forums CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```
mysql -u root -p forums < sql/schema.sql
```

### 5. Paraugu datu pievienošana (neobligāti)

```
npm run seed
```

Skripts pievienos 5 lietotājus, 5 kategorijas, 12 ierakstus, 12 komentārus un
dažas privātās ziņas. Visu testa kontu parole ir `Parole123`.

### 6. Servera palaišana

```
npm start
```

vai izstrādes režīmā ar automātisku pārstartēšanu:

```
npm run dev
```

Vietne būs pieejama: <http://localhost:3000>.

## Testa konti pēc seed skripta

| Lietotājvārds | Loma | Parole |
|---|---|---|
| `admin` | administrators | `Parole123` |
| `anna` | lietotajs | `Parole123` |
| `janis` | lietotajs | `Parole123` |
| `liga` | lietotajs | `Parole123` |
| `martins` | lietotajs | `Parole123` |

## Testēšana

Vienības testi validācijas funkcijām:

```
npm test
```

Manuālie testēšanas gadījumi (vismaz 5, atbilstoši darba prasībām) ir aprakstīti
[tests/test-cases.md](tests/test-cases.md):

1. Lietotāja reģistrācija ar derīgiem datiem
2. Pieslēgšanās ar nepareizu paroli
3. Ieraksta izveide ar tukšu virsrakstu (validācija)
4. Ierakstu meklēšana un filtrēšana pēc kategorijas
5. Administratora satura moderēšana (komentāra paslēpšana)
6. Privātās ziņas nosūtīšana (papildu)

## Drošība (OWASP)

- Paroles glabājas tikai kā `bcrypt` jaucējkods (12 raundi).
- Pieprasījumiem ar lietotāju ievadi izmantoti **sagatavoti vaicājumi** (parametrizēti),
  tādējādi novēršot SQL injekciju.
- EJS pēc noklusējuma ekranē mainīgos (`<%= %>`), kas pasargā no XSS.
- Sesijas sīkdatne ir `httpOnly` un `sameSite=lax`; pēc pieslēgšanās tiek izsaukts
  `req.session.regenerate`, lai novērstu sesiju fiksāciju.
- Lomu un autora pārbaudes ir realizētas servera pusē — klienta puses pārbaudes ir
  tikai uzlabojums lietotāja pieredzei.
- Statuss `blokets` neļauj pieslēgties; bloķētam lietotājam nevar nosūtīt privātas ziņas.

## Pieejamība (WCAG)

- Semantiska HTML struktūra (`<header>`, `<nav>`, `<main>`, `<footer>`, `<article>`).
- Augšlēkšanas saite (skip link) uz galveno saturu.
- `aria-label` atribūti navigācijai un meklēšanas formām, `aria-current` aktīvajām
  lapas saitēm, `aria-live` AI asistenta statusa atjauninājumiem.
- Visiem ievades laukiem ir saistītas etiķetes (`<label for>`); palīginstrukcijas
  pieejamas pa `aria-describedby`.
- Saskatāmības kontrasts atbilst AA līmenim; atbalstīts gan gaišais, gan tumšais
  sistēmas režīms (`prefers-color-scheme`).
- `prefers-reduced-motion` izslēdz animācijas, ja lietotājs to vēlas.
- Visas darbības ir pieejamas no klaviatūras, fokusa indikators ir redzams.

## PWA

- `manifest.json` — vārds, ikonas (SVG), tēmas krāsa, displeja režīms `standalone`,
  saīsnes uz biežāk izmantotajām lapām.
- Service Worker (`/sw.js`):
    - Pirmajā instalēšanā keš lapā saglabā lapas korpusu (CSS, JS, manifestu, ikonu).
    - HTML pieprasījumiem - `network-first` ar atgriešanos uz kešu, ja nav tīkla.
    - Statiskām vietām - `cache-first`.
- Aplikācija ir uzstādāma kā mobilā / desktop aplikācija no Chromium tipa pārlūkiem.

## Projekta struktūra

```
forum/
├── config/
│   └── db.js                    # MySQL savienojumu kopa
├── middleware/
│   └── auth.js                  # autorizācijas un lomu pārbaude
├── public/                      # statiskās vietas
│   ├── css/style.css
│   ├── js/app.js
│   ├── icons/
│   ├── manifest.json
│   └── sw.js
├── routes/                      # Express maršrutētāji
│   ├── auth.js                  # /registreties, /pieslegties, /iziet
│   ├── kategorijas.js
│   ├── ieraksti.js              # ieraksti + komentāru pievienošana
│   ├── komentari.js             # komentāru dzēšana
│   ├── zinas.js                 # privātās ziņas
│   ├── pazinojumi.js
│   ├── profils.js               # autorizēta lietotāja profils
│   ├── lietotaji.js             # publiskais profils
│   ├── ai.js                    # AI asistents
│   └── admin.js                 # administrācijas panelis
├── scripts/
│   └── seed.js                  # paraugu datu pievienošana
├── sql/
│   └── schema.sql               # datu bāzes shēma (7 tabulas)
├── tests/
│   ├── validacija.test.js       # vienības testi (node:test)
│   └── test-cases.md            # manuālie testēšanas gadījumi
├── utils/
│   ├── format.js                # datuma, ekranēšanas un saīsināšanas palīgi
│   └── validacija.js            # serverpuses validācija
├── views/                       # EJS veidnes
│   ├── partials/                # galva, kājene
│   ├── auth/, ieraksti/, kategorijas/, komentari/, zinas/, pazinojumi/,
│   ├── profils/, lietotaji/, admin/
│   ├── home.ejs
│   └── error.ejs
├── server.js                    # aplikācijas ieejas punkts
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Licence

Akadēmisks darbs Rīgas Valsts Tehnikuma vajadzībām.
