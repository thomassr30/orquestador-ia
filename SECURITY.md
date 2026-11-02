# Seguridad

## Qué hace el harness en tu equipo
- Es un conjunto de scripts de Node.js que **tu herramienta de IA ejecuta** (hooks) antes y después de cada acción. No es un servicio, no abre puertos, no usa red ni claves de API.
- Lee la entrada del hook (comando, archivo o mensaje) y responde permitir, bloquear o avisar.
- Escribe solo en: `.sdd/memoria/sesion.md` del proyecto (bloque automático), `~/.sdd-orquestador/estado/` (estado por sesión, se borra a los 14 días) y archivos temporales con salidas de comandos compactadas.
- El estado de la sesión guarda el pedido en curso y el inicio de tu último mensaje (60 caracteres), para retomar el trabajo y diagnosticar el GATE.
- El registro local (`sdd-harness.js registro`) guarda decisiones, motivos y el tipo de cada mensaje (aprobación, pedido de cambio…), nunca el contenido de archivos ni el texto de tus mensajes.
- Para reconocer tu aprobación cuando la herramienta no avisa, el harness **lee** (nunca escribe) la conversación que tu herramienta ya guarda en tu equipo.

## Qué protege
- Escritura en git/GitHub/GitLab (también por MCP), lectura/escritura de secretos, comandos destructivos.
- Confirmación para infraestructura, bases de datos, borrado de archivos, dependencias y herramientas MCP que escriben.
- La configuración del propio harness y de los hooks de la IA (el agente no puede desactivarlos sin tu permiso).

## Límites
- Falla abierta: si un hook falla (por ejemplo, Node no está en el PATH) no bloquea; `sdd-harness.js doctor` hace una prueba en vivo para detectarlo.
- No es un sandbox: un comando ofuscado dentro de un script puede no reconocerse. Para código sensible usa el sandbox de Codex o un contenedor.

## Reportar un problema
Abre un *issue* privado o contacta a quien mantiene el repositorio. No incluyas secretos ni datos de clientes en el reporte.
