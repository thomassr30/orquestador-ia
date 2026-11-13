# CLAUDE.md

Contexto para Claude Code (CLI y extensión de VS Code) en `sag.laboratorio.app.frontend`, dentro del
harness Orquestador SDD (`orquestador-ia`). Responde y documenta en **español**.

> Este archivo, `.claude/agents`, `.claude/rules`, `.claude/skills` y `.sdd/harness.json` vienen del perfil
> `sag-laboratorio-frontend` del harness. Se editan en `orquestador-ia/perfiles/sag-laboratorio-frontend/` y se
> aplican con `sdd-harness.js perfil aplicar sag-laboratorio-frontend`: un cambio hecho solo aquí se pierde al
> volver a aplicar el perfil (ver "Mantener este contexto").

## Proyecto

Frontend del **Sistema de Laboratorios del SAG** (Servicio Agrícola y Ganadero de Chile). Permite
registrar solicitudes de análisis de muestras (wizard en `/solicitudes`) y gestionar su recepción en
laboratorio (bandeja, KPIs en tiempo real, recepción con checklist, escaneo QR) dentro de `/dashboard`.

- **Stack:** Next.js 16 (App Router, `output: 'standalone'`), React 19, TypeScript strict,
  TanStack Query 5, Zustand 5, zod 4, Tailwind CSS 4, lucide-react.
- **Backend:** consume solo el BFF `sag.laboratorio.api.bff`, siempre a través del proxy interno
  `src/app/api/bff/**` (`makeBffProxyHandler`). El navegador nunca llama al BFF directo.
- **Auth:** SSO SAG (Keycloak) vía BFF; cookie `bff_session`; `requireAuth()` en los layouts server.
- **Config:** `.env` en local (`LOCAL_DEVELOPMENT=true`) o Consul en dev/qa/prod (estándar V7).
- **Plataforma:** Azure DevOps (organización `SubdepartamentoSolucionesTI`, proyecto `Sistema Laboratorio`:
  repo, Work Items, pipelines), Git Flow SAG.

## Comandos

```bash
npm run dev          # servidor de desarrollo (requiere el BFF en local)
npm run type-check   # tsc --noEmit
npm run lint         # ESLint
npm test             # pruebas con Vitest (una corrida)
npm run test:ci      # pruebas con cobertura
npm run build        # build de producción (lo corre el pre-push)
```

Hay pruebas con Vitest en `src/tests`. Toda implementación se verifica con `type-check`, `lint` y `npm test`;
el harness además corre lint, tipos y tests de lo modificado al terminar cada turno, y los tres son obligatorios.

## Estructura

```
src/
  app/              rutas (en español), páginas delgadas, layouts con requireAuth, proxies api/bff/**
  global/
    api/            lib (fetchBff, bffProxy, transmit SSE) y services/<servicio>.service.ts
    config/         env (getEnv, envMapping, Consul) y routes.ts
    modules/auth/   AuthProvider, useAuth, requireAuth
    types/          bff.ts (sobre del BFF) y api/<servicio>.ts (contratos)
    ui/sag/         kit SAG — NO se modifica (el harness lo bloquea)
    ui/custom/      componentes propios: form, feedback, wizard, table, layout
  modules/<mod>/    components/ hooks/ types/ utils/ schemas/ store/ constants.ts index.ts
```

Módulos actuales: `home`, `dashboard`, `solicitud-analisis`, `recepcion-muestras`.

## Reglas clave

Las reglas completas están en `README.md` (código) y `CONTRIBUTING.md` (Git Flow, commits, PR,
revisión), basados en la Guía de Desarrollo SAG (DTI v6). Ante discrepancia, manda la guía SAG.
Las reglas que no se rompen están en `.claude/rules/constitution.md`. Prioridad: constitución >
Normas Generales SAG > `CONTRIBUTING.md` y `README.md` > skills del proyecto y código existente >
skills del orquestador > buenas prácticas externas. Ninguna de ellas relaja los controles del harness
(GATE, confirmaciones y bloqueos), que se aplican por código. Las más importantes:

- **Nombres:** lo técnico en inglés, el dominio en español (`PlagasTable`, `AntecedentesStep`,
  `useSolicitudDetail`). Funciones y variables en español como el código existente.
