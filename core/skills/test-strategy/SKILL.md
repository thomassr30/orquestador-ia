---
name: test-strategy
description: Decide qué tipos de test aplicar a un cambio y produce el plan de pruebas con trazabilidad REQ → test. Usar en el Test Planner y Test Writer del flujo SDD.
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
| Pantalla o lógica mobile (RN, iOS, Android) | unit + componente/UI según plataforma (`test-mobile`) |
| Flujo crítico mobile | + E2E mobile (Maestro/Detox, XCUITest, Compose UI test) |
| Uso de hardware o permisos | + tests con fakes del servicio (concedido / denegado / no disponible) |
| Bug (fix) | + 1 test de regresión que reproduce el bug |

No agregues tipos que no aporten: menos tests bien elegidos > muchos tests frágiles.

## Salida (en tu respuesta (no crees archivo salvo que el usuario lo pida))
```markdown
# Plan de pruebas
| TP | REQ | Tipo | Caso (Dado/Cuando/Entonces resumido) | Archivo | Estado |
|----|-----|------|--------------------------------------|---------|--------|
| TP-01 | REQ-01 | unit | ... | (lo completa el test-writer) | pendiente |
## Datos de prueba / fixtures
## Fuera de alcance de pruebas (y por qué)
```
Reglas: cada REQ con ≥1 TP; casos de borde y error incluidos; usa los runners del stack detectado.

## Código difícil de testear
Si el código bajo prueba no es testeable tal cual (lee configuración/red/BD al cargar el módulo, efectos al importar, estado global):
- Propón la **mínima extracción** que lo haga testeable (ej. función pura que recibe el objeto de configuración y devuelve el resultado o lanza el error) y marca esa tarea en el plan.
- Si se decide NO extraer, regístralo en el plan de pruebas → "Excepciones propuestas" con motivo y riesgo, para que el orquestador lo lleve al GATE. Nunca lo omitas en silencio.
- Pruebas manuales (TP de despliegue) se listan aparte como **verificación manual**, con responsable "usuario".
