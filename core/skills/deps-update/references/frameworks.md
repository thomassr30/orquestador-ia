# Frameworks
- **Angular**: `ng update` muestra lo pendiente; actualizar de una versión mayor a la siguiente (`ng update @angular/core@<N> @angular/cli@<N>`), aplicar migraciones automáticas y revisar la guía oficial de actualización.
- **NestJS**: actualizar todos los `@nestjs/*` a la misma mayor; revisar la guía de migración (cambios en Express/Fastify, Node mínimo).
- **Next.js**: codemods oficiales (`npx @next/codemod`) y guía de actualización; revisar cambios de caché/fetch y React requerido.
- **AdonisJS**: guía de actualización entre mayores; `node ace` para migraciones de configuración si existen.
- **React**: codemods oficiales para mayores; revisar compatibilidad de librerías (router, estado, UI).