- **Imports:** siempre `@/`; `./` solo entre hermanos; `../` prohibido (ESLint y el harness lo bloquean).
- **Datos remotos:** proxy → servicio con `fetchBff` → hook de React Query. Errores con `BffApiError`:
  detalle técnico a `console.error`, mensaje genérico en español al usuario.
- **Formularios:** zod + mapa `Errores` + `Field`. `react-hook-form` está instalado pero no se usa.
- **UI:** reutilizar `@/global/ui` y `@/global/ui/custom/*`; no modificar `src/global/ui/sag`. El sistema de
  diseño del proyecto manda sobre `design-quality` y el resto de skills de diseño del orquestador.
- **Seguridad:** nada de secretos ni URLs internas en el código o en `NEXT_PUBLIC_*`; redirecciones
  solo con `sanitizeReturnTo()`; sin `dangerouslySetInnerHTML` con datos externos.
- **Sin hardcoding:** constantes con nombre; config solo vía `getEnv`/`getRequiredEnv` + `envMapping.ts`.
- **Git:** ramas `feature/HU[ID]_…`, `release/…`, `hotfix/…`; commits `<type>(<scope>): <subject>` en
  español imperativo y sin punto final. Los hooks de Husky validan rama, mensaje, build y lint, y suben
  la versión de `package.json` en el pre-push. Nunca `--no-verify`. Sin marcas de IA en commits ni PR.
- **Alcance:** cambios acotados a la HU; no commitear, hacer push ni crear ramas sin que se pida.
- **Plan antes de implementar:** lo exige el harness. Ante una funcionalidad o un cambio de varios archivos,
  el orquestador presenta el plan (archivos a crear o tocar, skills del proyecto que aplican, supuestos y
  preguntas abiertas) y las ediciones quedan bloqueadas hasta el «sí» de la persona. Lo trivial se pide
  con «directo».

## Skills del repositorio

Ubicadas en `.claude/skills/<nombre>/SKILL.md`. El harness las lista al iniciar la sesión, el orquestador
las pasa a los sub-agentes que las necesitan, y también se invocan escribiendo `/<nombre>` en el chat.
En su tema mandan sobre las skills del orquestador.

| Skill | Para qué |
|---|---|
| `integrate-bff-endpoint` | Integrar un endpoint del BFF: proxy `route.ts`, tipos, servicio, hook de query/mutation y manejo de errores |
| `create-module` | Crear un módulo en `src/modules` y su página en `src/app` (estructura, barrels, guard, rutas protegidas) |
| `create-component` | Crear o modificar UI con el kit SAG y `ui/custom` (tokens, `cn`, accesibilidad, `'use client'`) |
| `validate-form` | Formularios con zod, `Errores`, `Field`, limpieza de errores, 422 del BFF y Zustand |
| `review-code` | Revisar código nuevo con las severidades de CONTRIBUTING (ALTA/MEDIA/BAJA) y sugerir voto |
| `commit-and-pr` | Rama, mensaje de commit, versión en el pre-push y checklist y descripción de la PR (la PR la crea la persona) |
| `sync-rules` | Detectar desfases entre README/CONTRIBUTING y skills, agentes, constitución, permisos del harness, fuentes externas y CLAUDE.md, y proponer los ajustes (en el perfil del harness) |
| `project-conventions` | Índice: qué skill seguir según la tarea (sin reglas propias) |
| `best-practice` | Buenas prácticas de TypeScript, React 19, Next.js 16, TanStack Query, Zustand, zod, Tailwind, rendimiento, accesibilidad, seguridad y pruebas, para las versiones instaladas |
| `general-standards` | Consultar las Normas Generales SAG de la wiki de Azure DevOps (sesiones, SSO, CI/CD, Consul, estructura Next JS, documentación, componentes transversales) y comprobar si cambió una página vigilada |
| `external-sources` | Leer en solo lectura Figma y las carpetas permitidas de Drive, cuidar el cupo de Figma (20 lecturas al mes) y decidir cómo leer cada frame: captura para resumir, lectura completa para implementar |

