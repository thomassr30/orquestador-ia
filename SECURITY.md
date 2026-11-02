# Seguridad

## Qué hace el harness en tu equipo
- Es un conjunto de scripts de Node.js que **tu herramienta de IA ejecuta** (hooks) antes y después de cada acción. No es un servicio, no abre puertos, no usa red ni claves de API.
- Lee la entrada del hook (comando, archivo o mensaje) y responde permitir, bloquear o avisar.
- Escribe solo en: `.sdd/memoria/sesion.md` del proyecto (bloque automático), `~/.sdd-orquestador/estado/` (estado por sesión, se borra a los 14 días) y archivos temporales con salidas de comandos compactadas.
- El estado de la sesión guarda el pedido en curso y el inicio de tu último mensaje (60 caracteres), para retomar el trabajo y diagnosticar el GATE.
- El registro local (`sdd-harness.js registro`) guarda decisiones, motivos y el tipo de cada mensaje (aprobación, pedido de cambio…), nunca el contenido de archivos ni el texto de tus mensajes.
- **Espacio de trabajo**: detecta los proyectos de la carpeta abierta leyendo solo sus marcadores (nombres de archivo y `package.json`) y guarda ese mapa en `~/.sdd-orquestador/estado/`. Las carpetas de un workspace de VS Code o de `.sdd/workspace.json` cuentan como parte del proyecto: leerlas no pide permiso; escribir sigue las reglas de cada proyecto. `sdd-harness.js workspace --aplicar` (solo tú) agrega esas carpetas a la configuración local de Claude Code y Codex.
- **Puntos de restauración**: antes de cada turno que modifica archivos guarda una copia del proyecto en `~/.sdd-orquestador/puntos/` (un repositorio git interno, separado del `.git` del proyecto, que nunca se toca). No copia secretos (`.env`, claves, certificados) ni lo ignorado por `.gitignore`. Guarda los últimos 30 por proyecto y la etiqueta incluye el inicio de tu mensaje. Se borra al desinstalar.
- Para reconocer tu aprobación cuando la herramienta no avisa, el harness **lee** (nunca escribe) la conversación que tu herramienta ya guarda en tu equipo.

## Qué protege
- `git commit` siempre bloqueado (también vía alias o herramientas de versionado que crean commits); escritura en GitHub/GitLab (también por MCP), lectura/escritura de secretos, comandos destructivos.
- El resto de git (push, merge, rebase, reset, stash…), con confirmación del usuario y aviso explícito cuando descarta cambios o reescribe el remoto.
- Confirmación para infraestructura, bases de datos, borrado de archivos, dependencias, configuración de servidores MCP y herramientas MCP que escriben.
- La configuración del propio harness y de los hooks de la IA (el agente no puede desactivarlos sin tu permiso).
- Instrucciones inyectadas: desde que la sesión lee contenido externo (web, MCP, descargas), los comandos y URLs que pueden enviar datos a otro servidor piden confirmación.
- Claves y tokens reales escritos en el código (AWS, GitHub, GitLab, OpenAI/Anthropic, Google, Slack, Stripe, credenciales en URLs) se bloquean.
- Publicar paquetes (`npm publish` y similares) es una decisión crítica.

## Límites
- Falla abierta: si un hook falla (por ejemplo, Node no está en el PATH) no bloquea; `sdd-harness.js doctor` hace una prueba en vivo para detectarlo.
- No es un sandbox: un comando ofuscado dentro de un script puede no reconocerse. Para código sensible usa el sandbox de Codex o un contenedor.

## Reportar un problema
Abre un *issue* privado o contacta a quien mantiene el repositorio. No incluyas secretos ni datos de clientes en el reporte.
