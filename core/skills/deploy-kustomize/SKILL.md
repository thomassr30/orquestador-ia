---
name: deploy-kustomize
description: Manifiestos Kubernetes con Kustomize (base y overlays por entorno, patches, generadores de ConfigMap/Secret, transformación de imágenes, components). Usar al crear o modificar kustomization.yaml u overlays.
---
# Kustomize

Aplica los principios de `devops-cicd` y `deploy-kubernetes`.

## Estructura
```
k8s/
├── base/ (deployment.yaml, service.yaml, kustomization.yaml)
├── components/ (opcional: piezas reutilizables, ej. monitoreo)
└── overlays/ dev/ qa/ prod/ (kustomization.yaml + patches)
```
## Reglas
- La base es válida por sí sola y sin datos de entorno; los overlays solo cambian lo que difiere (réplicas, recursos, config, imagen).
- Patches: strategic merge para cambios simples; JSON 6902 (`patches` con `target`) para cambios precisos.
- `images:` para fijar imagen/tag por overlay (no editar el YAML base).
- `configMapGenerator` (agrega hash al nombre → rollout automático al cambiar config); Secrets desde gestor externo, no `secretGenerator` con valores versionados.
- `namespace`, `labels`/`commonLabels` coherentes por overlay.
## Validación local
`kubectl kustomize overlays/<env>` o `kustomize build overlays/<env>` y revisar el resultado. Aplicar al cluster = decisión crítica.
