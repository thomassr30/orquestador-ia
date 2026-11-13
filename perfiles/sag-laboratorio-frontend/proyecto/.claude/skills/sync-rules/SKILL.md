---
name: sync-rules
description: Detecta desfases entre las normas del proyecto (README.md y CONTRIBUTING.md) y el contexto de la IA (skills de .claude/skills, agentes frontend-expert y frontend-reviewer, constitución, permisos de .claude/settings.json, reglas y permisos del harness en .sdd/harness.json, fuentes externas y CLAUDE.md), y propone los ajustes antes de aplicarlos en el perfil del harness. Usar cuando se modifique README.md, CONTRIBUTING.md, CLAUDE.md, algo dentro de .claude/ o .sdd/harness.json, cuando se agregue o quite una skill, o cuando se pida sincronizar, alinear o revisar la consistencia de las reglas, skills o agentes.
---

# Sincronizar reglas

Precedencia: constitución > Normas Generales SAG > `CONTRIBUTING.md` y `README.md` > skills y código.
`README.md` (código) y `CONTRIBUTING.md` (Git Flow, commits, PR, revisión) son la **fuente de
verdad** de lo que está bajo ellos según esa precedencia; ante discrepancia entre ellos manda la Guía
de Desarrollo SAG citada en CONTRIBUTING. Las skills, los agentes, `CLAUDE.md`, `.claude/settings.json` y
`.sdd/harness.json` **aplican** esas normas: nunca las corrigen. La constitución queda por encima de README y
CONTRIBUTING: con esta skill solo se reporta. El objetivo es que no se contradigan.

**Dónde se corrige.** `CLAUDE.md`, `.claude/agents`, `.claude/rules`, `.claude/skills`, `.claude/settings.json` y
`.sdd/harness.json` vienen del perfil `sag-laboratorio-frontend` del harness (`orquestador-ia/perfiles/sag-laboratorio-frontend/`:
`proyecto/` tiene los archivos y `harness.json` el fragmento de `.sdd/harness.json`). Un ajuste aprobado se hace en el
perfil y se aplica con `sdd-harness.js perfil aplicar sag-laboratorio-frontend`: si solo se corrige en este repo, la
próxima vez que se aplique el perfil se pierde. Si el repositorio del harness no está abierto en la sesión, entrega el
ajuste como texto para que la persona lo lleve al perfil.

## 1. Qué cambió

```bash
git diff origin/develop...HEAD --stat -- README.md CONTRIBUTING.md CLAUDE.md .claude/ .sdd/harness.json
git diff origin/develop...HEAD -- README.md CONTRIBUTING.md
git diff origin/develop...HEAD -- CLAUDE.md .claude/ .sdd/harness.json
git ls-files --others --exclude-standard -- .claude/ .sdd/
```

Incluir también `git diff` y `git diff --staged` si hay cambios sin commitear. Los diffs cubren los
archivos con seguimiento, pero no muestran los archivos nuevos sin seguimiento: para eso está
`git ls-files --others`. Si `origin/develop` puede estar desactualizado, dilo (traerlo es un `git fetch`, que
pide confirmación). Si no cambió nada de eso, o se pidió una revisión completa, comparar el estado actual de
todos los archivos. `node "$HOME/.sdd-orquestador/bin/sdd-harness.js" perfil aplicar sag-laboratorio-frontend`
(sin `--confirmar`) muestra en qué difiere el repo del perfil.

## 2. Qué revisar

