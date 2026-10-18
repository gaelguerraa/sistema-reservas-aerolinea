import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) {
  console.log('Ya existe .env. Lo conservé para no cambiar tus contraseñas ni tu conexión.');
} else {
  const clave=()=>randomBytes(24).toString('hex');
  const app=clave();
  const texto=`# Configuración local. No subir a Git.\nPERSISTENCIA=mysql\nDATABASE_URL="mysql://reservas:${app}@127.0.0.1:3307/reservas"\nMYSQL_ROOT_PASSWORD=${clave()}\nMYSQL_APP_PASSWORD=${app}\nSEED_ADMIN_EMAIL=admin@ejemplo.com\nSEED_ADMIN_PASSWORD=Admin9aA-${clave()}\nSEED_CLIENT_EMAIL=cliente@ejemplo.com\nSEED_CLIENT_PASSWORD=Cliente9aA-${clave()}\nJWT_SECRET=${randomBytes(32).toString('hex')}\nJWT_TTL_SECONDS=900\nPORT=3000\nCORS_ORIGIN=http://localhost:5173,http://localhost:4200\n`;
  writeFileSync('.env',texto,{mode:0o600,flag:'wx'});
  console.log('Creé .env con claves nuevas. Abre el archivo para consultar tus usuarios de práctica.');
}
