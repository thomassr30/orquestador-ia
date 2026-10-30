# Compactación sin pérdida de información importante

## Cuándo
- `sdd-memory.js stats` indica exceso de presupuesto, o el usuario lo pide.
- Nunca de forma automática sin mostrar el resultado y pedir confirmación.

## Reglas
1. **Nunca se pierde una decisión vigente**, una convención activa, un pendiente abierto ni una trampa conocida.
2. **Fusionar** entradas duplicadas o que dicen lo mismo con distintas palabras (conserva la fuente más reciente y la original).
3. **Decisiones reemplazadas/revertidas**: se reducen a una línea `D-00X (reemplazada por D-0YY): <título>` — se conserva el rastro.
4. **Detalle → tema**: si `MEMORIA.md` crece, mueve detalle a `temas/` y deja una línea de enlace.
5. **Historial**: entradas de más de 3 meses se resumen por mes (`2026-07: 14 cambios — principales: …`).
6. **Pendientes resueltos** (`[x]`) se eliminan; si dejaron una decisión, queda en `decisiones.md`.
7. **Verificar contra el código** los hechos dudosos antes de conservarlos; si ya no son ciertos, se eliminan (o se marcan reemplazados).
8. Nada de reformular por estilo: compactar es reducir redundancia, no reescribir.

## Procedimiento
1. `node "{{SDD_HOME}}/bin/sdd-memory.js" stats`.
2. Preparar la versión compactada en memoria de trabajo (no escribir aún).
3. Mostrar al usuario: líneas antes → después por archivo, qué se fusionó, qué se archivó, qué se eliminó y por qué.
4. Tras su "sí": escribir los archivos. (La versión anterior queda en git si `.sdd/` está versionado; si no, guardar copia en `.sdd/memoria/.respaldo/AAAA-MM-DD/`.)
