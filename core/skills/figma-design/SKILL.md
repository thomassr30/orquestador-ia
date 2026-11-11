---
name: figma-design
description: Implementa diseños de Figma con el MCP de Figma (leer el frame, inventario de componentes, variables y medidas, traducción a los tokens y componentes del proyecto, assets locales y comparación visual obligatoria contra la captura), con manejo de límites de lectura, accesos y estados no dibujados. Usar cuando el usuario pase un enlace de figma.com o pida implementar, prototipar o revisar algo «según el Figma».
---
# Diseño desde Figma

Carga antes `design-quality` (y `mobile-design` si es mobile). Lo que entrega Figma es **referencia de código**, no de valores.

**Regla de oro**: lo dibujado en Figma manda sobre el **valor**; el proyecto manda sobre la **forma** (el token o componente con que se expresa). Cada tamaño, espacio, tipografía, color, radio, borde o sombra del código sale de un dato leído de Figma, nunca de una escala, una costumbre o «se vería mejor». No redondees (13 px no pasa a 12 ni a 14), no agregues (hover, transiciones, sombras, degradados, estados o breakpoints que no están dibujados) y, si un dato no se pudo leer, anota «sin dato» y pregunta.

## 1. Antes de leer
1. **Enlace**: `figma.com/design/<fileKey>/<nombre>?node-id=<a>-<b>` → fileKey y nodeId `<a>:<b>`. En `/branch/<branchKey>/` usa branchKey; `/board/` es FigJam (`get_figjam`); `/make/` es Figma Make.
2. **Sin enlace** («según el Figma»): busca el archivo en `.sdd/memoria/temas/diseno.md` → «Fuente de diseño» y pide el enlace del frame concreto. Sin `node-id` no leas: pide el enlace del frame (clic derecho → *Copy link to selection*).
3. **MCP disponible**: si no hay herramientas `figma` o piden iniciar sesión, detente y explica cómo activarlo (`node install.js --mcp=figma` + inicio de sesión; README → «Servidores MCP»). Nunca adivines el diseño por el nombre del frame.
4. **Sesión y guía oficial**: `create_session` con el fileKey y una descripción corta; carga la guía de Figma (skill `/figma-design-to-code` o el recurso `skill://figma/figma-design-to-code/SKILL.md`) antes de `get_design_context`, y pasa `skillNames` como pide.

## 2. Leer (cada llamada cuenta)
- `get_design_context` con fileKey, nodeId y sessionId, **con captura**: es la fuente principal (estructura, código de referencia, variables, descripciones de componentes, assets).
- Si la respuesta viene resumida («sparse») por tamaño: identifica en la captura los hijos visibles y pídelos en un solo lote en paralelo; no implementes desde la versión resumida.
- `get_variable_defs` (mismo nodeId): valores reales de las variables de espaciado, tamaño, color y tipografía. Si el frame es denso o vino resumido, `get_metadata` da tamaños y posiciones exactos de cada nodo. Una vez por sección.
- Sin captura en la respuesta → `get_screenshot` antes de escribir código.
- No repitas lecturas ya hechas en la conversación. En plan Starter o asiento View/Collab el límite es de pocas llamadas al mes: avisa cuántas usaste.

