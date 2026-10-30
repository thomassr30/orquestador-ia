---
name: design-shape
description: Brief de diseño antes de escribir código para una pantalla o flujo nuevo o un rediseño — trabajo del usuario, modo, límites, estados, dirección visual evaluada y lo que se debe verificar al final. Usar en la fase de diseño de cambios con UI nueva o rediseño.
---
# Brief de diseño (antes de implementar)

Carga `design-quality` (contexto y modo). Salida: **"Brief de diseño"** en tu respuesta (forma parte del plan que se aprueba en el GATE).

## Pasos
1. **Trabajo**: quién usa esta pantalla, en qué situación y qué resultado necesita (1–3 líneas). Si no está claro, pregunta (máx. 3 preguntas juntas).
2. **Modo**: Persuadir / Operar / Leer / Experimentar.
3. **Límites**: contenido real disponible, estados a cubrir, alcance, restricciones y **qué no se debe inventar** (datos, métricas, testimonios, funciones).
4. **Mantener**: qué del diseño/sistema actual se conserva.
5. **Dirección** (solo si es superficie nueva o rediseño): propone 2 direcciones breves, distintas entre sí, y evalúalas:
   - **Verdad**: lo que muestra es real (sin cifras ni claims inventados).
   - **Propósito**: sirve al trabajo del usuario.
   - **Consecuencia**: cada decisión visual cumple una función, no es decoración.
   - **Factibilidad**: implementable con el stack y componentes del proyecto.
   - **Ajuste**: coherente con producto, marca y modo.
   Recomienda una; si la UI es importante, ofrece prototipo (`prototype`) antes de implementar.
6. **Verificar al final**: 3–6 comprobaciones concretas (ej. "la acción Guardar se identifica en 3 s", "tabla legible en 360 px").

## Formato
```markdown
## Brief de diseño
- Trabajo: …
- Modo: Operar
- Límites / no inventar: …
- Estados: carga · vacío · error · sin permisos · datos largos
- Mantener: …
- Dirección elegida: <idea central, lenguaje visual, composición de la primera pantalla, camino del usuario>
- Alternativa descartada y por qué: …
- Verificar al final: …
```
El brief se confirma en el GATE junto con el resto del diseño.
