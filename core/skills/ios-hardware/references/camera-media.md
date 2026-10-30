# Cámara, fotos y escaneo (iOS)

## Elegir
| Necesidad | API |
|---|---|
| Elegir fotos/videos de la galería | `PhotosPicker` (PhotosUI) — no requiere permiso de biblioteca |
| Tomar una foto simple | `UIImagePickerController` envuelto o cámara propia |
| Cámara personalizada (preview, controles, video) | AVFoundation (`AVCaptureSession`) |
| Escanear códigos de barras/QR o texto en vivo | `DataScannerViewController` (VisionKit) |
| Escanear documentos | `VNDocumentCameraViewController` (VisionKit) |
| Reconocer texto/códigos en una imagen | Vision |

## AVFoundation (pautas)
- Configura la sesión en un `actor`/cola dedicada (nunca en MainActor): `beginConfiguration` → inputs/outputs → `commitConfiguration` → `startRunning`.
- Preview con `AVCaptureVideoPreviewLayer` envuelto en `UIViewRepresentable`.
- `AVCapturePhotoOutput` para fotos (calidad priorizada según caso), `AVCaptureMovieFileOutput` para video (requiere micrófono: `NSMicrophoneUsageDescription`).
- Detener la sesión al salir de la vista o pasar a background; manejar interrupciones (llamadas, multitarea en iPad).
- Permiso: `AVCaptureDevice.requestAccess(for: .video)`.

## VisionKit DataScanner
- Verifica `DataScannerViewController.isSupported` e `isAvailable`.
- Tipos reconocidos: `.barcode(symbologies: [.qr, .ean13, .code128])`, `.text()`; resaltado y guía de enfoque.
- Feedback háptico al reconocer; evita lecturas duplicadas (debounce por valor).

## Fotos
- Guardar: `PHPhotoLibrary` con permiso solo de agregar (`NSPhotoLibraryAddUsageDescription`).
- Redimensiona/comprime antes de subir; elimina metadatos de ubicación si no son necesarios.
