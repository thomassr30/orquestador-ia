---
name: config-consul
description: Configuración de servicios con HashiCorp Consul (KV por servicio y entorno, lectura al arrancar con validación, ACL, consul-template/envconsul, service discovery y health checks). Usar cuando el proyecto lea configuración o descubra servicios con Consul.
---
# Consul

Aplica los principios de `devops-cicd`.

## Configuración en KV
- Jerarquía documentada (ej. `config/<servicio>/<entorno>/…`) y registrada en memoria (`.sdd/memoria/temas/configuracion.md`) **solo con nombres de claves**, nunca valores.
- El tipo/interfaz de configuración en el código debe reflejar exactamente la estructura del KV; si cambia uno, se actualiza el otro y la memoria.
- **Lectura al arrancar**: timeout y reintentos acotados; validar con esquema; si falta una clave obligatoria → terminar con error claro (clave esperada, ruta del KV, claves recibidas).
- Cambios en caliente (watches/blocking queries) solo si el servicio está diseñado para recargar configuración de forma segura.
- Alternativas sin código: `consul-template` / `envconsul` para renderizar archivos o variables de entorno.

## Seguridad
- **ACL token** con política mínima (lectura de la ruta del servicio); token desde Secret/Vault, nunca en el repo.
- Nada de secretos en KV si existe Vault (ver `config-vault`); si no hay alternativa, ruta con ACL restringida.

## Service discovery
- Registro con health checks (HTTP a `/health/ready`); clientes que resuelven por nombre de servicio con reintentos.

## Operación (decisiones críticas)
`consul kv get -keys <ruta>` (listar nombres) para diagnóstico, con aprobación. `consul kv put/delete` en entornos reales: solo propuesto; otros servicios pueden depender de esas claves.
