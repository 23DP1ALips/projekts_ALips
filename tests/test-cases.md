# Testēšanas gadījumi

Manuālie testēšanas gadījumi sistēmas funkcionalitātes pārbaudei. Atbilst noslēguma
darba prasībām (vismaz 5 testcase) un papildināti ar visu jauno funkciju gadījumiem.

## Lietotāju autentifikācija un autorizācija

### TC-01 — Lietotāja reģistrācija ar derīgiem datiem

**Mērķis:** pārbaudīt veiksmīgu jauna konta izveidi.

**Soļi:**
1. Atveriet `/registreties` (nepieslēgts).
2. Aizpildiet:
    - Lietotājvārds: `parbaudes_lietotajs`
    - E-pasts: `parbaude@example.com`
    - Parole: `Parole123`
    - Atkārtot paroli: `Parole123`
3. Nospiediet **Izveidot kontu**.

**Sagaidāmais rezultāts:** pārvirzīšana uz sākumlapu, veiksmes paziņojums, navigācijā
parādās lietotājvārds. Datu bāzē tabulā `lietotajs` jauns ieraksts ar `loma = 'lietotajs'`,
`statuss = 'aktivs'` un `bcrypt` jaucējkods (sākas ar `$2b$12$`).

---

### TC-02 — Pieslēgšanās ar nepareizu paroli

**Mērķis:** pārbaudīt, ka sistēma neļauj pieslēgties ar nepareizu paroli un nesatur
informāciju, vai bija nepareizs lietotājvārds vai parole (lai nevarētu uzskaitīt, kuri
konti eksistē).

**Soļi:**
1. Atveriet `/pieslegties`.
2. Ievadiet `parbaudes_lietotajs` un nepareizu paroli `nepareizaParole999`.
3. Nospiediet **Pieslēgties**.

**Sagaidāmais rezultāts:** kļūdas paziņojums "Nepareizs lietotājvārds, e-pasts vai
parole." HTTP 401. Sesija netiek izveidota.

---

### TC-03 — Pieslēgšanās rate limit

**Mērķis:** pārbaudīt, ka sistēma neļauj brutālo paroles meklēšanu.

**Soļi:**
1. Atveriet `/pieslegties` un iesniedziet pieslēgšanās formu ar nepareizu paroli
   piecas reizes pēc kārtas.
2. Mēģiniet sesto reizi.

**Sagaidāmais rezultāts:** sestajā mēģinājumā parādās paziņojums "Pārāk daudz
pieslēgšanās mēģinājumu. Mēģiniet pēc N sekundēm." HTTP 429.

---

### TC-04 — Paroles atjaunošana ar e-pasta žetonu

**Mērķis:** pārbaudīt pilnu paroles atjaunošanas plūsmu.

**Soļi:**
1. Atveriet `/aizmirsu-paroli`, ievadiet eksistējoša lietotāja e-pastu, iesniedziet.
2. Atveriet izsaukto e-pastu (vai servera konsoli, ja SMTP nav konfigurēts) un
   iegūstiet atjaunošanas saiti.
3. Atveriet saiti, ievadiet jaunu paroli `JaunaParole456`.
4. Pieslēdzieties ar jauno paroli.

**Sagaidāmais rezultāts:** vecā parole vairs nestrādā, jaunā parole strādā. DB
tabulā `paroles_atjaunosanas` `izmantots = TRUE` pēc atjaunošanas. Saites otrreizēja
atvēršana parāda kļūdu "Atjaunošanas saite nav derīga vai ir izbeigusies."

## Ieraksti, komentāri, balsojumi

### TC-05 — Ieraksta izveide ar tukšu virsrakstu

**Mērķis:** pārbaudīt servera puses validāciju.

**Soļi:**
1. Pieslēdzieties, atveriet `/ieraksti/jauns`.
2. Atstājiet **Virsraksts** tukšu, izvēlieties kategoriju, ievadiet derīgu saturu.
3. Nospiediet **Publicēt**.

