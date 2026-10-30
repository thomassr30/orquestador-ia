---
name: sdd-propose
description: Redacta la propuesta de cambio (qué y por qué, alcance, fuera de alcance). Usar en la fase propose del flujo SDD.
---
# Proponer

ENTRADA: solicitud del usuario y hallazgos del explorer (en el mensaje). SALIDA: en tu respuesta (no crees archivo salvo que el usuario lo pida), con esta estructura:

```markdown
# Propuesta: <título>
## Problema / necesidad (citar la solicitud)
## Objetivo
## Alcance (incluye)
## Fuera de alcance
## Enfoque propuesto (alto nivel, 3-6 viñetas)
## Alternativas consideradas (y por qué se descartan)
## Impacto (módulos, datos, usuarios)
## Preguntas abiertas
```
Reglas: no inventes requisitos; todo lo que no esté en la solicitud va a "Preguntas abiertas". Explica lo necesario, sin relleno.
