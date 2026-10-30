---
name: sdd-ask
description: Responde preguntas sobre el código del proyecto actual (dónde está algo, cómo funciona, qué usa) en solo lectura y con evidencia archivo:línea. Usar cuando el usuario pregunte por SU proyecto, o escriba /sdd-ask.
---
# /sdd-ask — Consulta (solo lectura)

Pregunta: $ARGUMENTS
(Si no ves la pregunta arriba, usa el mensaje del usuario que acompaña al comando.)

1. **No modifiques ningún archivo** ni crees la carpeta `changes/`.
2. Si la pregunta es ambigua, pide una sola aclaración.
3. Delega en `sdd-explorer` con este mensaje:
   ```
   MODO CONSULTA: no escribas archivos.
   Pregunta: <pregunta>
   Responde en ≤20 líneas, con evidencia archivo:línea para cada afirmación.
   Si no encuentras evidencia, dilo; no supongas.
   ```
   Sin sub-agentes disponibles: hazlo tú con grep/glob, abriendo solo los archivos necesarios.
4. Responde al usuario en español:
   - **Respuesta** (2–5 líneas)
   - **Evidencia** (archivo:línea)
   - **Para profundizar** (opcional, máx. 3 archivos)