**Sagaidāmais rezultāts:** forma atgriežas ar kļūdu pie virsraksta lauka
("Virsrakstam jābūt 4-150 simbolu garam."). HTTP 400. DB jauns ieraksts neparādās.

---

### TC-06 — Ierakstu meklēšana, filtrēšana un kārtošana

**Mērķis:** pārbaudīt vienoto sarakstu funkcionalitāti ar visu filtru kombināciju.

**Soļi:**
1. Atveriet `/ieraksti`.
2. Ievadiet meklēšanas atslēgvārdu, kas ir kāda ieraksta virsrakstā.
3. Atlasiet konkrētu kategoriju.
4. Ievadiet daļēju autora lietotājvārdu.
5. Norādiet datumu diapazonu (no/līdz).
6. Pārslēdziet kārtošanu uz **Visvairāk balsotie**.
7. Nospiediet **Filtrēt**.

**Sagaidāmais rezultāts:** saraksts atspoguļo tikai tos ierakstus, kas vienlaikus
atbilst visiem filtriem (atslēgvārds + kategorija + autors + datums diapazonā),
sakārtoti pēc balsu skaita dilstoši. Ja rezultātu vairāk par 10, parādās lappušu
navigācija. URL satur visus filtra parametrus, un lappušu saites tos saglabā.

---

### TC-06b — SQL injekcijas mēģinājums filtros

**Mērķis:** pārbaudīt, ka filtru parametri ir droši pret SQL injekciju.

**Soļi:**
1. Atveriet `/ieraksti`.
2. Meklēšanas laukā ievadiet `'; DROP TABLE lietotajs; --` un iesniedziet.
3. Datumu laukā mēģiniet ievadīt `2026-04-20'; DROP TABLE--`.
4. Kategorijas atlasi nevar ievadīt manuāli, bet URL var ievadīt `?kategorija=1; DROP TABLE`.

**Sagaidāmais rezultāts:** lapa atgriež tukšu / parastu rezultātu sarakstu, datu
bāzes tabulas paliek neskartas. Filtru testi (`npm test`) tieši pierāda, ka:
- meklēšanas vērtība tiek nodota tikai kā parametrs ar `LIKE %?%`,
- kategorijas filtrs tiek noraidīts, ja `Number()` nedod pozitīvu veselu skaitli,
- datumu filtrs tiek noraidīts, ja neatbilst stingrai `YYYY-MM-DD` regulārajai izteiksmei.

---

### TC-07 — Atbildēšana uz komentāru (pavediens)

**Mērķis:** pārbaudīt komentāru pavedienu darbību.

**Soļi:**
1. Atveriet jebkuru ierakstu kā lietotājs `anna`.
2. Pievienojiet jaunu komentāru.
3. Pieslēdzieties kā cits lietotājs (`janis`), atveriet to pašu ierakstu.
4. Zem `anna` komentāra nospiediet **Atbildēt**, ievadiet atbildi, iesniedziet.
5. Pieslēdzieties kā `anna`.

**Sagaidāmais rezultāts:** atbilde parādās ievelkata zem `anna` oriģinālā komentāra
(ar vertikālo līniju kreisajā pusē). DB ierakstam ir `vecaks_komentars_id` aizpildīts.
`anna` saņem paziņojumu "*janis* pievienoja komentāru jūsu ierakstam." Paziņojumu
panelī (`/pazinojumi`) ir nelasīts ieraksts.

---

### TC-08 — Balsošana par ierakstu

**Mērķis:** pārbaudīt balsojumu sistēmu un ierobežojumus.

**Soļi:**
1. Pieslēdzieties kā `liga`, atveriet `martins` ierakstu.
2. Nospiediet ▲ **Balsot**. Atsvaidziniet lapu.
3. Nospiediet pogu vēlreiz.
4. Atveriet savu ierakstu un mēģiniet balsot.
5. Atveriet `/ieraksti?kartosana=visvairak_balsoti`.

