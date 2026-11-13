# Normas Generales SAG aplicables a este frontend

Resumen en español de las páginas vigiladas (`fuentes.md`), revisado el 2026-11-03. No reemplaza a la
wiki: para el detalle se lee la página de origen. No incluye valores, hosts ni credenciales.

Etiquetas:

- **[Aplica]:** vale para este frontend.
- **[BFF o infra]:** vale para el sistema, pero se resuelve fuera de este repositorio.
- **[Si se integra]:** solo vale si el frontend llega a usar ese componente.
- **Difiere del repo:** la wiki y el repo no coinciden y nadie lo ha resuelto. No se corrige solo: se
  avisa y se pregunta a la persona.

## Sesiones

Origen: `Manejo de sesiones en soluciones tecnológicas`. La página dice que aplica a todas las
aplicaciones nuevas, sea cual sea la tecnología.

- [Aplica] La sesión dura como máximo 15 minutos de inactividad. **Difiere del repo:** el frontend no
  mide inactividad y toma el TTL que entrega el BFF, con un valor de respaldo mayor.
- [Aplica] A los 15 minutos de inactividad se muestra una alerta, con 3 minutos de gracia antes del
  cierre definitivo. La alerta permite continuar o cerrar la sesión. **Difiere del repo:** no existe.
- [Aplica] Al cerrar la pestaña o el navegador, la sesión termina. **Difiere del repo:** no se hace.
- [BFF o infra] No se permite la misma sesión en dos dispositivos o navegadores a la vez: al entrar en
  uno nuevo se cierra la anterior. **La wiki se contradice:** `API Autenticacion` dice que cada login
  crea una sesión independiente y admite varias simultáneas.
- [Aplica] Cookies o tokens con banderas de seguridad y lo mínimo posible de información en el cliente.
- [BFF o infra] Protección CSRF en operaciones sensibles, identificadores de sesión no predecibles,
  limpieza de sesiones inactivas, registro de inicios y cierres para auditoría y monitoreo de sesiones.

## Estructura y convenciones Next.js

Origen: `Next JS/Estructura del proyecto`. La página describe otro proyecto (portal) como referencia.

- [Aplica] Arquitectura modular por funcionalidad, no por tipo de archivo, con Next.js App Router.
- [Aplica] Componentes en PascalCase, utilidades en camelCase e imports con alias absoluto.
- [Aplica] TypeScript con tipos e interfaces, componentes funcionales con hooks y estilos con Tailwind.
- [Aplica] Páginas con la lógica en componentes cliente separados.
- [Aplica] Componentes responsivos, reutilizando los de UI existentes para mantener la consistencia.
- [Aplica] Validar los datos tanto en el cliente como en el servidor.
- [Aplica] Carpetas de módulo `actions/`, `components/client/`, `data/`, `lib/`, `types/` y `context/`.
  **Difiere del repo:** usa `components/`, `hooks/`, `store/`, `schemas/`, `types/` y `utils/`.
- [Aplica] UI propia en `src/global/components/ui/`. **Difiere del repo:** vive en `src/global/ui`.
- [Aplica] Server Actions para operaciones del servidor. **Difiere del repo:** los datos de UI van por
  proxy y React Query; `'use server'` queda para configuración y sesión.
- [Aplica] Contexto de React para estado global, con un provider y un hook por responsabilidad, lo más
  abajo posible en el árbol. **Difiere del repo:** usa Zustand y React Query, y Context solo para auth.
- [Aplica] Temas claro y oscuro con `ThemeSwitch`. **Difiere del repo:** no hay cambio de tema.
- [Aplica] Configuración en `tailwind.config.ts`. **Difiere del repo:** Tailwind 4 no usa ese archivo.

## Componentes de UI

Origen: `Next JS/Componentes`. Las subpáginas por componente (Alert, Badge, etc.) no se vigilan.

- [Aplica] Usar componentes estandarizados antes que recrearlos, y centralizar sus cambios.
- [Aplica] Cada componente tiene variantes, va completamente tipado, es responsivo y cumple los
  estándares de accesibilidad.
