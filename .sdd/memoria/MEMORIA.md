# Memoria — orquestador-ia
_Actualizada: 2026-11-02_

## Qué es
Harness local de hooks y guías SDD para varios asistentes de programación.

## Stack
JavaScript CommonJS en Node.js; comandos y pruebas definidos en package.json.

## Mapa de módulos
- `harness/src/core.js`: ciclo de eventos y sensores al cerrar.
- `harness/src/policy.js`, `gate.js`: políticas y aprobaciones.
- `harness/src/state.js`: persistencia de sesiones y registro local.
- `harness/src/adapters/`: contratos por asistente.
- `harness/src/sensors.js`: detección y ejecución de verificaciones.
- `core/`: agentes, skills y reglas distribuidas.
- `bin/sdd-eval.js`: evaluación de tareas mediante Claude CLI.

## Comandos
`npm test`; `node bin/sdd-memory.js stats`.

## Contexto relevante
La revisión de completitud del harness está en `pendientes.md`; son propuestas sin aprobación de implementación.
Fuente del mapa: revisión de código 2026-11-02, harness/src/core.js y package.json.
