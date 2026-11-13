---
name: project-conventions
description: Índice de las skills de convenciones del frontend SAG. Usar al empezar cualquier tarea de código para saber qué skill seguir (módulo nuevo, formulario, endpoint del BFF, componente, commit o PR). No tiene reglas propias.
user-invocable: false
---

# Índice de convenciones

Es un índice: **no define reglas propias** y no las duplica. Cada skill de la tabla es la fuente de su tema;
las Normas Generales SAG están en la skill `general-standards`, las del repo en `CONTRIBUTING.md` y `README.md`, y lo que no se rompe, en `.claude/rules/constitution.md`.

| Qué se va a hacer | Skill a seguir |
|---|---|
| Crear un módulo, una pantalla o una ruta nueva | `create-module` |
| Crear o cambiar un formulario, un paso de wizard o filtros con validación | `validate-form` |
| Consumir un endpoint del BFF (proxy, tipos, servicio, hook) | `integrate-bff-endpoint` |
| Crear o cambiar una pieza de UI | `create-component` |
| Crear una rama, hacer un commit o preparar una PR | `commit-and-pr` |
| Aclarar una norma SAG, tocar sesiones o Consul, evaluar un componente transversal o comprobar si cambió la wiki | `general-standards` |
| Leer un diseño de Figma (para especificar o para implementar) o documentación de Drive (solo lectura) | `external-sources` (y para implementar, la lectura completa de `figma-design`) |
| Leer o resumir una HU (solo lectura) o trabajarla | flujo `sdd-ticket` del orquestador |

Para la calidad general del código (React, Next.js, TanStack Query, Zustand, zod, Tailwind, rendimiento, accesibilidad y
pruebas), ver `best-practice`. Para revisar cambios, `review-code`.

## El molde es el código hermano

Ante la duda, imita el archivo más cercano del mismo módulo (nombres, densidad de comentarios, estructura). Si una guía
externa choca con el repo, gana el repo.
