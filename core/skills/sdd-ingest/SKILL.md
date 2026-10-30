---
name: sdd-ingest
description: Convierte documentos de entrada (PDF, DOCX, TXT, MD, imágenes) a texto para analizarlos (conversión temporal, sin guardar en el proyecto). Usar al iniciar un cambio SDD con archivos adjuntos.
---
# Ingesta de documentos

1. Por cada archivo de entrada:
   `node "{{SDD_HOME}}/bin/to-md.js" "<archivo>" "<carpeta temporal del sistema>/sdd-la solicitud"` (ej. `%TEMP%` en Windows, `/tmp` en macOS/Linux) y lee el resultado
2. El script imprime JSON: `{ output, pages, chars, scanned }`.
   - `scanned: true` (PDF escaneado, sin texto) → lee como imagen SOLO las páginas necesarias y transcribe lo relevante, marcando `[transcrito de imagen, pág. N]`.
   - Imágenes (capturas): el script deja la referencia; descríbelas (qué pantalla, qué error, qué texto visible).
3. Si no puedes ejecutar Node, lee el archivo directamente y extrae el texto tú mismo.
4. NO interpretes, resumas ni completes requisitos: el texto convertido es la fuente literal.
5. Entrega el contenido relevante y un resumen de lo que se pide. No dejes copias en el proyecto.
