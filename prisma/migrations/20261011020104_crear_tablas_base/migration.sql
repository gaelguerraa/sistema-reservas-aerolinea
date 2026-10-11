-- CreateTable
CREATE TABLE `vuelos` (
    `id` VARCHAR(64) NOT NULL,
    `origen` VARCHAR(80) NOT NULL,
    `destino` VARCHAR(80) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `hora` VARCHAR(5) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asientos` (
    `id` VARCHAR(64) NOT NULL,
    `vuelo_id` VARCHAR(64) NOT NULL,
    `numero` VARCHAR(10) NOT NULL,
    `clase` ENUM('ECONOMICA', 'EJECUTIVA') NOT NULL,

    UNIQUE INDEX `asientos_vuelo_id_numero_key`(`vuelo_id`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pasajeros` (
    `id` VARCHAR(64) NOT NULL,
    `nombre` VARCHAR(120) NOT NULL,
    `contacto` VARCHAR(120) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservas` (
    `id` VARCHAR(64) NOT NULL,
    `vuelo_id` VARCHAR(64) NOT NULL,
    `asiento_id` VARCHAR(64) NOT NULL,
    `pasajero_id` VARCHAR(64) NOT NULL,
    `estado` ENUM('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA') NOT NULL,
    `fecha_creacion` DATETIME(3) NOT NULL,

    INDEX `reservas_vuelo_id_estado_idx`(`vuelo_id`, `estado`),
    INDEX `reservas_asiento_id_estado_idx`(`asiento_id`, `estado`),
    INDEX `reservas_pasajero_id_idx`(`pasajero_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(64) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol` ENUM('ADMIN', 'CLIENTE') NOT NULL DEFAULT 'CLIENTE',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asientos` ADD CONSTRAINT `asientos_vuelo_id_fkey` FOREIGN KEY (`vuelo_id`) REFERENCES `vuelos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservas` ADD CONSTRAINT `reservas_vuelo_id_fkey` FOREIGN KEY (`vuelo_id`) REFERENCES `vuelos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservas` ADD CONSTRAINT `reservas_asiento_id_fkey` FOREIGN KEY (`asiento_id`) REFERENCES `asientos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservas` ADD CONSTRAINT `reservas_pasajero_id_fkey` FOREIGN KEY (`pasajero_id`) REFERENCES `pasajeros`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
