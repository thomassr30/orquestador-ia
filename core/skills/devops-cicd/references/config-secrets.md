# Configuración y secretos

## Principios (12-factor)
- Configuración por entorno fuera del código; el mismo build sirve para todos los entornos.
- **Esquema de configuración tipado y validado al arrancar** (zod/class-validator/envalid en Node, struct + validación en Go): si falta una clave obligatoria, el proceso termina con un error que indica **qué clave**, **de qué fuente** (KV/variable) y **qué claves sí llegaron** (solo nombres).
- Valores por defecto solo para opciones no críticas y documentados.

## Consul KV
- Documenta en la memoria (`temas/configuracion.md`) la ruta de claves por servicio y entorno (ej. `config/<servicio>/<entorno>`), solo nombres de claves.
- Lectura con timeout y reintentos acotados al arrancar; si es obligatoria y falla, fail fast.
- Cambios en claves reales del KV = decisión crítica (otros servicios pueden depender de ellas).
- Interfaces/tipos del objeto de configuración en el código deben coincidir con la estructura del KV; ante cambios, actualiza ambos y la memoria.

## Vault / Secrets
- Secretos solo desde Vault o Kubernetes Secrets (idealmente sincronizados desde el gestor); rotación prevista.
- Nunca imprimir valores en logs, errores ni reportes; enmascarar.

## Archivos .env
- `.env.example` versionado con todas las claves (sin valores reales); `.env` en `.gitignore`.