| Archivo | Buscar |
|---|---|
| `.claude/skills/*/SKILL.md` | Reglas que contradicen la versión nueva; ejemplos de código que ya no siguen el patrón; referencias a secciones (`README.md` → "…") que se renombraron o eliminaron; nombres de funciones, archivos o componentes que ya no existen |
| `.claude/agents/frontend-expert.md` | Lo mismo, más la tabla "Skills disponibles": debe listar las carpetas de `.claude/skills/`, salvo las marcadas `disable-model-invocation: true` (solo para personas). Su campo `skills` solo precarga `project-conventions` |
| `.claude/agents/frontend-reviewer.md` | Lo mismo que `frontend-expert` (contradicciones y referencias); su campo `skills` apunta a skills que existen; su lista de comandos permitidos es de solo lectura |
| `.claude/rules/constitution.md` | Contradicciones con skills y agentes. **Se reporta y nunca se corrige con esta skill**: solo la cambia una persona por PR |
| `.sdd/harness.json` | Que `reglas`, `permisos` y `sensores.obligatorios` coincidan con la sección "Protecciones" de `CLAUDE.md` y con la constitución (imports, kit SAG, HTML crudo, git, Figma y Drive de solo lectura). Un cambio de permisos o reglas nunca se aplica sin aprobación explícita de la persona |
| `.claude/settings.json` | Que `ask` y `deny` no contradigan `.sdd/harness.json` ni la sección "Protecciones" de `CLAUDE.md`, y que no registre hooks que ya no existen. Un cambio de permisos nunca se aplica sin aprobación explícita de la persona |
| `.claude/skills/external-sources/SKILL.md` y `references/drive.md` | Reglas y carpetas no se contradicen; las categorías que su `SKILL.md` declara bloqueadas (crear, editar, copiar, compartir, borrar) tienen sus herramientas en `permisos.mcpBloquear` de `.sdd/harness.json` y en `deny` de `settings.json`, y ninguna lectura que la skill usa está bloqueada. No abrir Drive ni Figma para esto |
| `CLAUDE.md` | Tabla de skills y de agentes completa y con las descripciones vigentes; módulos actuales, comandos y estructura alineados con `src/` y `package.json` |
| `.sdd/memoria/MEMORIA.md` | Stack, módulos, comandos y datos de Azure DevOps alineados con `CLAUDE.md` y `package.json`. La memoria es del equipo: el ajuste se propone en este repo, no en el perfil |
| `README.md` / `CONTRIBUTING.md` | Contradicciones entre los dos, o con el código (p. ej. una función citada que no existe). **Se reportan, no se corrigen solas**: definir cuál vale es decisión del equipo |
| `.claude/skills/general-standards/references/normas.md` y `fuentes.md` | `normas.md` contra `README.md` y `CONTRIBUTING.md`; `fuentes.md` con las páginas vigiladas y su versión revisada. Si `normas.md` y README/CONTRIBUTING difieren, **se avisa y se pregunta, sin corregir solo**: cuál vale lo decide la persona. No se copian valores de la wiki ni se actualiza la versión revisada sin su aprobación |

Para validar nombres citados, buscarlos en `src/` o en `.claude/`, según corresponda (`Grep`). Un nombre que no aparece es hallazgo.
Que el repo y el perfil difieran también es hallazgo: indica cuál de los dos tiene la versión vigente.

## 3. Reporte

Antes de editar, mostrar el reporte agrupado por archivo:

```
.claude/skills/validate-form/SKILL.md
- Línea 12: cita README → "Formularios", la sección ahora se llama "Formularios y validación".
  Propuesta: actualizar la referencia (en el perfil del harness).

CONTRIBUTING.md ↔ código
- CONTRIBUTING cita `resolveModuleDestination()`, en src/ solo existe `sanitizeReturnTo()`.
  Requiere decisión: ¿cuál es la vigente?
```

Si no hay desfases, decirlo en una línea. No inventar hallazgos.

## 4. Aplicar

- Solo tras la aprobación del usuario, y solo lo aprobado.
- En el perfil del harness, salvo la memoria del proyecto (ver "Dónde se corrige"). Aplicar el perfil al repo
  (`perfil aplicar … --confirmar`) es decisión de la persona y el harness pide su confirmación.
- `.claude/rules/constitution.md` nunca se edita con esta skill: solo se reporta y la cambia una
  persona por PR.
- `.claude/settings.json` y `.sdd/harness.json` (permisos y reglas) solo se editan con aprobación explícita de la persona.
- Cambios mínimos: corregir la regla, la referencia o el ejemplo, sin reescribir la skill.
- En las skills, preferir referenciar la sección del README/CONTRIBUTING en vez de copiar la regla.
- Skill nueva o eliminada: actualizar la tabla "Skills disponibles" de `frontend-expert` (salvo las de `disable-model-invocation: true`) y la tabla de `CLAUDE.md`.
- Recordar al final que los cambios en skills, agentes y `CLAUDE.md` se ven en una conversación
  nueva (o recargando VS Code).

## Checklist

- [ ] Diff de README/CONTRIBUTING revisado (o revisión completa si se pidió)
- [ ] Skills, agentes y `CLAUDE.md` contrastados con la versión vigente
- [ ] `frontend-reviewer`: `skills` existentes y comandos de solo lectura
- [ ] `constitution.md` contrastada con skills y agentes (solo se reporta)
- [ ] `.sdd/harness.json` (`reglas`, `permisos`, `sensores.obligatorios`) y `settings.json` (`ask`, `deny`, sin hooks huérfanos) contra "Protecciones" de `CLAUDE.md`
- [ ] `external-sources` (`SKILL.md` y `drive.md`) sin contradicciones, con las categorías de escritura que declara bloqueadas en `mcpBloquear` y `deny`, y ninguna lectura que usa bloqueada
- [ ] Nombres citados verificados en `src/` o en `.claude/`, según corresponda
- [ ] Tabla "Skills disponibles" de `frontend-expert` = carpetas de `.claude/skills/` (salvo las `disable-model-invocation: true`); su campo `skills` solo precarga `project-conventions`
- [ ] Repo y perfil del harness sin diferencias no explicadas
- [ ] Reporte mostrado y aprobado antes de editar; constitución nunca editada (solo reportada); permisos y reglas solo con aprobación explícita
