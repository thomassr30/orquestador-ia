---
name: iac-terraform
description: Infraestructura como código con Terraform u OpenTofu (módulos, estado remoto con bloqueo, entornos, variables y secretos, fmt/validate/plan, seguridad). Usar al crear o modificar archivos .tf.
---
# Terraform / OpenTofu

Aplica los principios de `devops-cicd`.

## Estructura
```
infra/
├── modules/<componente>/ (main.tf, variables.tf, outputs.tf, versions.tf, README.md)
└── envs/ dev/ qa/ prod/ (main.tf que usa módulos, backend.tf, terraform.tfvars sin secretos)
```
## Reglas
- `required_version` y `required_providers` con versiones fijadas; `.terraform.lock.hcl` versionado.
- **Estado remoto con bloqueo** (backend de la nube/organización); el estado contiene datos sensibles: acceso restringido y cifrado. Nunca estado local para entornos compartidos.
- Variables tipadas con `validation`; `sensitive = true` en secretos; secretos desde gestor (Vault, Key Vault, Secrets Manager), no en `.tfvars` versionados.
- Módulos pequeños con una responsabilidad; outputs mínimos; nombres y etiquetas consistentes.
- Evitar `count` con listas cambiantes (usar `for_each` con claves estables); `prevent_destroy` en recursos críticos (BD).
## Validación local
`terraform fmt -check -recursive` · `terraform validate` · `tflint` · `checkov`/`trivy config` si están disponibles.
## Plan y apply (decisiones críticas)
- `terraform plan -out=plan.tfplan` contra un entorno ya requiere credenciales: pedir aprobación.
- Mostrar al usuario el resumen del plan (crear/modificar/**destruir**) antes de proponer `terraform apply plan.tfplan`. Nunca `apply -auto-approve`.