**Sagaidāmais rezultāts:**
- Solis 2: balsu skaits palielinās par 1, poga kļūst zilas (aktīva)
- Solis 3: balss tiek noņemta, skaits samazinās
- Solis 4: poga ir atspējota, parādās paziņojums "Nevarat balsot par savu ierakstu"
- Solis 5: ieraksti sakārtoti pēc balsu skaita dilstoši

DB tabulā `balsojums` UNIQUE ierobežojums neļauj viena lietotāja dubultu balsu.

---

### TC-09 — Lietotāja izveidota kategorija

**Mērķis:** pārbaudīt, ka reģistrēts lietotājs var pievienot savu kategoriju.

**Soļi:**
1. Pieslēdzieties, atveriet `/kategorijas`, nospiediet **Jauna kategorija**.
2. Aizpildiet nosaukumu un aprakstu, iesniedziet.
3. Mēģiniet izveidot 4 kategorijas vienā stundā.

**Sagaidāmais rezultāts:** pirmā kategorija veiksmīgi izveidojas, lietotājs tiek
pārvirzīts uz `/ieraksti/jauns` ar pre-selektētu jauno kategoriju. Pēc 3. kategorijas
ceturtais mēģinājums atgriež "Šodien jau esat izveidojis maksimālo kategoriju skaitu.
Mēģiniet pēc N stundām."

## Privātās ziņas un paziņojumi

### TC-10 — Privātās ziņas nosūtīšana

**Mērķis:** pārbaudīt savstarpējās saziņas funkcionalitāti.

**Soļi:**
1. Pieslēdzies divos pārlūkos (vai inkognito) kā lietotājs A un B.
2. Lietotājs A: `/zinas/jauna`, ievada B lietotājvārdu, sūta ziņu.
3. Lietotājs B: atsvaidzina jebkuru lapu.
4. Lietotājs B: atver `/zinas/<A_id>` un atbild.

**Sagaidāmais rezultāts:**
- B navigācijā pie "Ziņas" parādās nelasīto skaits (1)
- B paziņojumu sarakstā: "*A* nosūtīja jums privātu ziņu."
- Pēc B lapas atvēršanas, ziņa atzīmējas kā izlasīta (`izlasita = TRUE`)
- A pēc atbildes saņem savu paziņojumu

## Profils un iestatījumi

### TC-11 — Profila datu rediģēšana

**Mērķis:** pārbaudīt profila apraksta saglabāšanu.

**Soļi:**
1. Pieslēdzieties, atveriet `/profils`.
2. Ievadiet jaunu aprakstu (≤ 255 simboli), saglabājiet.
3. Atveriet `/lietotaji/<savs_id>` (publiskais profils).

**Sagaidāmais rezultāts:** apraksts ir atjaunināts un parādās gan personīgajā, gan
publiskajā skatā. Veiksmes paziņojums "Profils atjaunots."

---

### TC-12 — Tēmas un valodas pārslēgšana

**Mērķis:** pārbaudīt, ka iestatījumi saglabājas.

**Soļi:**
1. Augšējā stūrī pārslēdziet uz tumšo tēmu (☾) → lapa kļūst tumša.
2. Pārslēdziet valodu uz EN. → visas UI virsraksti pārslēdzas.
3. Atsvaidziniet lapu un atveriet citu lapu.

**Sagaidāmais rezultāts:** abas izvēles saglabājas (tēma `localStorage`, valoda
`lang` sīkdatne). Tumšā tēma piemērojas pirms pirmā paplāksta (no flash) ar `<head>`
inline skriptu.

## AI asistents

### TC-13 — AI teksta uzlabošana

**Mērķis:** pārbaudīt AI integrāciju un valodu noteikšanu.

