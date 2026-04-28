-- Migracija: pievienot paroles atjaunosanas zetonu tabulu
-- Palaist ar: Get-Content sql\migrations\003_paroles_atjaunosanas.sql | & "C:\xampp\mysql\bin\mysql.exe" -u root forums

CREATE TABLE IF NOT EXISTS paroles_atjaunosanas (
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
