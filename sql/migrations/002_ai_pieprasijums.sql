-- Migracija: pievienot ai_pieprasijums tabulu (AI pieprasijumu zurnals)
-- Palaist ar: Get-Content sql\migrations\002_ai_pieprasijums.sql | & "C:\xampp\mysql\bin\mysql.exe" -u root forums

CREATE TABLE IF NOT EXISTS ai_pieprasijums (
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
