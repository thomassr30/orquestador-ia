---
name: ux-writing
description: Textos de interfaz en español claros y útiles (botones, navegación, formularios, errores, estados de carga, vacío y éxito, confirmaciones, ayuda), con tono consistente y sin frases de marketing genéricas. Usar al escribir o corregir cualquier texto visible por el usuario.
---
# Textos de interfaz

## Principios
- Escribe lo que el usuario necesita **en ese momento**; conserva los términos del producto (glosario en `producto.md`).
- Tono del proyecto (usted/tú) consistente en toda la app; en sistemas institucionales, por defecto **usted** y lenguaje formal-claro.
- Frases cortas, voz activa, verbos concretos. Sin jerga técnica hacia el usuario.

## Por elemento
| Elemento | Regla | Ejemplo |
|---|---|---|
| Botones y acciones | verbo + objeto, describe lo que pasa | "Guardar muestra", no "Aceptar" |
| Navegación | sustantivos consistentes con los títulos de página | "Muestras", "Informes" |
| Labels | específicos; requisitos visibles antes de equivocarse | "RUT (sin puntos, con guion)" |
| Errores | qué falló + cómo resolverlo; sin culpar ni inventar causas | "No pudimos guardar porque se perdió la conexión. Sus datos siguen aquí; intente de nuevo." |
| Carga | qué está pasando si tarda | "Generando informe…" |
| Vacío | estado + siguiente paso | "Aún no hay muestras. Registre la primera." |
| Éxito | confirma el resultado concreto | "Muestra M-1024 registrada." |
| Confirmaciones destructivas | consecuencia explícita | "Se eliminará la solicitud y sus 3 muestras. Esta acción no se puede deshacer." |

## Evitar
Promesas genéricas ("potente", "revolucionario", "de clase mundial"), contrastes forzados, abuso de signos de exclamación y rayas (—), el mismo texto repetido en un bloque, mayúsculas sostenidas, anglicismos innecesarios.

## Comprobar
Recorre éxito, error y vacío; nombres largos y valores dinámicos; pantallas chicas; nombres accesibles de íconos y botones.
