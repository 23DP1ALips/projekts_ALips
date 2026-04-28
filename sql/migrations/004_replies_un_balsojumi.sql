-- Migracija: pievienot komentaru atbildes (vecaks_komentars_id) un ieraksta balsojumus
-- Palaist ar: Get-Content sql\migrations\004_replies_un_balsojumi.sql | & "C:\xampp\mysql\bin\mysql.exe" -u root forums

-- 1. Komentariem pievieno vecaka komentara atsauce (atbildes pakapeniba)
ALTER TABLE komentars
    ADD COLUMN vecaks_komentars_id INT NULL AFTER autora_id,
    ADD KEY idx_komentars_vecaks (vecaks_komentars_id),
    ADD CONSTRAINT fk_komentars_vecaks FOREIGN KEY (vecaks_komentars_id)
        REFERENCES komentars(komentars_id)
        ON UPDATE CASCADE ON DELETE CASCADE;

-- 2. Jauna tabula ierakstu balsojumiem (upvote)
CREATE TABLE IF NOT EXISTS balsojums (
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