- [Aplica] Compatibles con temas claro y oscuro. **Difiere del repo:** ver "Temas" arriba.

## Documentación

Origen: `Documentación de componentes y modulos`. La página la presenta como estructura recomendada.

- [Aplica] Carpeta `/docs` con índice, arquitectura, `frontend/` (módulos, componentes, hooks, contexto,
  tipos) y guías. **Difiere del repo:** no tiene `docs/`.
- [Aplica] Plantillas para documentar módulo, componente, hook, contexto, tipos, Server Actions,
  arquitectura y decisiones (ADR), con diagramas Mermaid cuando el concepto es complejo.
- [Aplica] Documentación al día, con ejemplos reales y sin contenido obsoleto.

## Consul y configuración

Origen: `Consul`, `Actualizacion variables`, `Creación variables`, `Tokens-y-Policies-ACL` y
`Next JS/Integración Consul`.

- [Aplica] Toda aplicación obtiene su configuración de Consul según el ambiente. Son 4 ambientes: `dev`,
  `qa`, `test` y `prod`. **Difiere del repo:** `README.md` y `CLAUDE.md` nombran `dev/qa/prod`, y una
  `APP_URL` con `qa` se resuelve como `test` salvo que `CONSUL_ENV` lo fuerce.
- [Aplica] Key de la aplicación: `[ambiente]/sag.[proyecto].[tipo_componente].[nombre]/config`.
  **Difiere del repo:** `Creación variables` lista como tipos `api`, `web`, `worker` y `job`, y este
  repositorio usa `app` (`sag.laboratorio.app.frontend`).
- [Aplica] Las referencias a otras keys se escriben relativas: el ambiente lo antepone la aplicación.
- [Aplica] Crear o actualizar una key se pide con un ticket de apoyo en Azure DevOps, indicando el path
  exacto o el JSON completo. Antes de pedirlo se valida el JSON, se revisan dependencias con otras keys
  y se indica si requiere reinicio. Los valores sensibles se marcan para que se generen.
- [Aplica] Un cambio se prueba primero en un ambiente inferior. Para `prod` se adjunta la evidencia y se
  coordina la ventana si afecta la disponibilidad.
- [Aplica] La configuración se carga al iniciar la aplicación, con mapeo centralizado de keys a variables,
  validación de lo requerido y caché. **Difiere del repo:** la wiki inicia desde `middleware.ts` con
  `consulActions.ts`, `envValidator.ts` y `consulInit.ts`, y el repo desde `instrumentation.ts` con
  `consulAction.ts` y `envMapping.ts` (validación con zod).
- [Aplica] Variables de ambiente requeridas en la aplicación: las `CONSUL_*`, `NODE_ENV`, `APP_NAME`,
  `APP_URL` y las de logs y trazas. **Difiere del repo:** el código exige un subconjunto y no usa las de
  logs y trazas que lista la wiki.
- [BFF o infra] Por proyecto hay un token de lectura por ambiente, que DTI crea y se inyecta como secret
  en el pipeline, y un token de escritura por empresa o desarrollador solo para `dev`, `qa` y `test`.
- [BFF o infra] El token de escritura no da permisos sobre keys transversales ni de base de datos.
- [BFF o infra] Los tokens no se comparten entre proyectos, llevan descripción y se validan contra cada
  key antes de desplegar. La policy de lectura debe cubrir cada campo `*ConfigValue` del `config`: si
  falta uno, falla en runtime o en el pipeline. Al agregar una dependencia se actualiza la policy.

## Integración SSO

Origen: `Integracion SSO` y sus subpáginas. La wiki la presenta como una guía independiente del proveedor
y sus ejemplos de código son orientativos. Algunos títulos no calzan con el nombre de la página:
`Despliegue e Instalacion` trata de la integración con proveedores y `Ejecucion y Pruebas`, de flujos y
validación. En este sistema el flujo lo resuelve el BFF.

- [Aplica] El cliente público (frontend) no guarda secretos. El cliente confidencial (backend) guarda las
  credenciales, valida los tokens, accede a los recursos y gestiona la renovación. Origen:
  `Seguridad y Autenticacion`.
