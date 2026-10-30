# Interacción y estados
- **Estados de cada control**: normal, hover (solo como mejora), foco visible (`:focus-visible`), presionado, deshabilitado (con motivo si no es obvio), cargando.
- **Áreas táctiles** ≥ 44 × 44 px (48 dp Android); espacio entre objetivos.
- **Nada solo en hover**: toda acción debe ser alcanzable con toque y teclado.
- **Formularios**: label visible (no solo placeholder), ayuda y requisitos antes del error, validación al salir del campo, errores junto al campo y resumen arriba, conservar lo escrito ante errores.
- **Feedback**: respuesta < 100 ms; acciones lentas con progreso; confirmación visible del resultado (y "Deshacer" cuando sea posible en vez de confirmar antes).
- **Destructivas**: separadas de las frecuentes, con confirmación que explique la consecuencia.
- **Menús y popovers**: no recortados por contenedores (`overflow`), se cierran con Esc y al hacer clic fuera, devuelven el foco.
- **Títulos** en orden (h1 → h2 → h3) sin saltos; landmarks (`header`, `nav`, `main`).
