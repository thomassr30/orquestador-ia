# Decisiones

## 2026-11-06 · harness 3.1.0 (plan de mejora aprobado por el usuario)
- **El GATE se abre por defecto** y solo se abstiene con consulta, saludo, aprobación limpia o pedido directo. Motivo: la clase difícil de reconocer es el pedido de cambio (formas infinitas), no la consulta (formas acotadas). Medido antes del cambio en evals/gate/frases.json: 59,5% de falsos negativos y 0% de falsos positivos; después, 0% y 0%. Se agrega `gate: "pedido"` para conservar el criterio de 3.0.0, porque es un cambio de comportamiento por defecto y debe poder revertirse por configuración.
- **Los modales de pedido cortés no son consulta**: «¿puedes dejar el header fijo?» pide un cambio. «que…» y «hay que…» solo son consulta con marca de pregunta o tilde, que es lo que separa «¿qué hace este archivo?» de «que el formulario valide el RUT».
- **El veto de la consulta usa formas verbales completas**, no prefijos: así «resume los cambios» o «muéstrame la configuración» no se convierten en pedidos por contener «cambi» o «configur».
- **Un destino de escritura que no se puede resolver es crítico**, no se omite. Motivo: omitirlo en silencio era la opción permisiva, y contradice D2 (escribir fuera del proyecto lo decide el usuario).
- **El gestor de tickets no es el repositorio**: escribir un work item de Azure Boards pide confirmación y escribir en Azure Repos se bloquea. Motivo: es lo que ya decían tracker-common y tracker-azure-boards; denegarlo todo por el nombre del servidor era clasificar por proveedor en vez de por acción. GitHub y GitLab quedan como estaban: sus nombres de herramienta no distinguen tracker de código y es una garantía declarada en SECURITY.md.
- **Medir siempre en disco local**: sobre una carpeta montada por el puente cada spawn de node cuesta 19,4 s contra 98 ms en disco. Una medición de rendimiento hecha sobre el montaje no es evidencia.

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

## 2026-11-11 · Figma manda el valor, el proyecto la forma (fuente: core/skills/figma-design/SKILL.md)
- Con un diseño de Figma, el valor dibujado (tamaño, espacio, tipografía, color) no se redondea a la escala 4/8 ni a la escala tipográfica de `design-quality`, y no se agregan hover, transiciones ni sombras no dibujados. Un token solo reemplaza al valor si es igual; si solo se parece, se conserva el de Figma y se reporta. Motivo: esas reglas genéricas y `design-polish` hacían que el agente redondeara e inventara estilos. La comparación final es numérica (estilos calculados contra el inventario), no solo visual. Aprobado por el usuario.

## 2026-11-11 · Skills que trae el proyecto (fuente: harness/src/skills-proyecto.js)
- El harness entrega al agente solo **nombre y ruta** de las skills del proyecto, nunca descripciones ni contenido: lo escribe el repositorio y no debe ganar la autoridad del canal del harness; el cliente ya muestra las descripciones. Orden de mando: AGENTS.md/CLAUDE.md, skills del proyecto, skills del orquestador; ninguna relaja el GATE, las confirmaciones ni los bloqueos. Choque de nombres: en Claude Code gana la skill personal (`~/.claude/skills`, donde viven las del orquestador), así que se marca con ⚠ y se lee la del proyecto por su ruta. `.agents/skills` se escanea aunque Claude Code no documenta que la cargue. Aprobado por el usuario.

## 2026-11-12 · Perfiles de proyecto (fuente: harness/src/perfiles.js, perfiles/sag-laboratorio-frontend)
- La configuración de IA propia de un repo (CLAUDE.md, agentes, constitución, skills, settings nativos y fragmento de .sdd/harness.json) va en `perfiles/<nombre>/` y se aplica con `sdd-harness.js perfil aplicar`, no en `core/`. Motivo: `core/` se instala en todos los proyectos (costo de tokens y choques de nombres) y lo SAG es de un solo repo. Aplicar nunca borra (lo obsoleto se informa), no pisa semillas, se niega con cambios sin commitear y el agente solo lo hace con confirmación crítica. Aprobado por el usuario.
- Perfil `sag-laboratorio-frontend`: sin `azdo.mjs` ni `read-pbi` (Azure DevOps por MCP, HU con `sdd-ticket`); el hook `check-normas` pasa a instrucciones de la skill `general-standards` (un hook no puede usar el MCP, que autentica por navegador); `lint-file` lo reemplaza la verificación al terminar el turno. Regla propia nueva `soloLectura` para el kit SAG. Aprobado por el usuario.

## 2026-11-12 · Fin de turno sin esperas (fuente: harness/src/core.js onStop/verifyChanges/onSubagentStop)
- Mientras haya sub-agentes en curso (Claude Code, contados con PreToolUse Agent y SubagentStop; se olvidan a los 30 min), el Stop no verifica ni bloquea: avisa «Verificación en espera». Motivo: el agente principal cede el turno para esperar sub-agentes en segundo plano y el Stop con sensores (minutos) impedía que le llegara el aviso de que terminaron (registro del BFF: turno de 17 min hasta que el usuario canceló). Aprobado por el usuario.
- Misma huella que la última verificación → no se vuelve a correr (aprobado vale; fallido/no verificado se informa una vez y se pide la excepción). Motivo: tests de 241 s repetidos 3 veces sobre el mismo código. Cambia el patrón del corpus 05 y de SENS-6 (BN-- en vez de BBN-). Aprobado por el usuario.

## 2026-11-12 · Ticket de punta a punta y Figma exacto (fuente: core/skills/sdd-ticket, core/skills/figma-design)
- `sdd-ticket` = un ticket de punta a punta con una sola pausa (GATE); Figma se lee antes del plan; el ticket lo lee el hilo principal. Para implementar, Figma se lee completo y la captura no es fuente de valores; el inventario viaja completo en la delegación. En el perfil SAG el cupo de 20/mes se respeta con cuenta y umbral (10 llamadas por tarea), pero no se lee menos para implementar. Aprobado por el usuario.

