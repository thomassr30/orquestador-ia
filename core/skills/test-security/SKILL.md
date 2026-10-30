---
name: test-security
description: Verificaciones de seguridad (dependencias, SAST, secretos, DAST) por stack. Usar en verify y en cambios de auth, permisos o datos sensibles.
---
# Seguridad

## Siempre (rápido)
| Qué | Node / NestJS / AdonisJS / Angular / React / Next | Go |
|---|---|---|
| Dependencias vulnerables | `npm audit --omit=dev` | `govulncheck ./...` |
| SAST | `semgrep scan --config auto` (si está instalado) | `gosec ./...` + semgrep |
| Secretos en el diff | `gitleaks detect` (si está instalado) o revisión manual del diff | idem |

Si una herramienta no está instalada, regístralo como "no medido"; no lo des por aprobado.

## Revisión dirigida (cambios de auth/datos)
- Autorización en el servidor para cada endpoint (no solo ocultar en UI).
- Validación y sanitización de entrada; queries parametrizadas.
- Sin datos sensibles en logs, URLs ni respuestas de error.
- Cookies `HttpOnly`, `Secure`, `SameSite`; CORS restringido; headers de seguridad.

## DAST (opcional, entornos locales/QA)
OWASP ZAP baseline: `docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t <url>`. Nunca contra sistemas de terceros sin autorización.

Gate: 0 vulnerabilidades altas/críticas nuevas.
