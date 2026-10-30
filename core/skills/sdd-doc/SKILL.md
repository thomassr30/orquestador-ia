---
name: sdd-doc
description: Genera documentación técnica formal en español (arquitectura, API, modelo de datos, módulos) a partir del código. Usar cuando el usuario pida documentar el proyecto o parte de él, o escriba /sdd-doc.
---
# /sdd-doc — Documentación técnica

Qué documentar: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Si no está claro: tipo de documento, audiencia y ruta de salida (por defecto `docs/`).
2. Explorer → `sdd-doc-writer` (aquí sí se escribe el documento, porque es lo pedido).
3. Informa ruta, secciones y lo pendiente de validar.
