---
name: sdd-propose
description: Redacta la propuesta de cambio (qué y por qué, alcance, fuera de alcance). Usar en la fase propose del flujo SDD.
---
# Proponer

ENTRADA: `input.md`, `explore.md`. SALIDA: `changes/<id>/proposal.md`

```markdown
# Propuesta: <título>
## Problema / necesidad (citar input.md)
## Objetivo
## Alcance (incluye)
## Fuera de alcance
## Enfoque propuesto (alto nivel, 3-6 viñetas)
## Alternativas consideradas (y por qué se descartan)
## Impacto (módulos, datos, usuarios)
## Preguntas abiertas
```
Reglas: no inventes requisitos; todo lo que no esté en input.md va a "Preguntas abiertas". Devuelve ≤10 líneas.
