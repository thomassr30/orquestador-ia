---
name: qa-web
description: Ejecución de QA funcional en aplicaciones web usando el navegador (Playwright MCP / Chrome DevTools MCP) contra un entorno local o de QA, con evidencia, revisión de consola/red, responsive y accesibilidad básica; conversión de casos estables a tests e2e. Usar al probar funcionalmente una app web.
---
# QA funcional web

Carga `qa-acceptance` (proceso) y `browser-automation` (seguridad y herramientas).

## Preparación
- Entorno y URL confirmados con el usuario (local, dev, QA). **Producción: solo lectura** y solo con autorización explícita.
- Usuario de prueba con el rol necesario: el usuario inicia sesión en la ventana; nunca pedir contraseñas.
- Datos de prueba creados por la propia prueba (y limpiados si corresponde) o indicados por el usuario.

## Por cada caso
1. Ejecutar los pasos en el navegador (snapshot para leer, captura como evidencia).
2. Verificar el resultado esperado en la UI **y** en efectos observables (mensaje, listado actualizado, descarga generada).
3. Revisar consola (errores JS) y red (4xx/5xx, tiempos anormales) durante el caso.
4. Registrar resultado y evidencia.

## Transversales (una pasada por cambio)
- Responsive: 360, 768 y 1280 px en las pantallas del cambio.
- Teclado y foco; mensajes de error comprensibles; estados vacío/carga/error.
- Doble clic/envío repetido, recarga a mitad de flujo, botón atrás del navegador, sesión expirada.

## Automatizar lo estable
Casos críticos que pasan y se repetirán → proponer convertirlos en tests Playwright (`test-e2e`) para la suite de regresión (con aprobación del usuario para agregarlos al repo).
