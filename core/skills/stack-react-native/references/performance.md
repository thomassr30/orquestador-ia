# Rendimiento en React Native

## Medir antes de optimizar
React Native DevTools (profiler de React), Perf Monitor (FPS JS/UI), Android Studio Profiler, Instruments en iOS. Mide en **release** y en un dispositivo de gama media/baja.

## Renders
- Evita crear objetos/funciones nuevos en props de componentes memoizados; usa `useCallback`/`useMemo` solo donde el profiler lo justifique (o React Compiler si el proyecto lo habilitó).
- Divide contextos grandes; selectores en stores (Zustand `useStore(s => s.x)`).
- No guardes en estado lo que se deriva.

## Listas
- `FlatList`: `keyExtractor` estable, `getItemLayout` si el alto es fijo, `initialNumToRender`/`windowSize` ajustados, `renderItem` memoizado, ítems con `React.memo`.
- FlashList (si está en el proyecto) para listas largas y heterogéneas; define `getItemType` para tipos de celda distintos.
- Imágenes de lista con tamaño fijo y caché.

## Animaciones y gestos
- Animaciones en el hilo de UI: Reanimated o `Animated` con `useNativeDriver: true`. Nunca `setState` por frame.
- Ver `rn-animations`.

## Arranque
- Hermes (por defecto). Carga diferida de pantallas pesadas; evita trabajo síncrono al iniciar; inicializa SDKs no críticos después del primer render.
- Splash nativo que se oculta cuando la primera pantalla está lista.

## Tamaño y memoria
- Android: R8/minificación y `enableProguardInReleaseBuilds`; App Bundle (AAB). iOS: bitcode ya no aplica; elimina assets no usados.
- Libera suscripciones/listeners en el cleanup de `useEffect`.
- Imágenes redimensionadas en servidor; no cargar fotos de cámara a tamaño completo en listas.
