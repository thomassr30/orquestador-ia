---
name: sdd-design
description: Define arquitectura, contratos y decisiones técnicas del cambio. Usar en la fase design del flujo SDD.
---
# Diseñar

ENTRADA: requisitos y hallazgos (en el mensaje). SALIDA: diseño en tu respuesta (no crees archivo salvo que el usuario lo pida):
Carga las skills `stack-*` listadas en el stack detectado SOLO para respetar sus convenciones.

```markdown
# Diseño
## Componentes afectados (por capa: db / backend / frontend / mobile / infra)
## Modelo de datos (tablas, columnas, índices, migraciones)
## Contratos de API (método, ruta, request, response, códigos de error) — fuente de verdad para backend y frontend
## Componentes de UI (rutas, componentes, estados: carga, vacío, error)
## Brief de diseño (si hay UI nueva o rediseño; skill `design-shape`: trabajo, modo, límites, estados, dirección, verificar al final)
## Decisiones técnicas (ADR corto)
| # | Decisión | Alternativas | Motivo |
## Seguridad y validaciones
## Riesgos y mitigación
```
Reglas: si backend y frontend cambian, el contrato de API debe quedar cerrado aquí (permite implementar backend y frontend en paralelo). Explica las decisiones con lo necesario.
