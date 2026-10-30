# Movimiento
- **Solo con propósito**: explicar un cambio de estado, una relación espacial o dar feedback.
- **Duraciones**: 100–200 ms micro-interacciones; 200–400 ms transiciones. Ease-out al entrar, ease-in al salir; springs para gestos.
- **Sin rebote/elástico** en interfaces de trabajo; sin loops decorativos (puntos que pulsan, marquesinas) salvo actividad real y pausable.
- **Contenido visible por defecto**: la animación de entrada no puede ser la condición para que algo se vea.
- **Interrumpible**: parte del estado actual.
- **Reducir movimiento**: respeta `prefers-reduced-motion` / ajustes del sistema → fundidos breves.
- **Rendimiento**: anima `transform` y `opacity`; nunca propiedades de layout por frame.
- Mobile y RN: ver `mobile-design` y `rn-animations`.
