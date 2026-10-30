---
name: design-quality
description: Criterios para que las interfaces (web y mobile) tengan diseño propio, profesional y no genérico "hecho por IA". Usar SIEMPRE antes de crear o rediseñar pantallas, componentes o estilos.
---
# Calidad de diseño (anti "diseño de IA")

## 1. Antes de escribir UI: dirección de diseño
Si no existe un sistema de diseño en el proyecto, define en `design.md` (o en tu reporte) 6 líneas:
1. **Propósito y usuario**: quién lo usa, en qué contexto (oficina, terreno, móvil con una mano).
2. **Tono**: ej. institucional y sobrio · técnico y denso · cálido y cercano.
3. **Paleta**: 1 color de marca + neutros + semánticos (éxito, alerta, error, info). Con propósito, no decorativa.
4. **Tipografía**: escala con contraste real (ej. 32/24/18/16/14/12) y pesos definidos; máximo 2 familias.
5. **Densidad y ritmo**: grilla 4/8 pt; densidad según dominio (apps de gestión = más densas).
6. **Referencia**: sistema de diseño a seguir (el del proyecto/institución > Apple HIG / Material 3 > propio).

**Si el proyecto ya tiene sistema de diseño, tokens o librería de componentes: úsalos. No inventes estilos paralelos.**

## 2. Señales de "diseño de IA" — EVITAR
- Degradados morado/azul/rosa, fondos con "blobs" o glassmorphism en todo.
- Hero centrado + 3 tarjetas iguales con ícono + "Unlock the power of…".
- Todo con `rounded-2xl` + sombra grande + borde gris; todas las tarjetas del mismo peso.
- Emojis como íconos; mezcla de sets de íconos.
- Todo centrado; jerarquía plana (todo el texto parecido en tamaño y peso).
- Colores sin significado (cada sección de un color distinto).
- Animaciones decorativas en todo (fade-in de cada elemento al hacer scroll).
- Textos de relleno genéricos o lorem ipsum en entregables.
- Pantallas que solo funcionan con datos "perfectos" (sin estados vacío/error/carga).

## 3. Lo que SÍ hace un buen diseño
- **Jerarquía clara**: un elemento principal por pantalla; tamaño, peso y color guían la lectura.
- **Contenido real** del dominio (nombres de campos, datos y textos del negocio).
- **Alineación a la izquierda** para lectura; grilla consistente; espacios con ritmo (no márgenes al azar).
- **Color con intención**: el color de marca solo para acciones primarias y estados clave; neutros para el resto.
- **Componentes nativos de la plataforma** en mobile (no imitar iOS en Android ni al revés).
- **Estados completos**: carga (skeleton > spinner si hay estructura), vacío (qué hacer), error (qué pasó + cómo seguir), éxito.
- **Movimiento con propósito**: comunica cambio de estado o relación espacial; 150–300 ms; respeta "reducir movimiento".
- **Accesibilidad**: contraste AA, tamaños táctiles (44 pt iOS / 48 dp Android), texto escalable, lector de pantalla.
- **Detalle**: alineaciones exactas, íconos del mismo set y grosor, números tabulares en tablas, truncado elegante.

## 4. Checklist final (incluir resultado en el reporte)
- [ ] ¿Se distingue el elemento principal en 3 segundos?
- [ ] ¿Usa tokens/sistema existente (o la dirección definida) sin valores mágicos?
- [ ] ¿Ninguna señal de la sección 2?
- [ ] ¿Estados de carga, vacío y error diseñados?
- [ ] ¿Contraste, tamaños táctiles y texto escalable OK?
- [ ] ¿Se ve bien en el tamaño más chico y el más grande soportados (y en modo oscuro si aplica)?

Para mobile, complementa con la skill `mobile-design`.
