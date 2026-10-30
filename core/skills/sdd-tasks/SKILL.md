---
name: sdd-tasks
description: Divide el cambio en tareas pequeñas por capa con dependencias y trazabilidad a requisitos. Usar en la fase tasks del flujo SDD.
---
# Planificar tareas

ENTRADA: diseño, requisitos y plan de tests (en el mensaje). SALIDA: en tu respuesta (no crees archivo salvo que el usuario lo pida):

```markdown
# Tareas
| ID | Capa | Repo* | Tarea | Archivos previstos | Depende de | REQ | Tests | Estado |
|----|------|-------|--------------------|------------|-----|-------|--------|
| T1 | db | Migración tabla X + índice | migrations/... | — | REQ-01 | TP-01 | [ ] |
| T2 | backend | GET /x | src/x/... | T1 | REQ-02 | TP-02,TP-03 | [ ] |
| T3 | frontend | Filtro en listado | src/app/x/... | T2 (contrato) | REQ-03 | TP-04 | [ ] |
```
Reglas:
- *Columna Repo solo en cambios multi-repo (skill `multi-repo`).
- Capa ∈ {db, backend, frontend, mobile, infra}. Una tarea = un implementer, ≤ ~1 h de trabajo humano.
- Cada REQ cubierto por ≥1 tarea; cada tarea referencia sus tests.
- Marca "(contrato)" cuando la dependencia es solo del contrato en el diseño del plan (habilita paralelo).
Indica explícitamente qué tareas pueden ir en paralelo (archivos disjuntos) y cuáles dependen de otras.
