---
name: design-context
description: Crea o actualiza el contexto de diseño durable del proyecto en la memoria (producto.md con usuarios, propósito, plataforma y restricciones; diseno.md con el sistema visual y sus tokens), derivándolo del código y confirmando lo esencial con el usuario. Usar la primera vez que un proyecto con UI pasa por un flujo de diseño o cuando cambia la marca, el público o el sistema visual.
---
# Contexto de diseño

Archivos (en la memoria del proyecto, se leen solo en tareas de UI):
- `.sdd/memoria/temas/producto.md`
- `.sdd/memoria/temas/diseno.md`
Si el proyecto ya tiene `PRODUCT.md` / `DESIGN.md` (formato Impeccable u otro), úsalos como fuente y enlázalos desde la memoria en vez de duplicarlos.

## producto.md (lee el proyecto ANTES de preguntar)
1. Deriva de README, docs, rutas, roles y textos de la app: usuarios y roles, propósito, contexto de uso (oficina/terreno/móvil), plataforma (`web`, `ios`, `android`, `adaptativa`), restricciones (institucional, accesibilidad, normativa, navegadores/dispositivos), terminología del dominio, compromisos de marca.
2. Confirma con el usuario solo lo esencial que no se pueda deducir (agrupa las preguntas en un solo mensaje). Lo no resuelto se marca `PENDIENTE`.
3. No eliges paleta ni estilo aquí.
```markdown
# Producto
## Usuarios y roles
## Propósito y resultado esperado
## Contexto de uso
## Plataforma
## Accesibilidad e inclusión
## Restricciones (institucionales, técnicas, normativas)
## Terminología
## Pendientes
```

## diseno.md (registrar el sistema visual existente)
1. Encuentra el sistema: tokens (Tailwind config/`@theme`, variables CSS/SCSS, tema Angular Material/M3, Asset Catalog, tema RN), componentes base y, si hay navegador disponible, la página renderizada.
2. Registra roles (no solo valores): qué color es la acción primaria, qué escala tipográfica, radios, sombras/elevación, componentes y reglas.
3. Si no existe sistema (proyecto nuevo): registro **semilla** marcado como "propuesto" a partir de la dirección aprobada en `design-shape`.
```markdown
---
tokens:
  colores: { accion: "...", texto: "...", superficie: "...", exito: "...", alerta: "...", error: "..." }
  tipografia: { familias: [...], escala: [...] }
  espaciado: [4, 8, 12, 16, 24, 32, 48]
  radios: { sm: ..., md: ..., lg: ... }
---
# Sistema de diseño
## Resumen (carácter y modo predominante)
## Colores (rol de cada uno)
## Tipografía
## Layout y espaciado
## Elevación y profundidad
## Formas
## Componentes (base y cuándo usar cada uno)
## Hacer / No hacer
```
Elimina reglas que salieron de una sola pantalla (no son del sistema). Presupuesto ≤ 150 líneas por archivo; enlaza desde `MEMORIA.md` → Temas.