- [Aplica] El código de autorización se cambia por tokens solo en el backend, y el secreto del cliente nunca
  llega al frontend. Origen: `Seguridad y Autenticacion`.
- [Aplica] El refresh token solo se usa desde el backend. Origen: `Seguridad y Autenticacion`. **La wiki se
  contradice:** los ejemplos de `Ejecucion y Pruebas` guardan los tokens en `localStorage` y los renuevan
  desde el navegador. No se copia ese ejemplo.
- [Aplica] El frontend es un cliente OpenID Connect con Authorization Code y PKCE, y usa `oidc-client-ts` y
  `jose`. Origen: `Configuracion Clientes`, `Despliegue e Instalacion`. **Difiere del repo:** no tiene
  cliente OpenID Connect ni esas dependencias. Pide la URL de login al BFF y solo redirige.
- [Aplica] El frontend recibe el ID Token, identifica al usuario con él y llama a las APIs con el token en el
  encabezado de autorización. Origen: `Seguridad y Autenticacion`, `Ejecucion y Pruebas`. **Difiere del
  repo:** cambia un token de traspaso por una sesión en la cookie `bff_session` y llama por el proxy, que
  reenvía la cookie. El navegador no maneja tokens del proveedor.
- [Aplica] Los ejemplos exponen la autoridad, el id de cliente y la URI de redirección en variables del
  frontend (`REACT_APP_*`, `env` de `next.config`). **Difiere del repo:** no las usa, y la constitución IV
  prohíbe URLs internas en variables públicas. Origen: `Arquitectura y Conceptos`, `Despliegue e Instalacion`.
- [Aplica] El flujo contempla autenticación cancelada o fallida, falta del código, tokens expirados y errores
  de conexión. Se prueba además el acceso a APIs protegidas, con permisos por endpoint. Origen:
  `Ejecucion y Pruebas`.
- [Aplica] El cierre de sesión es seguro y forma parte de la verificación de la integración. Origen:
  `Despliegue e Instalacion`.
- [BFF o infra] Cada aplicación tiene su dominio de autenticación con sus políticas, y un cliente confidencial
  con secreto o certificado y cuenta de servicio. Las URIs de redirección son específicas y exigen HTTPS fuera
  del ambiente local. Las credenciales las entrega el administrador del proveedor. Origen:
  `Configuracion Clientes`, `Despliegue e Instalacion`.
- [BFF o infra] Los atributos de los proveedores federados (Clave Única, Microsoft, Clave Tributaria) se
  normalizan a un esquema interno consistente entre ambientes. Cada token lleva solo lo necesario, con
  alcances que lo controlan, y los mapeos se registran para auditoría. Origen: `Configuracion Clientes`.
- [BFF o infra] Se valida `state` en el retorno, y firma, emisor, audiencia y expiración del token en cada
  solicitud. Origen: `Arquitectura y Conceptos`, `Seguridad y Autenticacion`, `Ejecucion y Pruebas`.
- [BFF o infra] Las pruebas cubren la federación con varios proveedores y la consistencia de sus atributos.
  El ambiente de prueba de referencia se levanta con Git y Docker Compose. Origen: `Ejecucion y Pruebas`,
  `Despliegue e Instalación de ambientes de prueba`.

## CI/CD

Origen: `CI CD/Implementación con V7`. `CI CD` es una carpeta sin contenido propio. V7 aplica a aplicaciones
Node.js nuevas y a migraciones desde V6, no a .NET ni a scripts o jobs puntuales.

- [Aplica] El `name` de `package.json` coincide exactamente con la key de Consul y sigue
  `sag.{sistema}.{componente}`. **La wiki se contradice:** `Consul/Creación variables` define
  `sag.[proyecto].[tipo_componente].[nombre]`, y el repo tiene esos cuatro segmentos.
- [Aplica] Ningún secreto se escribe en el código: todos van en Consul.
- [Aplica] El Build Pipeline en YAML publica como artifacts `package.json` y, si aplica,
  `deploy-openshift.yaml`. En este repo lo delega en la plantilla V7 que extiende `azure-pipelines.yml`.
