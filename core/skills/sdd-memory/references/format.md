# Formato y presupuestos de la memoria

## MEMORIA.md (índice — se lee en CADA flujo, debe ser mínimo)
```markdown
# Memoria — <proyecto>
_Actualizada: AAAA-MM-DD_

## Qué es (2 líneas)
## Stack (1 línea por capa, versiones desde manifiestos)
## Mapa de módulos (ruta → responsabilidad, ≤ 12 líneas)
## Convenciones clave (≤ 8 viñetas; solo las que no están en AGENTS.md)
## Comandos (test, lint, build, levantar local)
## Temas disponibles
- `temas/configuracion.md` — Consul KV, variables, claves por entorno
- `temas/despliegue.md` — pipeline, k8s, verificación post-despliegue
## Decisiones vigentes más importantes (≤ 5, con enlace a decisiones.md)
```
Presupuesto: **≤ 60 líneas / ~4 KB**.

## decisiones.md
```markdown
## D-012 · 2026-10-30 · vigente
**Decisión:** Recepción lee credenciales de BD desde `dbConfig.labdesa`.
**Motivo:** La clave anterior no existía en el KV del entorno; el pod fallaba en `DB_HOST`.
**Fuente:** cambio 2026-10-30-recepcion-lee-credenciales-bd-desde-dbco
```
Estados: `vigente` | `reemplazada por D-0XX` | `revertida`. Presupuesto: ≤ 300 líneas antes de compactar.

## temas/<tema>.md
Hechos por área, agrupados por subtítulo, con fecha/fuente al final de cada viñeta. Presupuesto: ≤ 150 líneas por tema.

## pendientes.md
`- [ ] <riesgo/deuda/pregunta> — origen: <cambio> — fecha`. Se marca `[x]` y se elimina en la siguiente compactación cuando se resuelve.

## historial.md
`AAAA-MM-DD · <id> · <tipo> · <resumen ≤ 15 palabras> · archivos clave`. Presupuesto: ≤ 200 líneas (luego se resume por mes).

## sesion.md
Objetivo · Hecho · Falta · Decisiones de la sesión · Archivos clave · Próximos pasos · Dudas. ≤ 40 líneas. Se sobrescribe en cada "guardar".

## Prohibido en memoria
Secretos, contraseñas, tokens, cadenas de conexión con credenciales, datos personales, contenido de clientes, valores reales del KV (solo NOMBRES de claves).