**Una HU de punta a punta** es el flujo `sdd-ticket` del orquestador («desarrolla la HU 24576» o
`/sdd-ticket 24576`): lee el work item, sus hijos, comentarios, wiki y enlaces por el MCP de Azure DevOps, lee cada
frame de Figma, arma el plan y, con un solo «sí», implementa todo lo que no depende de una pregunta abierta, lo prueba,
lo compara contra el diseño y entrega el estado de cada criterio de aceptación con el commit y la PR redactados. Si
solo se pide leerla o resumirla, se entrega el resumen y no se implementa nada.

**Figma:** el diseño manda en los valores y no se inventa nada que no esté dibujado. Para implementar, cada frame se
lee completo (`figma-design` §1–3: contexto, variables y medidas) y se arma un inventario con el valor exacto de cada
tamaño, espacio, tipografía, color, radio, borde, sombra y texto, con su origen; lo que no se pudo leer queda «sin
dato» y se pregunta. Ese inventario viaja completo a `frontend-expert` y a quien revisa, y al final se compara el
resultado en el navegador, en números, contra él (`figma-design` §5). La captura no es fuente de valores. El cupo es de
20 lecturas al mes (≈3–4 por frame): `external-sources` lleva la cuenta y pide confirmación sobre el umbral; sin cupo,
esa pantalla no se implementa hasta tener los valores.

## Agentes del repositorio

Ubicados en `.claude/agents/<nombre>.md`. En este repo reemplazan a los sub-agentes genéricos del
orquestador para el código del frontend:

| Agente | En lugar de | Para qué |
|---|---|---|
| `frontend-expert` | `sdd-frontend-implementer` | Desarrollador Frontend senior del proyecto. Conoce el stack, la arquitectura y las normas, y carga bajo demanda las skills que la tarea requiera. Implementa las tareas del plan aprobado. |
| `frontend-reviewer` | `sdd-reviewer` (revisión final) | Revisor independiente de solo lectura (Opus). No escribió el código que revisa: lo contrasta con la constitución, las Normas Generales SAG, CONTRIBUTING, README y `best-practice`, corre `type-check`, `lint` y `npm test`, y devuelve hallazgos ALTA/MEDIA/BAJA con `archivo:línea`. |

El resto de los sub-agentes del orquestador (`sdd-explorer`, `sdd-test-writer`, `sdd-verifier`,
`sdd-ui-reviewer`, etc.) se usan como siempre, pasándoles las skills del proyecto que apliquen.

## Orquestación

El orquestador SDD del harness clasifica cada pedido y lleva el flujo: entender → plan → **aprobación
(GATE)** → implementación → verificación. En este repo:

1. **Planificar:** dividir la tarea en sub-tareas e indicar en cada una el agente, el modelo, los archivos,
   las skills del proyecto que aplican y el orden. En pedidos medianos y grandes, registrar el plan
   verificable (`sdd-harness.js trabajo plan`) antes de pedir el «sí».
2. **Elegir el modelo más eficiente para cada sub-tarea:**

   | Modelo | Sub-tareas | Agente |
   |---|---|---|
   | `haiku` | Búsquedas amplias y comandos con salida larga | `sdd-explorer` o `Explore` |
   | `sonnet` | Implementación habitual | `frontend-expert` |
   | `opus` | Arquitectura, lógica de negocio compleja y revisión final | `frontend-expert`; la revisión final, `frontend-reviewer` |

3. **Delegar:** los sub-agentes empiezan sin el contexto de la conversación, así que cada encargo incluye
   los archivos, las reglas de negocio, las decisiones y las skills del proyecto que necesita. Al delegar en
   `frontend-expert` después del «sí», indicar que el plan ya está aprobado. Las sub-tareas que toquen los
   mismos archivos van en secuencia.
4. **Supervisar:** revisar lo que devuelve cada sub-agente y confirmar con la verificación del harness el
   resultado real de lint, tipos y tests. Lo que el harness reporta «no verificado» nunca se presenta como
   verificado.

Quien aprueba es siempre una persona; el agente nunca se atribuye una aprobación (constitución VI).

## Azure DevOps

El harness lee Azure DevOps por su servidor MCP (sin token personal). Se registra una vez en este repo:

```bash
node "$HOME/.sdd-orquestador/install.js" --mcp=azure-devops --org=SubdepartamentoSolucionesTI --nombre=azure-sag --alcance=proyecto
```

Después se inicia sesión una vez (`/mcp` → `azure-sag` → Authenticate). Con eso:

