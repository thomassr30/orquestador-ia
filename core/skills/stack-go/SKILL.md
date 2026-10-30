---
name: stack-go
description: Convenciones para desarrollar y testear servicios en Go. Usar cuando el stack detectado incluya go.
---
# Go

## Reglas
- Versión y módulos desde `go.mod`. Formato con `gofmt`/`goimports`; nombres idiomáticos (MixedCaps, sin `Get` en getters).
- Estructura: `cmd/<app>/main.go`, lógica en `internal/`, nada de lógica en `main`.
- `context.Context` como primer parámetro en operaciones de I/O; respeta cancelación y timeouts.
- Errores: retorna `error`, envuelve con `fmt.Errorf("...: %w", err)`, compara con `errors.Is/As`. Sin `panic` en flujo normal.
- Interfaces pequeñas definidas donde se consumen. Inyección de dependencias por constructor (`NewX(deps)`).
- Concurrencia: cierra goroutines con context; protege estado compartido; corre tests con `-race`.
- SQL siempre parametrizado (`$1` en Postgres, `@p1` en SQL Server). Cierra `rows`.
- Logs estructurados (`log/slog`) sin datos sensibles.

## Tests
- Table-driven tests con `t.Run`; `t.Parallel()` cuando no compartan estado.
- HTTP: `net/http/httptest`. BD real: `testcontainers-go` (ver skill `test-db`).
- Usa la librería de aserciones que ya use el proyecto (ej. testify); no agregues otra.

## Comandos
`go test ./... -race -cover` · `go vet ./...` · `golangci-lint run` (si existe config) · `govulncheck ./...`
