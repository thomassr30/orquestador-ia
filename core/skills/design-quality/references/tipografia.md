# Tipografía
- **Familias**: conserva las de la marca/proyecto. Si eliges: máximo 2 (texto + display opcional), con razón (legibilidad en pantalla, soporte de tildes/ñ, cifras tabulares). Evita la fuente por defecto sin decisión.
- **Escala** con contraste real entre roles (ej. 32/24/20/16/14/12 o la del sistema); cada rol (título, subtítulo, cuerpo, etiqueta, ayuda) con un único tratamiento en toda la app.
- **Cuerpo**: ~16 px en web (17 pt iOS Body; 14–16 sp Android); nunca menor a 12 px para información.
- **Largo de línea**: 45–75 caracteres en texto corrido (`max-width: 65ch–75ch`).
- **Interlineado**: ~1,5 en cuerpo; 1,1–1,3 en títulos.
- **Evitar**: texto justificado, mayúsculas o tracking amplio en texto corrido, tracking negativo en tamaños chicos.
- **Títulos**: `text-wrap: balance`; párrafos: `text-wrap: pretty` (evita huérfanas).
- **Números**: cifras tabulares en tablas y montos (`font-variant-numeric: tabular-nums`); formatos locales (es-CL: `1.234,56`, fechas `dd-mm-aaaa` o la convención del proyecto).
- **Carga**: `font-display: swap` + fallback métrico similar para evitar saltos; prueba zoom 200% y texto grande del sistema.
