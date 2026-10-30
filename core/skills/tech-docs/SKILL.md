---
name: tech-docs
description: Estructura y estilo para documentación técnica formal en español (arquitectura, API, modelo de datos, módulos) basada en evidencia del código. Usar en el sub-agente sdd-doc-writer.
---
# Documentación técnica

## Estilo
- Español formal, impersonal y preciso. Oraciones cortas. Terminología consistente (define siglas en su primer uso).
- Solo información verificable en el código o en documentos del proyecto. Lo no verificable va a "Información pendiente de validación".
- Diagramas en Mermaid (renderizan en GitHub, GitLab, VS Code y Azure DevOps).
- Cita la fuente: `ruta/archivo:línea` o nombre del archivo de configuración.

## Plantillas (elige según el tema)
**Arquitectura**: 1. Propósito y alcance · 2. Contexto (diagrama C4 nivel 1) · 3. Componentes (C4 nivel 2) · 4. Stack y versiones (desde manifiestos) · 5. Flujos principales (diagrama de secuencia) · 6. Integraciones externas · 7. Seguridad (autenticación, autorización) · 8. Despliegue y configuración · 9. Decisiones técnicas · 10. Riesgos y deuda técnica · 11. Información pendiente de validación.

**API**: por endpoint → método y ruta, descripción, autenticación, parámetros, request, response (ejemplo JSON), códigos de error. Si existe OpenAPI, úsala como fuente y no la contradigas.

**Modelo de datos**: diagrama ER (Mermaid `erDiagram`), tabla por entidad (columna, tipo, nulo, descripción, restricciones), índices, relaciones, migraciones relevantes.

**Módulo**: propósito, responsabilidades, dependencias, interfaces públicas, flujos, configuración, pruebas existentes.

## Salida
Markdown en `docs/<tema>.md` (o la ruta indicada). Encabezado con: título, versión del sistema (de los manifiestos), fecha y "Generado a partir del código; revisar antes de publicar".
