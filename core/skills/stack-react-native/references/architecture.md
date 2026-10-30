# Arquitectura de una app React Native

## Estructura recomendada (por funcionalidad)
```
src/
├── app/                 # providers, navegación raíz, bootstrap
├── features/
│   └── muestras/
│       ├── screens/     # pantallas (contenedores)
│       ├── components/  # UI de la feature
│       ├── hooks/       # lógica de presentación (useMuestras)
│       ├── api/         # llamadas HTTP + tipos DTO
│       ├── model/       # tipos de dominio, mapeos DTO → dominio, validaciones
│       └── __tests__/
├── shared/              # ui (design system), lib, hooks y utils comunes
├── theme/               # tokens: colores, tipografía, espaciado, radios, sombras
└── navigation/          # tipos de rutas, linking
```
Respeta la estructura existente del proyecto si ya hay una.

## Navegación (React Navigation)
- Stack nativo (`@react-navigation/native-stack`) para transiciones nativas; tabs inferiores para destinos principales.
- Tipar rutas: `type RootStackParamList = { Detalle: { id: string } }` y usar los tipos en `useNavigation`/`useRoute`.
- Deep linking configurado en un solo lugar (`linking`); valida parámetros recibidos.
- Pasa IDs entre pantallas, no objetos completos.
- Expo usa Expo Router (ver `stack-expo`).

## Estado
| Tipo | Herramienta recomendada |
|---|---|
| Datos del servidor | TanStack Query (caché, reintentos, refetch al volver al foreground) |
| Estado global de UI/sesión | Zustand o Redux Toolkit (el del proyecto) |
| Estado local | `useState` / `useReducer` |
| Formularios | React Hook Form + Zod |
| Persistencia rápida | MMKV; sensible → Keychain/Keystore |
No dupliques datos del servidor en el store global.

## Capa de datos
- Cliente HTTP único (fetch/axios) con interceptores: auth, refresh de token, timeouts, mapeo de errores.
- Validar respuestas con Zod en el límite; mapear DTO → modelo de dominio.
- Offline: TanStack Query `persistQueryClient` o base local (WatermelonDB / op-sqlite / expo-sqlite) si el dominio lo exige.

## Configuración y entornos
- Variables por entorno (`react-native-config` o equivalente); nunca secretos en JS.
- Flavors (Android) / schemes y configuraciones (iOS) para dev/qa/prod con distintos bundle IDs.

## Clean code
- Funciones puras para reglas de negocio (testables sin RN).
- Hooks con una responsabilidad; componentes < ~150 líneas; extraer subcomponentes con nombre.
- Nada de lógica en `useEffect` que pueda calcularse en render.
