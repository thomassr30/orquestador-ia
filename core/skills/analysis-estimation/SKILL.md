---
name: analysis-estimation
description: Estimación de esfuerzo de un requerimiento o cambio (desglose por historia y capa, estimación de tres puntos, rangos, supuestos, riesgos y contingencia). Usar cuando el usuario pida estimar, dimensionar o planificar un trabajo.
---
# Estimación

ENTRADA: análisis o plan (en el mensaje), hallazgos del explorer y memoria si existe. SALIDA: estimación en tu respuesta (no crees archivo salvo que el usuario lo pida).

## Método
1. **Desglose** por historia y por capa (análisis, backend, frontend, mobile, BD, infra, QA, documentación, despliegue). Ítems de ≤ 2 días; si es mayor, dividir.
2. **Tres puntos** por ítem: optimista (O), más probable (M), pesimista (P) → esperado `E = (O + 4M + P) / 6`.
3. **Rango total** (no un número único): suma de E ± variabilidad; presentar como "entre X y Y días/horas-persona".
4. **Incluye lo que se olvida**: revisión de código, pruebas funcionales/UAT, correcciones, despliegues, reuniones de validación, documentación.
5. **Supuestos** explícitos (ej. "la API externa ya existe y está documentada") y **riesgos** con impacto en la estimación.
6. **Contingencia** justificada según incertidumbre (más alta si hay preguntas abiertas o integraciones nuevas).
7. Unidad según el equipo: horas, días-persona o puntos de historia (si el equipo usa puntos, no convertir a horas sin pedírselo).

## Estructura de la respuesta
```markdown
# Estimación: <título> — <fecha>
| Ítem | Capa | O | M | P | Esperado |
## Total esperado y rango
## Supuestos
## Riesgos (impacto en la estimación)
## Fuera de la estimación
## Nivel de confianza: alto | medio | bajo (y por qué)
```
La estimación es una propuesta para que el usuario la ajuste; nunca se comunica al cliente sin su revisión.
