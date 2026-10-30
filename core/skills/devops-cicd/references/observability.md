# Observabilidad

- **Health endpoints**: `/health/live` (proceso vivo) y `/health/ready` (dependencias listas: BD, cache, config). NestJS: `@nestjs/terminus`; Adonis/Go: endpoint propio.
- **Logs estructurados** (JSON) con nivel, timestamp, servicio, versión, `requestId`/`traceId`; sin datos personales ni secretos. Al arrancar: log de versión y de configuración cargada (solo nombres de claves y fuente).
- **Métricas**: latencia, tasa de errores, saturación (Prometheus/OpenTelemetry según plataforma).
- **Trazas** distribuidas con OpenTelemetry si hay varios servicios.
- **Alertas** sobre síntomas (errores 5xx, latencia, reinicios de pods), no sobre causas internas.
