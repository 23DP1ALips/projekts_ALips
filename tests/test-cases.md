# Testēšanas gadījumi

Manuālie testēšanas gadījumi atbilstoši noslēguma darba prasībām (uzrakstīt vismaz 5 testcase).

## TC-01 — Lietotāja reģistrācija ar derīgiem datiem

**Mērķis:** Pārbaudīt, ka jauns lietotājs var veiksmīgi reģistrēties.

**Sākotnējie nosacījumi:** Vietne ir palaista, lietotājs nav pieslēdzies.

**Soļi:**
1. Atveriet `/registreties`.
2. Aizpildiet laukus:
    - Lietotājvārds: `parbaudes_lietotajs`
    - E-pasts: `parbaude@example.com`
    - Parole: `Parole123`
    - Atkārtot paroli: `Parole123`
3. Nospiediet pogu **Izveidot kontu**.

**Sagaidāmais rezultāts:** Lietotājs tiek pārvirzīts uz sākumlapu, augšpusē redz veiksmes paziņojumu, navigācijā parādās viņa lietotājvārds. Datu bāzē tabulā `lietotajs` parādās jauns ieraksts ar `loma = 'lietotajs'` un `paroles_hash` (nav glabāta atklātā tekstā).

---

## TC-02 — Pieslēgšanās ar nepareizu paroli

**Mērķis:** Pārbaudīt, ka sistēma neļauj pieslēgties ar nepareizu paroli un nesatur informāciju, vai bija nepareizs lietotājvārds vai parole.

**Sākotnējie nosacījumi:** Datu bāzē ir lietotājs `parbaudes_lietotajs`.

**Soļi:**
1. Atveriet `/pieslegties`.
2. Ievadiet identifikatoru `parbaudes_lietotajs`.
3. Ievadiet paroli `nepareizaParole999`.
4. Nospiediet pogu **Pieslēgties**.

**Sagaidāmais rezultāts:** Sistēma rāda kļūdas paziņojumu “Nepareizs lietotājvārds, e-pasts vai parole.” Lietotājs paliek nepieslēdzies. Sesija netiek izveidota.

---

## TC-03 — Ieraksta izveide ar tukšu virsrakstu

**Mērķis:** Pārbaudīt servera puses validāciju.

**Sākotnējie nosacījumi:** Lietotājs ir pieslēdzies. Eksistē vismaz viena aktīva kategorija.

**Soļi:**
1. Atveriet `/ieraksti/jauns`.
2. Atstājiet lauku **Virsraksts** tukšu.
3. Izvēlieties kategoriju.
4. Saturā ievadiet pietiekami garu tekstu (vismaz 10 simboli).
5. Nospiediet **Publicēt**.

**Sagaidāmais rezultāts:** Sistēma neveic ieraksta saglabāšanu, atgriež formu ar kļūdas paziņojumu pie virsraksta lauka (“Virsrakstam jābūt 4-150 simbolu garam.”). HTTP statuss ir 400. Datu bāzē jauns ieraksts neparādās.

---

## TC-04 — Ierakstu meklēšana un filtrēšana pēc kategorijas

**Mērķis:** Pārbaudīt meklēšanas un filtrēšanas darbību.

**Sākotnējie nosacījumi:** Datu bāzē ir vairāki publicēti ieraksti dažādās kategorijās.

**Soļi:**
1. Atveriet `/ieraksti`.
2. Filtru laukā **Meklēt** ievadiet atslēgvārdu, kas eksistē kāda ieraksta virsrakstā vai saturā.
3. Atlasiet konkrētu kategoriju.
4. Nospiediet **Filtrēt**.

**Sagaidāmais rezultāts:** Saraksts atspoguļo tikai tos ierakstus, kas atbilst gan meklēšanas atslēgvārdam, gan izvēlētajai kategorijai. Lapas augšpusē redzams kopējais atrasto ierakstu skaits. Lappušu navigācija strādā, ja rezultātu ir vairāk par 10.

---

## TC-05 — Administratora satura moderēšana (komentāra paslēpšana)

**Mērķis:** Pārbaudīt, ka administrators var paslēpt neatbilstošu komentāru.

**Sākotnējie nosacījumi:** Administrators ir pieslēdzies. Datu bāzē ir vismaz viens komentārs ar statusu `redzams`.

**Soļi:**
1. Atveriet `/admin/saturs?veids=komentari`.
2. Sarakstā atrodiet komentāru un nospiediet pogu **Paslēpt**.
3. Atveriet attiecīgo ierakstu publiskajā skatā kā parasts lietotājs (vai izlogojieties).

**Sagaidāmais rezultāts:** Administrēšanas saraksta tabulā komentāra statuss mainās uz `paslepts`. Audita žurnālā (`/admin/audita-zurnals`) parādās ieraksts ar darbību `mainit_komentara_statusu`. Publiskajā ieraksta skatā komentārs tiek vizuāli atšķirts (paslēpts) vai neredzams parastajiem lietotājiem.

---

## TC-06 (papildu) — Privātās ziņas nosūtīšana

**Mērķis:** Pārbaudīt savstarpējās saziņas funkcionalitāti.

**Sākotnējie nosacījumi:** Pieslēdzies divi lietotāji (A un B) divās dažādās pārlūka sesijās.

**Soļi:**
1. Lietotājs A atver `/zinas/jauna`, ievada lietotāja B lietotājvārdu un sūta ziņu.
2. Lietotājs B atjaunina lapu un atver `/pazinojumi`.

**Sagaidāmais rezultāts:** Lietotāja B paziņojumu sarakstā parādās jauns paziņojums ar tipu `privata_zina`. Atverot sarunu, ziņa parādās burbuļu sarakstā un tiek atzīmēta kā izlasīta.

---

## Automātiskie vienības testi

Komandā:

```
npm test
```

tiek palaisti `tests/validacija.test.js` testi, kas pārbauda visu galveno validācijas funkciju uzvedību (paroles spēks, paroļu sakritība, ieraksta lauku robežas, komentāra garums utt.).
