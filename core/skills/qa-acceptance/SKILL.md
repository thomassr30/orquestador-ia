---
name: qa-acceptance
description: Proceso de QA funcional y aceptación (casos de prueba desde criterios de aceptación y spec, pruebas negativas, de borde, regresión y exploratorias, severidad, reporte de bugs y veredicto de aceptación). Usar en el sub-agente de QA funcional antes de dar un cambio por aceptado.
---
# QA funcional y aceptación

ENTRADA: criterios de aceptación, requisitos y entorno (en el mensaje del orquestador). SALIDA: informe en tu respuesta (no crees archivo salvo que el usuario lo pida).
Ejecución: web → `qa-web`; mobile → `qa-mobile`.

## Diseño de casos (antes de ejecutar)
- Un caso por escenario de aceptación (CA) + casos **negativos** (datos inválidos, sin permisos), **de borde** (límites, vacíos, máximos, fechas, caracteres especiales/tildes/ñ) y de **regresión** (funcionalidades vecinas que podrían romperse).
- **Exploratorio** con objetivo y tiempo acotado (charter: "Explorar <área> con <recursos> para descubrir <riesgos>", 15–30 min).
- Datos de prueba definidos y no productivos; nunca datos personales reales.

## Ejecución
- Registrar resultado por caso: ✅ pasa · ❌ falla · ⚠ bloqueado (con motivo) · — no aplica.
- Evidencia (captura o registro) en cada falla y en los casos críticos.
- No modificar código ni datos fuera de lo que el caso requiere.

## Reporte de bug (por cada falla)
```markdown
### BUG-01 · <título corto> · Severidad: crítica | alta | media | baja
Pasos: 1… 2… 3…
Esperado: … (CA/REQ de referencia)
Obtenido: …
Evidencia: captura/descr. · Entorno/versión: …
```
Severidad: **crítica** (bloquea flujo principal o pierde/corrompe datos), **alta** (función importante falla sin alternativa), **media** (falla con alternativa), **baja** (cosmético).

## Veredicto
- **ACEPTADO**: todos los CA pasan, sin bugs críticos/altos.
- **ACEPTADO CON OBSERVACIONES**: solo bugs medios/bajos documentados (el usuario decide si se corrigen ahora).
- **RECHAZADO**: algún CA falla o hay bug crítico/alto → proponer `/sdd-fix` por bug.
- Casos bloqueados nunca cuentan como aprobados. El veredicto final de aceptación lo confirma el usuario.

## Estructura del informe
Resumen (veredicto, entorno, versión, fecha) · Matriz CA/REQ → caso → resultado · Bugs · Exploratorio (hallazgos) · Pendientes manuales para el usuario.
