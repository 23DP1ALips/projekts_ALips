-- Migracija: pievienot atbalsta_zinojums tabulu (nezaude esosos datus)
-- Palaist ar: mysql -u root forums < sql/migrations/001_atbalsta_zinojums.sql

CREATE TABLE IF NOT EXISTS atbalsta_zinojums (
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