**Soļi:**
1. Pieslēdzieties, atveriet `/ieraksti/jauns`.
2. Saturā ievadiet īsu tekstu krievu valodā.
3. Nospiediet **Uzlabot tekstu**.
4. Nospiediet **Piemērot saturam**.

**Sagaidāmais rezultāts:** ja `ANTHROPIC_API_KEY` ir konfigurēts, AI atgriež
uzlabotu tekstu krievu valodā (nevis tulko). Status: "Gatavs.". Ja atslēgas nav,
status: "Rezultāts ģenerēts lokāli (bez API)." DB tabulā `ai_pieprasijums` ir jauns
ieraksts ar `avots = 'claude'` vai `'lokala'`.

---

### TC-14 — AI rate limit

**Mērķis:** pārbaudīt, ka brīdinājuma robeža darbojas.

**Soļi:**
1. Pieslēdzieties, nosūtiet 11 AI pieprasījumus pēc kārtas (vienā minūtē).

**Sagaidāmais rezultāts:** 11. pieprasījumam serveris atgriež HTTP 429 ar paziņojumu
"Pārāk daudz AI pieprasījumu. Mēģiniet pēc N sekundēm." DB tabulā `ai_pieprasijums`
parādās ieraksts ar `avots = 'limits'`. Admin AI žurnālā statistika atjaunojas.

## Atbalsts

### TC-15 — Atbalsta pieprasījuma plūsma

**Mērķis:** pārbaudīt visu atbalsta cikla soli — sūtīšana, atbilde, paziņojums.

**Soļi:**
1. Atveriet `/atbalsts` kā lietotājs `anna`.
2. Aizpildiet formu (vārds, e-pasts pre-aizpildīti) un iesniedziet.
3. Pieslēdzieties kā `admin`, atveriet `/admin/atbalsts`.
4. Atveriet pieprasījumu, ierakstiet atbildi, iesniedziet.
5. Pārslēdzieties atpakaļ uz `anna` kontu.

**Sagaidāmais rezultāts:**
- Solis 2: parādās paziņojums "Paldies! Jūsu ziņojums ir nosūtīts atbalsta dienestam."
  `anna` paziņojumu sarakstā parādās "Jūsu atbalsta pieprasījums '...' ir nosūtīts."
  E-pasts tiek nosūtīts uz `SUPPORT_EMAIL` (vai izvadīts servera konsolē).
- Solis 4: pieprasījuma statuss kļūst `atbildets`, audita žurnālā parādās ieraksts.
- Solis 5: `anna` paziņojumu sarakstā parādās "Saņemta atbilde uz jūsu atbalsta
  pieprasījumu '...'."; `anna` arī saņem atbildi pa e-pastu.

## Administrācija

### TC-16 — Administratora satura moderēšana

**Mērķis:** pārbaudīt, ka admin var paslēpt komentāru.

**Soļi:**
1. Kā admin atveriet `/admin/saturs?veids=komentari`.
2. Atrodiet komentāru un nospiediet **Paslēpt**.
3. Izlogojieties un atveriet to pašu ierakstu.

**Sagaidāmais rezultāts:** komentāra statuss DB mainās uz `paslepts`. Audita žurnālā
parādās `mainit_komentara_statusu` darbība. Publiskajā skatā komentārs ir vizuāli
atšķirts ("(Komentārs paslēpts)" piezīme), un komentāru kopskaits nepārsniedz aktīvos.

---

### TC-17 — Lietotāja bloķēšana

**Mērķis:** pārbaudīt, ka admin var bloķēt lietotāju, un ka bloķēts lietotājs
nevar pieslēgties.

**Soļi:**
1. Kā admin atveriet `/admin/lietotaji`, atrodiet lietotāju, nospiediet **Bloķēt**.
2. Mēģiniet pieslēgties kā šis lietotājs.

**Sagaidāmais rezultāts:** lietotāja statuss DB ir `blokets`. Pieslēgšanās mēģinājums
neizdodas ar paziņojumu "Konts ir bloķēts vai neaktīvs." HTTP 403.

