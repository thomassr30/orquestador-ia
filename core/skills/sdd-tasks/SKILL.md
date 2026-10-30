---
name: sdd-tasks
description: Divide el cambio en tareas pequeñas por capa con dependencias y trazabilidad a requisitos. Usar en la fase tasks del flujo SDD.
---
# Planificar tareas

ENTRADA: `design.md` (o `explore.md` en fix), `spec.md`, `test-plan.md`. SALIDA: `changes/<id>/tasks.md`

```markdown
# Tareas
| ID | Capa | Tarea | Archivos previstos | Depende de | REQ | Tests | Estado |
|----|------|-------|--------------------|------------|-----|-------|--------|
| T1 | db | Migración tabla X + índice | migrations/... | — | REQ-01 | TP-01 | [ ] |
| T2 | backend | GET /x | src/x/... | T1 | REQ-02 | TP-02,TP-03 | [ ] |
| T3 | frontend | Filtro en listado | src/app/x/... | T2 (contrato) | REQ-03 | TP-04 | [ ] |
```
Reglas:
- Capa ∈ {db, backend, frontend, mobile}. Una tarea = un implementer, ≤ ~1 h de trabajo humano.
- Cada REQ cubierto por ≥1 tarea; cada tarea referencia sus tests de `test-plan.md`.
- Marca "(contrato)" cuando la dependencia es solo del contrato en design.md (habilita paralelo).
Devuelve ≤10 líneas: nº de tareas por capa, cuáles pueden ir en paralelo.
