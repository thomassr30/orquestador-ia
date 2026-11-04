# Decisiones

## 2026-11-03 · harness 3.0.0 (aprobadas por el usuario, opción «a» en D1-D8)
- D1 Controles: `sensores.obligatorios` = ["tests"] si el proyecto los tiene; nada se ve verde sin al menos un control aprobado. Motivo: una omisión no puede contar como aprobación.
- D2 «ask» no crítico: escribir fuera del proyecto (salvo temporal del sistema) y Bash sobre rutas protegidas son críticos; comandos/herramientas desconocidos se delegan al cliente salvo `modo: estricto`. Motivo: evitar diálogos por cada comando sin dejar huecos en lo protegido.
- D3 Varias aprobaciones pendientes: un «sí» solo aprueba si hay una; con varias, «sí 1,3» o «sí a todas». Motivo: un «sí» no debe autorizar acciones que el usuario no vio.
- D4 Error interno: falla cerrada solo para lo crítico (también si falla el adaptador); estricto cierra todo salvo lecturas. Motivo: no bloquear lecturas inocuas por un bug del harness.
- D5 Modelo de trabajo en el estado del harness (fuera del repo, no editable por el agente); changes/ y sdd-state.js obsoletos para estado. Motivo: el agente no puede fabricar evidencia.
- D6 Versión 3.0.0 (estado v2, semántica de sensores, formato y códigos de sdd-eval). D7 hasta 3 sub-agentes por lote. D8 sdd-eval con interfaz de cliente; solo Claude implementado.
- Aprobación = HMAC-SHA256 (clave local en SDD_HOME) de tipo+herramienta+operación+args normalizados+proyecto+sesión; se guarda etiqueta sin valores. Motivo: comparar sin almacenar comandos ni argumentos.
- Línea base de errores solo con árbol sin cambios de código y ligada al commit. Motivo: el agente no puede «blanquear» errores que introdujo.
- Excepción de control ligada a la huella del contenido: si cambia el archivo, deja de valer.
- Compactador en Claude Code: solo compacta si las reglas de permiso del usuario (archivos de settings y política en archivo) ya permiten el comando original y ninguna ask/deny lo toca. Motivo: Claude evalúa sus reglas contra el comando envuelto, así que el «allow» del hook concedía permisos y anulaba reglas del usuario (opción a, aprobada 2026-11-03).
- Plan del trabajo congelado al aprobar el GATE; un plan nuevo queda como propuesta hasta otra aprobación. Motivo: no rebajar criterios de aceptación aprobados.

## 2026-11-03 · espacio de trabajo sin tope de niveles (fuente: harness/src/workspace.js `limits`)
- Espacio de trabajo sin tope de niveles por defecto (`espacio.profundidad: null`) y tope de 20.000 carpetas (`espacio.maxCarpetas`), configurables. Motivo: el recorrido es por niveles (BFS) y el tope de carpetas se agotaba antes de llegar a lo profundo; medido en Windows ~0,1 ms por carpeta (20.000 ≈ 2 s, al iniciar sesión y cada 20 min por la caché); con 10 niveles y 4.000 carpetas un árbol ancho daba 0 proyectos del nivel 7. Aprobado por el usuario.

## 2026-11-04 · Figma por MCP (fuente: install.js registerMcp, config/mcp.json)
- Figma remoto (https://mcp.figma.com/mcp) y no el de escritorio: sirve con Figma en la web, sin app abierta ni asiento de pago. Viene apagado (enabled:false) y se activa con `node install.js --mcp=figma`, para que quien no usa Figma no vea un servidor «pendiente de iniciar sesión». El enlace del archivo de cada proyecto vive en su memoria (diseno.md → «Fuente de diseño»); la conexión es por cuenta, no por proyecto. La desinstalación no quita MCP (como los locales). Aprobado por el usuario.