| Necesito | Cómo |
|---|---|
| Leer una HU, sus tareas y bugs hijos | Flujo `sdd-ticket` (lectura libre) |
| Leer una página de la wiki (también Normas Generales) | Herramientas de wiki del MCP (lectura libre) |
| Comentar o cambiar el estado de un work item | El harness pide confirmación |
| Crear o actualizar una PR | **Bloqueado por el harness**: `commit-and-pr` redacta la descripción y la persona crea la PR |

La organización, el proyecto, el proceso y los estados válidos están en la memoria del proyecto
(`.sdd/memoria/MEMORIA.md`), como pide la skill `tracker-azure-boards`.

## Protecciones

Las aplica el harness por código (`.sdd/harness.json`, que también viene del perfil) y se suman a las suyas
de siempre:

- **GATE:** sin plan aprobado no se edita código.
- **Git:** commit, push y el resto de git que escribe piden confirmación; un commit con atribución de IA se
  bloquea. `git push --force`, `git push -f`, `git commit -n` y `git commit --no-verify` están denegados.
- **Dependencias:** instalar, actualizar o desinstalar piden confirmación (constitución III).
- **Secretos:** los `.env*` no se leen ni se editan con las herramientas del agente; un cambio de variable lo
  hace la persona (constitución IV).
- **Reglas del proyecto:** `imports-sin-padre` (`../` en `src/`), `kit-sag-solo-lectura` (`src/global/ui/sag`)
  y `sin-html-crudo` (`dangerouslySetInnerHTML`) se bloquean antes de escribir, con el mensaje de corrección.
  `sdd-harness.js reglas` revisa todo el repo.
- **Fuentes externas:** las herramientas de escritura, descarga y exportación de Figma y las de escritura de
  Google Drive y Google Docs están bloqueadas (`permisos.mcpBloquear`). Figma y Drive solo se leen
  (ver `external-sources`).
- **Verificación:** al terminar cada turno con código modificado corren lint, tipos y tests de lo tocado;
  los tres son obligatorios.

`.claude/settings.json` mantiene además los permisos nativos de Claude Code (preguntar y denegar) como
segunda capa y desactiva la atribución. Ya no registra hooks: el lint tras cada edición lo reemplaza la
verificación del harness al terminar el turno, y el aviso de cambios en la wiki de Normas Generales, la skill
`general-standards`. Las preferencias personales van en `.claude/settings.local.json` (ignorado por git).

## Mantener este contexto

- La fuente de este archivo, de `.claude/agents`, `.claude/rules`, `.claude/skills`, `.claude/settings.json` y
  de `.sdd/harness.json` es el perfil `perfiles/sag-laboratorio-frontend/` del repositorio `orquestador-ia`.
  Un cambio se hace ahí y se aplica con:

  ```bash
  node "$HOME/.sdd-orquestador/bin/sdd-harness.js" perfil aplicar sag-laboratorio-frontend             # vista previa
  node "$HOME/.sdd-orquestador/bin/sdd-harness.js" perfil aplicar sag-laboratorio-frontend --confirmar # aplica
  ```

  Después se commitea en este repo como cualquier cambio (por PR, con aprobación de una persona).
- Skills, agentes y `CLAUDE.md` se cargan al iniciar la sesión: tras modificarlos, abre una conversación
  nueva (o recarga VS Code) para ver los cambios.
- Si cambia una convención, actualiza primero `README.md`/`CONTRIBUTING.md` y luego la skill o el agente
  que la aplica, para que no se contradigan (skill `sync-rules`).
- Una skill nueva se agrega como `.claude/skills/<nombre>/SKILL.md` (frontmatter `name` y `description`),
  se registra en la tabla "Skills disponibles" de `.claude/agents/frontend-expert.md` y en la tabla de este archivo.
  Las skills solo para personas (`disable-model-invocation: true`) no van en la tabla del agente.
  El campo `skills` del agente solo precarga `project-conventions`, porque cada skill precargada se inyecta
  completa al iniciarlo.
- El nombre de una skill (carpeta y `name`) va en inglés y en kebab-case; su descripción y su contenido van en
  español. No uses el nombre de una skill del orquestador (`sdd-*`, `stack-*`, `code-review`…): en Claude Code
  la global prevalece sobre la del proyecto.
