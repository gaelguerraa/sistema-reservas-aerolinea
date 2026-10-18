-- Cambio 2: vincular cada cliente con sus datos y permitir desactivar cuentas.
ALTER TABLE `usuarios` ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `pasajero_id` VARCHAR(64) NULL;
CREATE UNIQUE INDEX `usuarios_pasajero_id_key` ON `usuarios`(`pasajero_id`);
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_pasajero_id_fkey`
  FOREIGN KEY (`pasajero_id`) REFERENCES `pasajeros`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
