-- ──────────────────────────────────────────────
-- Script de inicialización de la base de datos
-- Se ejecuta automáticamente al crear el contenedor MySQL
-- ──────────────────────────────────────────────

-- Asegurar que la base de datos existe
CREATE DATABASE IF NOT EXISTS workhub_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Asegurar permisos completos al usuario de la aplicación
GRANT ALL PRIVILEGES ON workhub_db.* TO 'workhub_user'@'%';
FLUSH PRIVILEGES;
