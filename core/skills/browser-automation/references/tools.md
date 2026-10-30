# Herramientas MCP de navegador

Los nombres exactos dependen de la versión del servidor MCP: usa los que aparezcan en tu lista de herramientas.

## Playwright MCP (`playwright`)
| Acción | Herramienta típica |
|---|---|
| Abrir URL / atrás | `browser_navigate`, `browser_navigate_back` |
| Leer la página (árbol accesible con referencias) | `browser_snapshot` |
| Captura de pantalla (página completa o elemento) | `browser_take_screenshot` |
| Clic, escribir, teclas, hover | `browser_click`, `browser_type`, `browser_press_key`, `browser_hover` |
| Formularios | `browser_fill_form`, `browser_select_option`, `browser_file_upload` |
| Esperar texto/elemento | `browser_wait_for` |
| Diálogos (alert/confirm) | `browser_handle_dialog` |
| Tamaño de ventana (responsive) | `browser_resize` |
| Pestañas | `browser_tabs` |
| Consola y red básicas | `browser_console_messages`, `browser_network_requests` |
| Ejecutar JS en la página (solo lectura de datos) | `browser_evaluate` |
| Cerrar | `browser_close` |

Opciones útiles del servidor (en la config MCP): `--headless` (sin ventana), `--isolated` (perfil limpio), `--user-data-dir <ruta>` (perfil persistente con sesiones), `--viewport-size`, `--extension` (conectar a pestañas del Chrome del usuario mediante la extensión de Playwright MCP, si tu versión lo soporta).

## Chrome DevTools MCP (`chrome-devtools`)
Para diagnóstico: listar mensajes de consola, peticiones de red (estado, tiempos, cuerpos), trazas de rendimiento (LCP, CLS, bloqueos del hilo principal), emulación de red lenta/CPU, capturas y snapshot. Úsalo cuando la pregunta es "por qué" (error, lentitud, petición fallida).

## Elección rápida
- "¿Cómo se ve X?" → navigate + screenshot (+ resize para móvil).
- "¿Qué dice/contiene X?" → navigate + snapshot (sin captura).
- "¿Por qué falla/carga lento?" → chrome-devtools: consola + red + traza.
- "Haz X en la web" → navigate + snapshot + click/type/fill (+ confirmación antes de enviar).
