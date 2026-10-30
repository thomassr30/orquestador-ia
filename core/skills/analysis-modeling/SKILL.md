---
name: analysis-modeling
description: Modelado funcional con diagramas Mermaid (procesos/flujos de negocio, secuencia entre sistemas, estados de una entidad, modelo de datos conceptual, casos de uso) y prototipos de baja fidelidad en texto. Usar cuando un requerimiento involucra procesos, varios actores o sistemas, ciclos de vida o datos nuevos.
---
# Modelado funcional

Diagramas en **Mermaid** (se ven en GitHub, GitLab, Azure DevOps y VS Code), dentro de la respuesta (los diagramas se ven en el chat de las herramientas que renderizan Mermaid; si no, entrégalos como bloque de código). Archivo solo si el usuario lo pide.

| Necesidad | Diagrama |
|---|---|
| Proceso de negocio con decisiones y responsables | `flowchart` con subgrafos por actor (estilo carriles) |
| Interacción entre usuario, front, back y sistemas externos | `sequenceDiagram` |
| Ciclo de vida de una entidad (ej. muestra: recibida → en análisis → informada) | `stateDiagram-v2` |
| Datos conceptuales y relaciones | `erDiagram` |
| Planificación | `gantt` (solo si se pide) |

## Reglas
- Un diagrama = una pregunta respondida; máximo ~15 nodos (si crece, dividir).
- Nombres del dominio (los del glosario), no técnicos, en diagramas funcionales.
- Cada transición de estado y cada decisión del flujo debe tener su regla de negocio (RN-xx) o criterio de aceptación asociado.
- Marcar en el diagrama los puntos con dudas (`?`) y llevarlos a las preguntas para el cliente.

## Prototipo de baja fidelidad
Cuando la pantalla es central para entender el requerimiento: lista de campos (nombre, tipo, obligatorio, validación), acciones y estados de la pantalla. El diseño visual se define después (skill `design-quality`).
