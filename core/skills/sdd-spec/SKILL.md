---
name: sdd-spec
description: Escribe la especificación con requisitos numerados y escenarios Dado/Cuando/Entonces. Usar en la fase spec del flujo SDD.
---
# Especificar

ENTRADA: la propuesta (+ el análisis de requerimientos si existe: cada HU/criterio de aceptación se traduce a REQ/escenarios con trazabilidad `HU-01 → REQ-01`; + la solicitud si necesitas citar). SALIDA: en tu respuesta (no crees archivo salvo que el usuario lo pida)

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
Reglas: cada requisito debe ser testeable; IDs `REQ-NN` estables (no renumerar). Entrega los requisitos completos en tu respuesta (sin crear archivos).
