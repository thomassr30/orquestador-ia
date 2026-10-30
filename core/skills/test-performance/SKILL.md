---
name: test-performance
description: Pruebas de rendimiento de APIs con k6 y de frontend con Lighthouse CI. Usar en endpoints o páginas de alto tráfico o con requisitos de rendimiento.
---
# Rendimiento

## APIs: k6
- Script en `perf/<endpoint>.js` con `thresholds` derivados de los requisitos (ej. `http_req_duration: ['p(95)<300']`, `http_req_failed: ['rate<0.01']`).
- Escenarios: carga normal y pico. Datos de prueba realistas, nunca contra producción.
- Ejecutar: `k6 run perf/<endpoint>.js` (o vía Docker `grafana/k6`).

## Frontend: Lighthouse CI
- `npx @lhci/cli autorun` contra el build de producción local.
- Presupuestos: LCP, CLS, INP/TBT y tamaño de bundle; reportar regresiones frente a la línea base.

## Reporte
En el informe de verificación: métrica, umbral, resultado, entorno de ejecución.
