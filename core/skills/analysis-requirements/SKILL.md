---
name: analysis-requirements
description: Análisis funcional de requerimientos (elicitación, historias de usuario INVEST, criterios de aceptación Dado/Cuando/Entonces, reglas de negocio, requisitos no funcionales, glosario, priorización y preguntas para el cliente). Usar al recibir un requerimiento de negocio (documento, correo, acta, ticket) o cuando una solicitud es ambigua.
---
# Análisis de requerimientos

ENTRADA: `changes/<id>/input.md` (+ `explore.md` y memoria si existen). SALIDA: `changes/<id>/requirements.md` y `changes/<id>/preguntas-cliente.md`.

## Procedimiento
1. **Entender el objetivo de negocio**: problema, quién lo tiene, cómo se mide el éxito. Si no está, es la primera pregunta.
2. **Identificar actores** (roles de usuario y sistemas externos) y el **alcance** (qué entra y qué no).
3. **Escribir historias de usuario** (INVEST: independientes, negociables, valiosas, estimables, pequeñas, testeables):
   `HU-01 · Como <rol>, quiero <capacidad>, para <beneficio>.`
4. **Criterios de aceptación** por historia, en escenarios verificables:
   `Dado <contexto>, Cuando <acción>, Entonces <resultado observable>` — incluye casos alternativos y de error.
5. **Reglas de negocio** numeradas (RN-01…) separadas de la UI: validaciones, cálculos, estados, permisos.
6. **Requisitos no funcionales** solo si aplican y medibles: rendimiento, seguridad, disponibilidad, accesibilidad, auditoría/trazabilidad, normativa de datos personales.
7. **Glosario** de términos del dominio (evita ambigüedad entre cliente y equipo).
8. **Priorización** MoSCoW (Must/Should/Could/Won't) cuando haya más de lo que cabe en una entrega.
9. **Preguntas para el cliente**: todo lo ambiguo, contradictorio o faltante → `preguntas-cliente.md` (agrupadas por tema, con opción sugerida cuando ayude a decidir rápido). NUNCA rellenar con supuestos silenciosos; si hay que asumir, se marca `SUPUESTO-0N` y se lista.

## Formato `requirements.md`
```markdown
# Requerimientos: <título>
## Objetivo de negocio y métrica de éxito
## Actores
## Alcance / Fuera de alcance
## Historias de usuario (con criterios de aceptación) — HU-01…
## Reglas de negocio — RN-01…
## Requisitos no funcionales — RNF-01…
## Supuestos — SUPUESTO-01… (requieren validación)
## Glosario
## Trazabilidad: fuente (sección/página de input.md) → HU/RN
```
Para diagramas de procesos, estados o datos usa `analysis-modeling`; para estimar, `analysis-estimation`.
