---
name: multi-repo
description: Cambios que abarcan varios repositorios (backend, frontend, mobile, librerías, infraestructura) con un workspace declarado, contrato primero, tareas por repo, orden de despliegue y verificación por repo. Usar cuando un cambio afecte a más de un repositorio o el usuario trabaje con varios repos relacionados.
---
# Multi-repositorio

## Workspace
Archivo `.sdd/workspace.json` en una carpeta raíz común (o en el repo principal):
```json
{
  "nombre": "laboratorio",
  "repos": [
    { "nombre": "recepcion-api", "ruta": "../recepcion-api", "rol": "backend", "contrato": "openapi.yaml" },
    { "nombre": "solicitudes-api", "ruta": "../solicitudes-api", "rol": "backend" },
    { "nombre": "lab-front", "ruta": "../lab-front", "rol": "frontend" },
    { "nombre": "lab-infra", "ruta": "../lab-infra", "rol": "infra" }
  ]
}
```
Gestión: `node "{{SDD_HOME}}/bin/sdd-workspace.js" init|add <nombre> <ruta> <rol>|list|check`.
- La IA debe tener acceso a todas las rutas (Claude Code: abrir en la carpeta raíz común o agregar directorios adicionales con `/add-dir`; en otras herramientas, abrir la carpeta padre).
- Cada repo conserva su propia memoria (`.sdd/memoria/`); el workspace puede tener una memoria propia para lo transversal (contratos, dependencias entre servicios).

## Flujo de un cambio multi-repo
1. El cambio (`changes/<id>/`) vive en la raíz del workspace o en el repo principal; `stack.json` se genera **por repo** (`stack.<repo>.json`).
2. **Contrato primero**: si cambia una API entre repos, `design.md` define el contrato (OpenAPI/tipos) y es la fuente de verdad. Cambios incompatibles → versionar el endpoint o desplegar en orden compatible.
3. `tasks.md` agrega la columna **Repo**; cada implementer trabaja solo en la ruta de su repo.
4. **Orden de implementación y despliegue**: proveedor antes que consumidor (BD → backend → frontend/mobile), con compatibilidad hacia atrás durante la transición.
5. **Verificación por repo** (tests/lint/build de cada uno) + prueba de integración entre servicios si es posible.
6. Entrega: un commit/PR por repo con referencias cruzadas (mismo ticket, enlaces entre PRs) — solo propuestos.