- [BFF o infra] El Release Pipeline tiene un stage por ambiente con una sola variable, `ENVIRONMENT`, y el
  Task Group de plantillas. Los ambientes son `dev`, `qa`, `test` y `prod`: ver "Consul y configuración".
- [BFF o infra] La configuración de despliegue vive en la key `{ambiente}/{nombre-proyecto}/deploy`, distinta
  de la key `config` de la aplicación, y se valida con `validate-deploy-config.sh` antes de subirla.
- [BFF o infra] CPU, memoria y réplicas se cambian en Consul y se aplican con un nuevo Release, sin editar el
  pipeline. **La wiki se contradice:** esta página muestra escritura directa con `consul kv put` y
  `Consul/Actualizacion variables` la pide por ticket.
- [BFF o infra] Se despliega a un ambiente a la vez.
- [BFF o infra] Está prohibido modificar los scripts de las plantillas, agregar variables al Release Pipeline
  y compartir tokens entre ambientes.
- [BFF o infra] Se recomienda comenzar por `dev`, revisar los logs después de desplegar y documentar los
  cambios de configuración.

## Componentes transversales

Origen: `Componentes Transversales` y la página de cada API.

Comprobado con Grep en `src/` el 2026-11-03: este frontend no integra directamente ninguno; solo habla
con el BFF. No se verificó qué componentes usa el BFF.

Reglas comunes, si alguno se integra:

- [Si se integra] Se consumen desde el backend, nunca desde el navegador. Las credenciales del componente
  (`X-API-Key`, `X-Component-Codigo`, `X-Environment-Slug` o token estático) no llegan al frontend ni se
  escriben en el código. Cada ambiente tiene las suyas. Origen: páginas de cada API.
- [Si se integra] Hay que registrar el sistema en el Portal Web de Desarrollo SAG. Origen: `API Auditoria`,
  `API Autenticacion`, `Gestor de archivos transversal`.
- [Aplica] Los permisos llegan ya resueltos desde el backend, y un JWT en el frontend solo sirve para leer
  datos, nunca para autorizar. Origen: `API Authorizacion`, `API Autenticacion`.

| Componente | Qué es | Cuándo importa | Origen |
|---|---|---|---|
| Auditoría | Registro centralizado y asíncrono de eventos | Registrar acciones auditables. La página indica que auditoría no es un registro de eventos y que sus registros no se leen desde un sistema, aunque documenta endpoints de consulta | `API Auditoria` |
| Autenticación | Login, roles y permisos sobre el SSO | Cambios en el flujo de acceso, que aquí resuelve el BFF | `API Autenticacion` |
| Autorización | Roles y permisos efectivos (RBAC) | Reglas de acceso por usuario, siempre desde el backend | `API Authorizacion` |
| Calendarios | Calendarios, feriados y días hábiles | Cálculo de plazos o fechas hábiles | `API Calendarios` |
| Controles Fronterizos | Página en construcción, sin contenido útil | Por ahora, no aplica | `API Controles Fronterizos` |
| Envío de Correo | Envío con plantillas, copias y adjuntos | Correos directos sin pasar por Notificaciones | `API Envio Correo` |
| Firmador | Estampa y firma electrónica de PDF | Documentos con firma institucional | `API Firmador` |
| Generador de Documentos | PDF desde plantillas, con folio y firma | Certificados, actas o resoluciones | `API Generador de Documentos` |
| Notificaciones | Envío multicanal (correo, in-app, push, Casilla Única); el catálogo la marca en construcción | Avisos a usuarios. El SSE se implementa en el BFF, no en el navegador, y no reemplaza la bandeja: se usa como disparador para refrescarla | `API Notificaciones` |
| Personas | Personas, direcciones y documentos | Datos de personas o interesados | `API Personas` |
| Regionalización | Regiones, provincias, comunas y países | Selectores o datos territoriales | `API Regionalizacion` y subpáginas |
| Usuarios (Funcionarios) | Lectura de funcionarios, roles, divisiones y oficinas | Datos del directorio organizacional | `API Usuario (Funcionario)` |
| Gestor de Archivos | Subida, descarga y organización de archivos | Almacenar o recuperar archivos | `Gestor de archivos transversal` |
