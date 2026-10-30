---
name: sdd-memory
description: Memoria persistente del proyecto en .sdd/memoria (índice compacto, decisiones, temas, historial, contexto de sesión) con lectura selectiva para ahorrar tokens y compactación sin perder información. Usar al iniciar cualquier flujo SDD (leer índice), al cerrar un cambio (actualizar), cuando el usuario pida recordar/guardar/compactar/olvidar algo del proyecto, antes de compactar la sesión, o con /sdd-memory.
---
# Memoria del proyecto

Acción pedida: $ARGUMENTS (ver | guardar | compactar | olvidar <x> | init). Sin argumento → "ver".

Formato y presupuestos: `references/format.md`. Compactación: `references/compaction.md`.

## Estructura (en la raíz del proyecto)
```
.sdd/memoria/
├── MEMORIA.md       # ÍNDICE compacto (≤ 60 líneas): qué es, stack, mapa de módulos, convenciones, comandos, temas
├── decisiones.md    # registro de decisiones (ADR corto), con estado vigente/reemplazada
├── temas/<tema>.md  # conocimiento por área (configuración, despliegue, un módulo…) — se lee solo si aplica
├── pendientes.md    # deuda técnica, riesgos, preguntas abiertas que siguen vigentes
├── historial.md     # una línea por cambio cerrado
└── sesion.md        # contexto de trabajo actual (para retomar tras compactar o en otra sesión)
```
Crear con: `node "{{SDD_HOME}}/bin/sdd-memory.js" init`. Ver tamaños: `node "{{SDD_HOME}}/bin/sdd-memory.js" stats`.

## Leer (barato y selectivo)
1. Al iniciar un flujo: lee SOLO `MEMORIA.md` (índice) y `sesion.md` si existe y es reciente.
2. Según la tarea, el índice indica qué `temas/*.md` aplican: pasa esas rutas al sub-agente; no las leas tú.
3. La memoria **orienta, no reemplaza al código**: si algo de memoria contradice el código, manda el código y se corrige la memoria.

## Escribir (solo lo durable)
Al cerrar un cambio, delega en `sdd-memory-curator` con la carpeta del cambio. Se guarda SOLO si cumple al menos uno:
- Decisión técnica o de negocio con su motivo.
- Convención o regla del proyecto descubierta (que no esté en AGENTS.md).
- "Trampa" conocida (gotcha) que costó tiempo: causa + cómo detectarla.
- Cambio en el mapa de módulos, integraciones, configuración o despliegue.
- Pendiente/riesgo que sigue abierto.
NO se guarda: detalles que el código o git ya muestran, código copiado, pasos intermedios, logs, datos personales, secretos/credenciales/URLs internas sensibles.
Cada entrada lleva fecha y fuente (`cambio <id>` o `archivo:línea`). Actualizar antes que agregar; nunca duplicar.

## Sesión (compactar sin perder lo importante)
- "guardar" o antes de compactar la conversación (`/compact` u opción equivalente de tu herramienta): escribe `sesion.md` con objetivo actual, decisiones tomadas en la sesión, estado (qué está hecho / qué falta), archivos clave, próximos pasos y dudas pendientes (≤ 40 líneas). Luego indica al usuario que ya puede compactar.
- Al retomar (`/sdd-continue` o sesión nueva): lee `sesion.md` + `MEMORIA.md` y resume en 3 líneas dónde quedó.
- Las decisiones durables de `sesion.md` se mueven a `decisiones.md` al cerrar el cambio.

## Compactar y olvidar (requieren confirmación)
- "compactar" o cuando `stats` marque exceso de presupuesto: sigue `references/compaction.md`, muestra el resumen de cambios y **pide confirmación** antes de sobrescribir.
- "olvidar <x>": elimina la información indicada (y lo derivado de ella) tras confirmar.

## Ver
Muestra el índice y `stats` (tamaños vs presupuesto). No vuelques todos los archivos.