## 3. Inventario (en el chat, antes de escribir código)
Es la especificación: lo que no está aquí no se escribe en el código.
| Qué | De dónde |
|---|---|
| Pantalla y secciones | nombres de capas (`data-name`) y captura |
| Componentes y variantes | descripciones de componentes («Stepper», estado `check-complete`…) |
| Variables de color y tipografía | `var(--grupo/nombre, valor)`, `get_variable_defs` y la lista de estilos («Gob / Exito / Base: #4CAF50») |
| Assets | constantes `img…` con su uso (ícono, logo, ilustración) |
| Faltantes | comportamiento, opciones de listas, estados no dibujados, mobile |

Más una **fila por elemento relevante** con valores exactos y su origen (código de referencia, variable o metadata), sin redondear:
- tipografía: familia, peso, tamaño, interlineado, tracking y color;
- espacio: padding y margen por lado, gap;
- tamaño: ancho, alto, mínimos y máximos;
- radio, borde, sombra y opacidad;
- layout: dirección, alineación y distribución.

Un valor que no se pudo leer va como «sin dato», no como una estimación.

## 4. Traducir al proyecto
1. **Tokens**: cada variable de Figma → token existente (`diseno.md`, tema, variables CSS/SCSS, Tailwind) **solo si su valor es igual**. Si el token se parece pero no es igual, conserva el valor de Figma y reporta la diferencia («Figma 13 px · token `--space-3` = 12 px»). Si no hay token, propón el nuevo con su rol; no pegues valores sueltos ni los ajustes a la escala del proyecto (4/8, escala tipográfica).
2. **Componentes**: cada componente de Figma → componente del proyecto o de su librería; reutilízalo aunque cueste configurarlo. Code Connect, si viene, manda.
3. **Layout**: el código de Figma es React + Tailwind con posiciones absolutas. Conviértelo al stack del proyecto con flex/grid; posiciones absolutas solo si el diseño lo exige (superposiciones), y con selectores que no se pisen: revisa la especificidad cuando dos reglas tocan el mismo elemento. Al pasar de posiciones a flex/grid, deriva gaps y paddings de las medidas de Figma (la resta entre bordes) y comprueba que el total coincide con el ancho/alto del frame.
4. **Assets**: descárgalos al proyecto (`curl -L`) y referéncialos localmente: las URLs de Figma vencen en 7 días. Usa cada asset en su posición exacta, sin redibujar ni sustituir; respeta el `width`/`height` del SVG.
5. **Interacción y accesibilidad**: lo que parece control se implementa como control real (select, input, button) con etiqueta, foco visible y nombre accesible en los botones de ícono.
6. **Errores del diseño** (textos con errores de tipeo, textos cortados, contraste insuficiente): repórtalos; corrígelos solo si el usuario lo aprueba o si el corte es un artefacto del frame (dilo).
7. **No añadir**: solo se admite sin estar dibujado lo funcional mínimo (foco visible, cursor, estado deshabilitado nativo del control), y se lista en el reporte como «añadido por accesibilidad». Todo lo demás (hover, transiciones, sombras, estados, breakpoints) es un supuesto: se pregunta (§6). Con Figma, `design-polish` y las escalas de `design-quality` no cambian lo dibujado.

## 5. Comparar antes de entregar (obligatorio)
1. Abre el resultado en el navegador (`browser-automation`) con el viewport al ancho del frame (p. ej. 1440) y zoom 100 %. Para archivos locales usa un servidor local: Playwright bloquea `file://`.
2. Captura la misma zona y compárala con la captura de Figma por secciones: posición de íconos dentro de sus contenedores, tamaños, tipografía (familia, peso, tamaño), colores, espaciado y alineación.
3. **Compara en números**: con `get_css_styles` o `evaluate_script` (`getComputedStyle`) lee de cada elemento del inventario tamaño de fuente, interlineado, padding, gap, ancho, alto, radio y color, y contrástalos con la fila del inventario. Revisa también el diff de CSS o clases: cada declaración nueva debe tener una fila del inventario que la respalde; la que no, se quita o se reporta como supuesto.
4. Corrige cada diferencia dentro del alcance y vuelve a medir. Entrega una tabla «elemento · propiedad · Figma · código · estado» y otra «sección · coincide / diferencia · acción».
5. Si el usuario compara en su pantalla y ve todo más grande: la escala de Windows o el zoom del navegador (125 % es común en laptops) agrandan todo por igual; compara proporciones, no píxeles absolutos.

## 6. Lo que Figma no trae
Comportamiento, datos reales, validaciones, estados (carga, vacío, error, deshabilitado) y versión mobile, si no están dibujados. Pregunta o márcalos como supuesto en el plan; sigue `design-harden` para los estados. Nunca los presentes como parte del diseño.

## 7. Memoria
La primera vez, guarda el enlace del **archivo** (sin `node-id` ni datos de acceso) en `diseno.md` → «Fuente de diseño», y los tokens nuevos aprobados en su sección. No guardes capturas ni URLs de assets.

## 8. Problemas frecuentes
| Síntoma | Causa y acción |
|---|---|
| No hay herramientas de Figma | MCP no registrado o sin sesión → README «Servidores MCP» |
| Error de límite («rate limit») | `whoami`: plan y asiento. Starter o View/Collab = pocas llamadas al mes; Dev o Full en un plan de pago suben el límite |
| Sin acceso al archivo | la cuenta conectada (`whoami` → email) debe tener permiso de ver el archivo: pedir invitación con ese correo |
| Burbujas con iniciales sobre el diseño | cursores de otras personas en el archivo; no son parte del diseño |
| Respuesta enorme o truncada | pedir frames más pequeños (una pantalla o sección por enlace) |

## 9. Escribir en Figma
Crear o modificar diseños (`use_figma`, `generate_figma_design`, `send_code_to_figma`…) solo si el usuario lo pide expresamente: requiere permiso de edición en el archivo (asiento Full) y cada acción pasa por la confirmación del harness. Carga antes la skill de Figma que corresponda (`/figma-use`, `/figma-generate-design`).
