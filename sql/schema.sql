-- Vienota tiessaistes kopienu foruma platforma
-- Datu bazes shema (MySQL / MariaDB)

DROP TABLE IF EXISTS paroles_atjaunosanas;
DROP TABLE IF EXISTS ai_pieprasijums;
DROP TABLE IF EXISTS atbalsta_zinojums;
DROP TABLE IF EXISTS audita_zurnals;
DROP TABLE IF EXISTS pazinojums;
DROP TABLE IF EXISTS privata_zina;
DROP TABLE IF EXISTS balsojums;
DROP TABLE IF EXISTS komentars;
DROP TABLE IF EXISTS ieraksts;
DROP TABLE IF EXISTS kategorija;
DROP TABLE IF EXISTS lietotajs;

CREATE TABLE lietotajs (
    lietotajs_id INT AUTO_INCREMENT PRIMARY KEY,
    lietotajvards VARCHAR(50) NOT NULL,
    epasts VARCHAR(100) NOT NULL,
    paroles_hash VARCHAR(255) NOT NULL,
    loma ENUM('lietotajs','administrators') NOT NULL DEFAULT 'lietotajs',
    profila_apraksts VARCHAR(255) NULL,
    statuss ENUM('aktivs','blokets','neaktivs') NOT NULL DEFAULT 'aktivs',
    registracijas_datums DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_lietotajs_lietotajvards (lietotajvards),
    UNIQUE KEY uq_lietotajs_epasts (epasts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE kategorija (
    kategorija_id INT AUTO_INCREMENT PRIMARY KEY,
    nosaukums VARCHAR(80) NOT NULL,
    apraksts VARCHAR(255) NULL,
    secibas_nr INT NOT NULL DEFAULT 0,
    aktiva BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_kategorija_nosaukums (nosaukums),
    CONSTRAINT chk_kategorija_seciba CHECK (secibas_nr >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ieraksts (
    ieraksts_id INT AUTO_INCREMENT PRIMARY KEY,
    autora_id INT NOT NULL,
    kategorija_id INT NOT NULL,
    virsraksts VARCHAR(150) NOT NULL,
    saturs TEXT NOT NULL,
    statuss ENUM('melnraksts','publicets','slegts') NOT NULL DEFAULT 'publicets',
    izveidots DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atjauninats DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ieraksts_autors (autora_id),
    KEY idx_ieraksts_kategorija (kategorija_id),
    KEY idx_ieraksts_statuss (statuss),
    CONSTRAINT fk_ieraksts_autors FOREIGN KEY (autora_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ieraksts_kategorija FOREIGN KEY (kategorija_id)
        REFERENCES kategorija(kategorija_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE komentars (
    komentars_id INT AUTO_INCREMENT PRIMARY KEY,
    ieraksts_id INT NOT NULL,
    autora_id INT NOT NULL,
    vecaks_komentars_id INT NULL,
    teksts TEXT NOT NULL,
    statuss ENUM('redzams','paslepts') NOT NULL DEFAULT 'redzams',
    izveidots DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_komentars_ieraksts (ieraksts_id),
    KEY idx_komentars_autors (autora_id),
    KEY idx_komentars_vecaks (vecaks_komentars_id),
    CONSTRAINT fk_komentars_ieraksts FOREIGN KEY (ieraksts_id)
        REFERENCES ieraksts(ieraksts_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_komentars_autors FOREIGN KEY (autora_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_komentars_vecaks FOREIGN KEY (vecaks_komentars_id)
        REFERENCES komentars(komentars_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE balsojums (
    balsojums_id INT AUTO_INCREMENT PRIMARY KEY,
    ieraksts_id INT NOT NULL,
    lietotajs_id INT NOT NULL,
    izveidots DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_balsojums (ieraksts_id, lietotajs_id),
    KEY idx_balsojums_ieraksts (ieraksts_id),
    KEY idx_balsojums_lietotajs (lietotajs_id),
    CONSTRAINT fk_balsojums_ieraksts FOREIGN KEY (ieraksts_id)
        REFERENCES ieraksts(ieraksts_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_balsojums_lietotajs FOREIGN KEY (lietotajs_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE privata_zina (
    zina_id INT AUTO_INCREMENT PRIMARY KEY,
    sutitaja_id INT NOT NULL,
    sanemeja_id INT NOT NULL,
    saturs TEXT NOT NULL,
    nosutits DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    izlasita BOOLEAN NOT NULL DEFAULT FALSE,
    KEY idx_privata_zina_sutitajs (sutitaja_id),
    KEY idx_privata_zina_sanemejs (sanemeja_id),
    CONSTRAINT fk_privata_zina_sutitajs FOREIGN KEY (sutitaja_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_privata_zina_sanemejs FOREIGN KEY (sanemeja_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_privata_zina_dalibnieki CHECK (sutitaja_id <> sanemeja_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pazinojums (
    pazinojums_id INT AUTO_INCREMENT PRIMARY KEY,
    sanemeja_id INT NOT NULL,
    tips ENUM('komentars','privata_zina','sistemas') NOT NULL,
    teksts VARCHAR(255) NOT NULL,
    avota_tips VARCHAR(30) NULL,
    avota_id INT NULL,
    izlasits BOOLEAN NOT NULL DEFAULT FALSE,
    izveidots DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_pazinojums_sanemejs (sanemeja_id),
    CONSTRAINT fk_pazinojums_sanemejs FOREIGN KEY (sanemeja_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE paroles_atjaunosanas (
    zetons_id INT AUTO_INCREMENT PRIMARY KEY,
    lietotajs_id INT NOT NULL,
    zetona_hash CHAR(64) NOT NULL,
    derigs_lidz DATETIME NOT NULL,
    izmantots BOOLEAN NOT NULL DEFAULT FALSE,
    ip VARCHAR(45) NULL,
    izveidots DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_paroles_zetons (zetona_hash),
    KEY idx_paroles_lietotajs (lietotajs_id),
    KEY idx_paroles_derigs (derigs_lidz),
    CONSTRAINT fk_paroles_lietotajs FOREIGN KEY (lietotajs_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_pieprasijums (
    ai_pieprasijums_id INT AUTO_INCREMENT PRIMARY KEY,
    lietotajs_id INT NULL,
    darbiba ENUM('uzlabot','virsraksts') NOT NULL,
    ievade_fragments VARCHAR(500) NULL,
    ievades_garums INT NOT NULL DEFAULT 0,
    izvades_garums INT NULL,
    avots ENUM('claude','lokala','kluda','limits') NOT NULL,
    ip VARCHAR(45) NULL,
    izveidots DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_lietotajs (lietotajs_id),
    KEY idx_ai_izveidots (izveidots),
    CONSTRAINT fk_ai_lietotajs FOREIGN KEY (lietotajs_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE atbalsta_zinojums (
    atbalsts_id INT AUTO_INCREMENT PRIMARY KEY,
    lietotajs_id INT NULL,
    nosutitaja_vards VARCHAR(100) NOT NULL,
    nosutitaja_epasts VARCHAR(100) NOT NULL,
    tema VARCHAR(150) NOT NULL,
    zinojums TEXT NOT NULL,
    statuss ENUM('jauns','atbildets','aizverts') NOT NULL DEFAULT 'jauns',
    atbilde TEXT NULL,
    atbildejis_lietotajs_id INT NULL,
    izveidots DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atbildets DATETIME NULL,
    KEY idx_atbalsts_lietotajs (lietotajs_id),
    KEY idx_atbalsts_statuss (statuss),
    CONSTRAINT fk_atbalsts_lietotajs FOREIGN KEY (lietotajs_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_atbalsts_atbildejis FOREIGN KEY (atbildejis_lietotajs_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audita_zurnals (
    audita_id INT AUTO_INCREMENT PRIMARY KEY,
    lietotajs_id INT NULL,
    darbiba VARCHAR(80) NOT NULL,
    objekta_tips VARCHAR(40) NULL,
    objekta_id INT NULL,
    detalas VARCHAR(500) NULL,
    izveidots DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_audita_lietotajs (lietotajs_id),
    CONSTRAINT fk_audita_lietotajs FOREIGN KEY (lietotajs_id)
        REFERENCES lietotajs(lietotajs_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
