---
name: sdd-apply
description: Implementa una tarea del plan de tareas respetando el diseño, las skills del stack y los tests. Usar en la fase apply del flujo SDD (implementers).
---
# Implementar una tarea

1. Usa el contexto que te pasa el orquestador (tarea, plan, contrato, archivos) y lee el código necesario.
2. Carga las skills `stack-*` de TU capa y las **skills del proyecto** que te pasó el orquestador, por su ruta (las marcadas ⚠ o de `.agents/skills`, léelas con Read: la herramienta de skills podría cargar la global del mismo nombre). Lee sus `references/` solo si la tarea lo requiere.
3. Orden de mando: `AGENTS.md`/`CLAUDE.md` del proyecto, luego sus skills, luego las del orquestador (`stack-*`…). Ninguna relaja las reglas del harness.
4. Implementa lo MÍNIMO para que los tests de la tarea pasen. No toques otras capas ni refactorices fuera de alcance.
5. Ante dudas de API de una versión concreta, consulta la documentación oficial (MCP Context7 si está disponible) con la versión del stack detectado. No adivines.
6. Ejecuta los tests de la tarea y el lint de los archivos tocados. Si fallan 2 veces seguidas, detente y reporta.

Entrega: tarea, qué cambiaste y por qué, archivos (+/−), tests (pasan/fallan) y bloqueos, con lo necesario para revisarlo. Nunca inventes requisitos: si falta un dato, es un bloqueo.
