---
name: sdd-explore
description: Explora el código del proyecto para entender el contexto de un cambio y detectar el stack. Produce explore.md y stack.json. Usar en la fase explore del flujo SDD.
---
# Explorar

ENTRADA: `changes/<id>/input.md`

**Primero la memoria:** si existe `.sdd/memoria/MEMORIA.md`, úsalo como mapa (módulos, convenciones, comandos) y lee los `temas/` relevantes. Explora el código solo para lo que la memoria no cubre o para verificar lo que vas a usar. Si encuentras algo de memoria desactualizado, anótalo en explore.md ("Memoria a corregir").

## 1. Detectar stack → `changes/<id>/stack.json`
Lee SOLO manifiestos: `package.json` (incl. `react-native`, `expo`, `react-native-reanimated`), `app.json`/`app.config.*`, `*.xcodeproj`/`Package.swift`/`Podfile`, `build.gradle(.kts)`/`settings.gradle(.kts)`/`gradle/libs.versions.toml`/`AndroidManifest.xml`, `go.mod`, `angular.json`, `next.config.*`, `nest-cli.json`, `adonisrc.ts`/`.adonisrc.json`, `tailwind.config.*` o `@import "tailwindcss"` en CSS, `*.scss`, migraciones/ORM (`prisma`, `typeorm`, `lucid`, `knex`, `gorm`, `sqlx`), `docker-compose*`, `Dockerfile`, `.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`, `*.tf`, manifiestos `k8s/`/`helm/` (`Chart.yaml`)/`kustomization.yaml`, recursos OpenShift (`Route`, `oc` en scripts), uso de Consul/Vault (registrar en `"infra"`).
```json
{
  "backend":  ["nestjs@10"],
  "frontend": ["angular@22", "tailwind@4", "scss"],
  "db":       ["postgres"],
  "mobile":   ["expo@58", "react-native@0.88", "reanimated@4.7"],
  "infra":    ["docker", "gitlab-ci", "kubernetes", "consul"],   // → skills container-docker, ci-gitlab, deploy-kubernetes, config-consul
  "testRunners": { "backend": "jest", "frontend": "vitest", "e2e": "playwright" },
  "commands": { "test": "npm test", "lint": "npm run lint", "build": "npm run build" },
  "skills":   ["stack-nestjs", "stack-angular", "stack-tailwind", "stack-scss", "stack-postgres"]
}
```
Versiones SIEMPRE desde los manifiestos, nunca de memoria. `skills` usa nombres existentes (infra: `ci-github-actions`, `ci-gitlab`, `ci-azure-pipelines`, `ci-jenkins`, `ci-bitbucket`, `container-docker`, `deploy-kubernetes`, `deploy-openshift`, `deploy-helm`, `deploy-kustomize`, `iac-terraform`, `config-consul`, `config-vault`, `ops-observability`): `stack-` go, nodejs, adonisjs, nestjs, angular, react, nextjs, html-css, tailwind, scss, postgres, sqlserver, react-native, expo, ios, swiftui, android, compose; además `rn-animations`, `ios-hardware`, `android-hardware`, `mobile-design`, `design-quality`, `test-mobile` cuando apliquen.

## 2. Analizar → `changes/<id>/explore.md`
- Busca con grep/glob por términos del input; abre solo los archivos relevantes (máx. ~15).
- Lee `AGENTS.md`/`CLAUDE.md` del proyecto si existen (convenciones locales mandan).
- Si el cambio toca UI: indica si existen `PRODUCT.md`/`DESIGN.md` o `.sdd/memoria/temas/producto.md`/`diseno.md` y dónde están los tokens de diseño (para el designer).

```markdown
# Exploración
## Archivos relevantes
| Archivo | Por qué |
## Flujo actual (cómo funciona hoy)
## Causa probable (solo fix) — con evidencia: archivo:línea
## Riesgos / áreas afectadas
## Preguntas abiertas
```
Devuelve ≤10 líneas: stack detectado, archivos clave, causa probable, preguntas.
