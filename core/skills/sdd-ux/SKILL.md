---
name: sdd-ux
description: Trabajo de diseño sobre UI existente o nueva sin pasar por el flujo completo — criticar, auditar, pulir, robustecer, mejorar textos, adaptar a otro dispositivo, simplificar, hacer más audaz o más sobrio, mejorar tipografía, color o layout, primer uso, registrar el sistema de diseño o preparar un brief. Usar cuando el usuario pida algo sobre el diseño o la experiencia de una pantalla, o escriba /sdd-ux.
---
# /sdd-ux — Diseño y experiencia

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario.)

1. Carga `design-quality` (contexto + modo). Si falta contexto → `design-context` primero.
2. Elige la acción:
| Pedido | Skill / referencia | ¿Modifica código? |
|---|---|---|
| "critica", "qué le falta", "se ve genérico" | `design-critique` | No |
| "audita", "accesibilidad", "revisión técnica de UI" | `design-audit` | No |
| "pule", "deja listo para entregar" | `design-polish` | Sí (GATE) |
| "robustece", "casos borde", "errores" | `design-harden` | Sí (GATE) |
| "mejora los textos", "mensajes de error" | `ux-writing` | Sí (GATE) |
| "adapta a móvil/tablet" | `references/adaptar.md` | Sí (GATE) |
| "simplifica", "hay mucho ruido", "más audaz", "más sobrio" | `references/simplificar.md` | Sí (GATE) |
| "tipografía", "colores", "espaciado/layout", "animaciones" | referencia del área | Sí (GATE) |
| "estado vacío", "primer uso", "onboarding" | `references/primer-uso.md` | Sí (GATE) |
| "documenta el sistema de diseño" | `design-context` | Solo memoria |
| "propón cómo debería ser" | `design-shape` (+ `prototype`) | No |
3. Revisiones (crítica/auditoría): delega en `sdd-ui-reviewer` y entrega en el chat el informe con P0–P3.
4. Cambios: flujo `fix` (o `feature` si es grande) con el brief/hallazgos como entrada; GATE → implementer de la capa → `design-polish` → revisión de UI en paralelo con la verificación. Todo informado en el chat, sin archivos de trabajo.