---

### TC-18 — Tabulu kārtošanas funkcija

**Mērķis:** pārbaudīt vienoto kārtošanas mehānismu.

**Soļi:**
1. Kā admin atveriet `/admin/lietotaji`.
2. Klikšķiniet uz "Lietotājvārds" virsraksta kolonnā.
3. Klikšķiniet vēlreiz.
4. Klikšķiniet uz "Reģistrēts".
5. Veiciet meklēšanu, tad klikšķiniet uz kolonnas.

**Sagaidāmais rezultāts:**
- Solis 2: lietotāji sakārtoti A→Z, parādās ▲
- Solis 3: lietotāji sakārtoti Z→A, parādās ▼
- Solis 4: pārslēgšanās uz citu kolonnu, sākotnēji A→Z (jauna kolonna)
- Solis 5: kārtošana saglabā meklēšanas filtru (URL satur abus parametrus)

## Drošība

### TC-19a — Helmet drošības galvenes

**Mērķis:** pārbaudīt, ka Helmet uzliek drošības galvenes uz katru atbildi.

**Soļi:**
1. Atveriet jebkuru lapu (piem., `/`).
2. Pārlūka DevTools → Network → izvēlieties HTML pieprasījumu → Headers.

**Sagaidāmais rezultāts:** atbildē ir šādas galvenes:
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` (vai `frame-ancestors 'none'` no CSP)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: off`

---

### TC-19b — Obligāts SESSION_SECRET

**Mērķis:** pārbaudīt, ka serveris atsakās startēt ar nedroša noklusējuma noslēpumu.

**Soļi:**
1. Pagaidu `.env` rezerves kopija.
2. `.env` ielieciet `SESSION_SECRET=` (tukšs) vai `SESSION_SECRET=mainit-uz-savu-noslepumu`.
3. Mēģiniet startēt: `npm start`.
4. Atjaunojiet īsto `SESSION_SECRET` un mēģiniet vēlreiz.

**Sagaidāmais rezultāts:** 3. solis — process izbeidzas ar exit kodu 1 un izprintē
kļūdu "FATAL: SESSION_SECRET environment variable is required and must be at least 32
characters." 4. solī serveris startē normāli.

---

### TC-19 — CSRF aizsardzība

**Mērķis:** pārbaudīt, ka CSRF aizsardzība bloķē viltotos pieprasījumus.

**Soļi:**
1. Pieslēdzieties.
2. Pārlūka konsolē izpildiet:
   ```js
   fetch('/profils', {
       method: 'POST',
       headers: { 'content-type': 'application/x-www-form-urlencoded' },
       body: 'profila_apraksts=ATTACK',
   }).then(r => console.log(r.status));
   ```

**Sagaidāmais rezultāts:** atbilde — HTTP 403, profila apraksts DB nemainās.
Pareizās formas iesniegumi (no UI) saturēs `_csrf` lauku un strādās normāli.

---

### TC-20 — SQL injekcijas aizsardzība

**Mērķis:** pārliecināties, ka sagatavotie vaicājumi neļauj injekciju.

**Soļi:**
1. Atveriet `/ieraksti`, meklēšanas laukā ievadiet:
   ```
   '; DROP TABLE lietotajs; --
   ```
2. Iesniedziet.

**Sagaidāmais rezultāts:** lapa atgriežas bez ierakstiem (jo neviens neatbilst
vienkāršam tekstam), DB tabulas paliek neskartas. Vaicājumā teksts ir kā
parametrizēts arguments, nevis SQL kods.

## Automātiskie vienības testi

```
npm test
```

palaiž `tests/validacija.test.js` testus, kas pārbauda visu validācijas funkciju
uzvedību (paroles spēks, paroļu sakritība, ieraksta lauku robežas, komentāra
garums, kategoriju, ziņu, AI lauku validācija). Pašlaik 10 testi.
