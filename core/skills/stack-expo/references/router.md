# Expo Router

## Estructura
```
app/
├── _layout.tsx            # layout raíz: providers, fuentes, splash, Stack
├── (tabs)/
│   ├── _layout.tsx        # Tabs (o tabs nativas)
│   ├── index.tsx
│   └── perfil.tsx
├── muestras/
│   ├── index.tsx          # /muestras
│   └── [id].tsx           # /muestras/123
├── +not-found.tsx
└── (auth)/login.tsx       # grupo sin afectar la URL
```
- Pantallas delgadas: delegan en `src/features/*` (misma arquitectura que `stack-react-native`).
- Grupos `( )` para organizar sin cambiar la ruta; `_layout.tsx` por nivel.

## Navegación tipada
- Activa typed routes (`experiments.typedRoutes` en versiones que lo requieran) y usa `<Link href="/muestras/[id]" …>` / `router.push({ pathname, params })`.
- Lee parámetros con `useLocalSearchParams<{ id: string }>()` y valídalos.

## Autenticación
- Redirección protegida en el layout (`Redirect` o rutas protegidas del router según versión) basada en el estado de sesión; no dupliques chequeos en cada pantalla.

## Data loaders y tabs nativas
- SDK 58 estabiliza **data loaders** y **native tabs** en Expo Router. Úsalos si la versión del proyecto los trae; consulta la API exacta en la documentación de esa versión.
- Tabs nativas → apariencia y comportamiento del sistema (incluye Liquid Glass en iOS 26+).

## Deep links
- `scheme` en app config; Universal/App Links con dominios asociados. Cada ruta es un deep link: valida parámetros y permisos al entrar.
