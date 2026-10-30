---
name: sdd-ingest
description: Convierte documentos de entrada (PDF, DOCX, TXT, MD, imágenes) a Markdown en changes/<id>/input.md. Usar al iniciar un cambio SDD con archivos adjuntos.
---
# Ingesta de documentos

1. Por cada archivo de entrada:
   `node "{{SDD_HOME}}/bin/to-md.js" "<archivo>" "changes/<id>/input.md" --append`
2. El script imprime JSON: `{ output, pages, chars, scanned }`.
   - `scanned: true` (PDF escaneado, sin texto) → lee como imagen SOLO las páginas necesarias y transcribe lo relevante a `input.md`, marcando `[transcrito de imagen, pág. N]`.
   - Imágenes (capturas): el script deja la referencia; descríbelas en `input.md` en ≤5 líneas (qué pantalla, qué error, qué texto visible).
3. Si no puedes ejecutar Node, lee el archivo directamente y escribe `input.md` tú mismo.
4. NO interpretes, resumas ni completes requisitos: `input.md` es la fuente literal.
5. Devuelve: ruta de `input.md` + resumen de 5 líneas de lo que se pide.
