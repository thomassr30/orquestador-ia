# Cámara, fotos y escaneo (Android)

| Necesidad | API |
|---|---|
| Elegir fotos/videos | **Photo Picker** (`PickVisualMedia`/`PickMultipleVisualMedia`) — sin permisos |
| Tomar foto simple | Intent `TakePicture` con `FileProvider` |
| Cámara propia (preview, foto, video, análisis) | **CameraX** (`camera-core`, `camera-camera2`, `camera-lifecycle`, `camera-view` o `camera-compose`) |
| Códigos de barras/QR | ML Kit Barcode Scanning (con `ImageAnalysis`) o Google Code Scanner (sin permiso de cámara) |
| Texto en imagen | ML Kit Text Recognition |
| Documentos | ML Kit Document Scanner |

## CameraX (pautas)
- `ProcessCameraProvider` ligado al lifecycle; casos de uso `Preview`, `ImageCapture`, `VideoCapture`, `ImageAnalysis` (estrategia `STRATEGY_KEEP_ONLY_LATEST`).
- En Compose: `CameraXViewfinder` (camera-compose) o `PreviewView` en `AndroidView` según versión.
- Permisos `CAMERA` (+ `RECORD_AUDIO` para video) en runtime.
- Análisis en un executor de fondo; cierra cada `ImageProxy`.
- Guarda en MediaStore (galería) o en almacenamiento de la app; comprime antes de subir y elimina EXIF de ubicación si no se necesita.
