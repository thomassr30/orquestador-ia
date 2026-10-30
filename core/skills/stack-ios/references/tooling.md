# Tooling iOS

- **Dependencias**: Swift Package Manager (evitar CocoaPods en proyectos nuevos). Versiones fijadas (`Package.resolved` versionado).
- **Configuraciones**: `.xcconfig` por entorno (Debug/Staging/Release) con bundle IDs, URLs y flags; nada de secretos en el repo.
- **Calidad**: SwiftLint y/o `swift format` con la config del proyecto; sin warnings; Thread/Address Sanitizer en CI de tests cuando sea posible.
- **Recursos**: Asset Catalog con colores semánticos (claro/oscuro), String Catalogs (`.xcstrings`), SF Symbols.
- **Previews** de SwiftUI con datos de ejemplo y variantes (oscuro, Dynamic Type grande, idioma).
- **CI**: `xcodebuild test` con simulador fijado; Fastlane o Xcode Cloud según el proyecto.
- **Firma y distribución**: certificados/perfiles gestionados por el equipo (no generar ni modificar sin aprobación). TestFlight para QA.
- **Requisitos App Store** vigentes: Xcode 26+ / SDK iOS 26+, privacy manifest, textos de permisos, cuenta de prueba para revisión.
- En Windows/Linux no hay Xcode: los agentes pueden editar código y revisar, pero build/tests iOS se reportan "no medido".
