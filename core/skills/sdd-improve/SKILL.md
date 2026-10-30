---
name: sdd-improve
description: Mejora continua conservadora del orquestador — registra incidentes de los agentes y, solo cuando hay evidencia suficiente, propone pocos ajustes concretos a reglas, skills o agentes (preferir editar antes que crear) y poda de lo que sobra, siempre con aprobación. Usar cuando el usuario pida registrar un incidente o revisar/mejorar el orquestador, o con /sdd-improve.
---
# Mejora continua (conservadora)

Registro: `{{SDD_SOURCE}}/mejora/registro.md` (repo del orquestador, versionado por el usuario).
Script: `node "{{SDD_HOME}}/bin/sdd-improve.js" log|summary|resolve`.

## 1. Registrar (solo si el usuario lo pide)
Al cerrar un trabajo, el orquestador menciona en el chat los incidentes del propio sistema; se registran solo si el usuario dice que sí. Tipos válidos:
- `regla-violada`: un agente incumplió una regla existente (ej. anuló un RECHAZADO, ejecutó git).
- `correccion-usuario`: el usuario corrigió el **comportamiento** del agente (no un cambio de requisitos).
- `gate-fallido`: el verifier/QA rechazó por algo que el proceso debió prevenir.
- `reintentos`: se agotaron los 2 reintentos.
- `conocimiento-faltante`: faltó información de una tecnología/plataforma que no está en ninguna skill.
```
node "{{SDD_HOME}}/bin/sdd-improve.js" log <tipo> <alta|media|baja> <componente> "<descripción ≤ 20 palabras>" "<proyecto>/<cambio>"
```
No registrar: bugs normales del código del proyecto, errores de tipeo, fallos de red/entorno, cambios de opinión del usuario.

## 2. Decidir (solo con evidencia suficiente)
Umbral para proponer algo: **≥ 2 ocurrencias** del mismo problema en cambios distintos, **o 1 de severidad alta** (seguridad, pérdida de datos, producción, decisión crítica sin aprobación).

Árbol de decisión — elige la **primera** opción que resuelva:
1. ¿Se resuelve con el flujo normal o fue puntual? → **ninguna acción** (queda registrado).
2. ¿Es propio de UN proyecto? → `AGENTS.md` o memoria de ese proyecto, **no** el orquestador global.
3. ¿Ya existe una regla que se ignoró? → **reforzar esa regla** (redacción más clara, moverla más arriba). No duplicarla en otro lado.
4. ¿Falta conocimiento dentro del dominio de una skill existente? → **agregar ≤ 3 líneas** a esa skill o a su `references/`.
5. ¿Tecnología/plataforma nueva necesitada en ≥ 2 proyectos o pedida explícitamente por el usuario? → **skill nueva**, ≤ 60 líneas, sin solaparse con otras, con justificación.

Nunca: crear una skill por un único error, duplicar reglas, agrandar el orquestador o las reglas globales si cabe en una skill específica.

## 3. Proponer (máximo 3 propuestas por revisión)
Por propuesta: problema (con ocurrencias del registro), opción del árbol elegida y por qué no una más simple, **diff exacto**, líneas agregadas/eliminadas, riesgo. Esperar aprobación del usuario.

## 4. Aplicar (tras el "sí")
1. Editar en `{{SDD_SOURCE}}/core/...` (nunca en las copias instaladas).
2. `node "{{SDD_SOURCE}}/install.js"` para reinstalar.
3. `node "{{SDD_HOME}}/bin/sdd-improve.js" resolve <n° de líneas del registro> "P-00X: <resumen>"`.
4. Proponer (sin ejecutar) el commit en el repo del orquestador y la entrada en `CHANGELOG.md`.

## 5. Podar (en cada revisión)
Busca y propone eliminar o fusionar: reglas duplicadas, skills que se solapan, referencias obsoletas (versiones antiguas), instrucciones que nunca aplican. Menos y más claro es mejor.
