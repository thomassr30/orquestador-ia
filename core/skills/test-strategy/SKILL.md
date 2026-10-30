---
name: test-strategy
description: Decide qué tipos de test aplicar a un cambio y produce test-plan.md con trazabilidad REQ → test. Usar en el Test Planner y Test Writer del flujo SDD.
---
# Estrategia de testing

## Tipos mínimos según el cambio
| Cambio | Tests obligatorios (skill) |
|---|---|
| Lógica de negocio | unit (`test-unit`) |
| Endpoint nuevo/modificado | unit + integración (`test-integration`) + contrato (`test-api-contract`) |
| Query, migración, procedimiento | BD (`test-db`) + integración |
| Componente UI | unit de componente (`test-unit`) + accesibilidad (`test-a11y`) |
| Flujo de usuario completo | e2e (`test-e2e`) + visual (`test-visual`) si hay cambios de diseño |
| Auth, permisos, datos sensibles | + seguridad (`test-security`) |
| Endpoint o página de alto tráfico | + rendimiento (`test-performance`) |
| Bug (fix) | + 1 test de regresión que reproduce el bug |

No agregues tipos que no aporten: menos tests bien elegidos > muchos tests frágiles.

## Salida: `changes/<id>/test-plan.md`
```markdown
# Plan de pruebas
| TP | REQ | Tipo | Caso (Dado/Cuando/Entonces resumido) | Archivo | Estado |
|----|-----|------|--------------------------------------|---------|--------|
| TP-01 | REQ-01 | unit | ... | (lo completa el test-writer) | pendiente |
## Datos de prueba / fixtures
## Fuera de alcance de pruebas (y por qué)
```
Reglas: cada REQ con ≥1 TP; casos de borde y error incluidos; usa los runners de `stack.json`.
