# Sesiones, login, descargas y archivos

## Login
- Pide al usuario que inicie sesión en la ventana del navegador controlado; espera su "listo".
- Perfil persistente (`--user-data-dir`) para no repetir el login entre sesiones; perfil aislado (`--isolated`) para pruebas limpias.
- Para scripts Playwright: guardar `storageState` en un archivo fuera del repo (en `.gitignore`).
- 2FA/captcha: siempre intervención humana.

## Usar el Chrome del usuario
- Modo extensión de Playwright MCP o "Claude in Chrome": controla pestañas reales con sesiones abiertas. Más cómodo pero más riesgoso: confirma cada acción que modifique datos y no navegues fuera del objetivo.

## Descargas y subidas
- Descargas: indica la carpeta destino (la que indique el usuario; por defecto la carpeta de descargas del sistema); verifica nombre y tamaño del archivo.
- Subidas: solo archivos que el usuario indicó explícitamente (`browser_file_upload`).

## Sitios internos / institucionales
- Algunos requieren VPN o red interna: si no carga, repórtalo; no intentes rodear restricciones.
- Respeta las políticas de TI sobre automatización.
