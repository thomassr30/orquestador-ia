---
name: sdd-doc
description: Genera documentación técnica formal en español (arquitectura, API, modelo de datos, módulos) a partir del código. Usar cuando el usuario pida documentar el proyecto o parte de él, o escriba /sdd-doc.
---
# /sdd-doc — Documentación técnica

Qué documentar: $ARGUMENTS
(Ej.: `arquitectura general`, `API de muestras`, `modelo de datos`, `módulo de autenticación`.)

1. Carga la skill `sdd-orchestrator`.
2. Si no está claro: pregunta tipo de documento, audiencia (técnica / gestión) y ruta de salida (por defecto `docs/`).
3. Crea el cambio: `node "{{SDD_HOME}}/bin/new-change.js" --type doc "<tema>"`
4. Delega `explore` (con foco en el tema) y luego `doc` en `sdd-doc-writer`.
5. Muestra la ruta del documento y las "Preguntas abiertas / información no verificable" que haya dejado.
