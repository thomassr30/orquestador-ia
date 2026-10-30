---
name: sdd-spec
description: Escribe la especificación con requisitos numerados y escenarios Dado/Cuando/Entonces. Usar en la fase spec del flujo SDD.
---
# Especificar

ENTRADA: `proposal.md` (+ `requirements.md` si existe: cada HU/criterio de aceptación se traduce a REQ/escenarios con trazabilidad `HU-01 → REQ-01`; + `input.md` si necesitas citar). SALIDA: `changes/<id>/spec.md`

```markdown
# Especificación
## Requisitos funcionales
### REQ-01 <nombre>
<descripción verificable, en una o dos frases>
**Escenarios**
- Dado <contexto>, Cuando <acción>, Entonces <resultado observable>
- (casos borde y error)
## Requisitos no funcionales (rendimiento, seguridad, accesibilidad) — solo si aplican
## Reglas de negocio / validaciones
## Preguntas abiertas
```
Reglas: cada requisito debe ser testeable; IDs `REQ-NN` estables (no renumerar). Devuelve ≤10 líneas: nº de requisitos, escenarios y preguntas.
