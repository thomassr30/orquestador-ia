# Go
- Auditoría: `govulncheck ./...` (vulnerabilidades alcanzables), `go list -m -u all` (desactualizadas).
- Actualizar: `go get modulo@vX.Y.Z` (o `@latest` de a uno), luego `go mod tidy`.
- Majors en Go cambian la ruta del módulo (`/v2`): actualizar imports.
- Versión de Go: directiva `go` y `toolchain` en `go.mod` + Dockerfile + pipeline.
