# Fuentes vigiladas de las Normas Generales SAG

Páginas de la wiki que resume `normas.md`. Wiki `Normas-Generales.wiki`, proyecto `Normas Generales`,
organización `SubdepartamentoSolucionesTI`.

Formato: una fila por página en la tabla de abajo, con `|` al inicio y al final y el `pagePath` empezando
por `/`. Las páginas se comprueban con la skill `general-standards` por el MCP de Azure DevOps (no hay aviso
automático al iniciar la sesión). Borrar filas enteras se controla al revisar la PR. La lista es fija, así que
una subpágina nueva de la wiki no se revisa hasta que se agregue aquí.

- **Página:** nombre corto, para leer.
- **pagePath:** ruta exacta en la wiki, sin codificar. Se codifica al armar la URL (`encodeURIComponent`).
- **Temas:** palabras clave para encontrar la fuente de una duda.
- **Versión revisada:** ETag de la página, sin comillas, con que se revisó `normas.md`.

La columna **Versión revisada** se actualiza solo después de revisar `normas.md` contra la página, y
con la aprobación de una persona, como cambio visible en una PR. Que cambie sin revisión deja de
avisar de un cambio real.

La ETag es el SHA-1 del blob git del contenido de la página: cambia solo si cambia el contenido y es
la misma con o sin `includeContent`. Una columna vacía significa que la API entrega la ETag vacía: hoy
pasa solo con `API Regionalizacion/Pruebas` y `CI CD`, que son carpetas sin contenido propio.

| Página | pagePath | Temas | Versión revisada |
|---|---|---|---|
| Next JS | /Desarrollo/Definiciones transversales/Next JS | nextjs, índice sin contenido | e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 |
| Next JS/Estructura del proyecto | /Desarrollo/Definiciones transversales/Next JS/Estructura del proyecto | nextjs, estructura, convenciones | a608a39d51afa9d417cfe4e04158ef32bb8aa1f0 |
| Next JS/Integración Consul | /Desarrollo/Definiciones transversales/Next JS/Integración Consul | nextjs, consul, configuración | 5339255dc10246766e07f6bf77b7fa0ff943164d |
| Next JS/Componentes | /Desarrollo/Definiciones transversales/Next JS/Componentes | nextjs, componentes UI | 2ec3c3e1e014a387915bf5179cb38f2b7c1dc813 |
| Documentación de componentes y modulos | /Desarrollo/Definiciones transversales/Documentación de componentes y modulos | documentación | 2fe111141497d7d8d2be06b0f8c59684f3a4b01c |
| Manejo de sesiones en soluciones tecnológicas | /Desarrollo/Definiciones transversales/Manejo de sesiones en soluciones tecnológicas | sesiones, seguridad | 744d4d1ce24c85b48f074efd7a610f82dcbbda56 |
| Componentes Transversales | /Desarrollo/Componentes Transversales | transversales, catálogo | 8978d034caddd1f5c8db9a1db2ade71761facdf6 |
| API Auditoria | /Desarrollo/Componentes Transversales/API Auditoria | transversales, auditoría | 1737f12d96131ead595e59e9e4af649c9d795752 |
| API Autenticacion | /Desarrollo/Componentes Transversales/API Autenticacion | transversales, autenticación, sesiones | 893b8f620e22eb107e1ca88e26bb02fc7bcb57e9 |
| API Authorizacion | /Desarrollo/Componentes Transversales/API Authorizacion | transversales, autorización | 355c3d84fea3693cb73661ada5898c19618e9637 |
| API Calendarios | /Desarrollo/Componentes Transversales/API Calendarios | transversales, calendarios | 0bd26fbfc772495f2f05265e7451800290bad403 |
| API Controles Fronterizos | /Desarrollo/Componentes Transversales/API Controles Fronterizos | transversales, en construcción | f28ebf905c84a6cb9b8130d8d27a30f1df6f2bfa |
| API Envio Correo | /Desarrollo/Componentes Transversales/API Envio Correo | transversales, correo | fd408c6b48461ef3d210b8464b62a6a9ac939277 |
| API Firmador | /Desarrollo/Componentes Transversales/API Firmador | transversales, firma de documentos | 7ce73018295347dd2db5df848d1ad02ea209aaf9 |
| API Generador de Documentos | /Desarrollo/Componentes Transversales/API Generador de Documentos | transversales, documentos PDF | 5fcade828fe90f9aae43ca1c3076cbb3a05d68a6 |
| API Notificaciones | /Desarrollo/Componentes Transversales/API Notificaciones | transversales, notificaciones, SSE | 7287957bfda8eaf2d1c0aac623c7dd644614e748 |
| API Personas | /Desarrollo/Componentes Transversales/API Personas | transversales, personas | b6f5f54ba721adc47a27022d1a9d5f7e588bff93 |
| API Regionalizacion | /Desarrollo/Componentes Transversales/API Regionalizacion | transversales, regionalización | 1e798a6763af3625305c2a04d5e59073eb042c2c |
| API Regionalizacion/Documentacion Swagger | /Desarrollo/Componentes Transversales/API Regionalizacion/Documentacion Swagger | regionalización, swagger | a8c597bac36d8531ff6e4068e4072ac873eb487b |
| API Regionalizacion/Endpoints Comunas | /Desarrollo/Componentes Transversales/API Regionalizacion/Endpoints Comunas | regionalización, endpoints | bab809e0653accfd56af244f12d494948fefe24e |
| API Regionalizacion/Endpoints Paises | /Desarrollo/Componentes Transversales/API Regionalizacion/Endpoints Paises | regionalización, endpoints | 5641449546f87512efc483b39a40aebfecd71a39 |
| API Regionalizacion/Endpoints Provincias | /Desarrollo/Componentes Transversales/API Regionalizacion/Endpoints Provincias | regionalización, endpoints | 395eddf0d17c3dec9054b1ed703f5a6584162c33 |
| API Regionalizacion/Endpoints Regiones | /Desarrollo/Componentes Transversales/API Regionalizacion/Endpoints Regiones | regionalización, endpoints | 6508e93d7af25dacb123ddd4ae27dea98a630754 |
| API Regionalizacion/Introduccion y Generalidades | /Desarrollo/Componentes Transversales/API Regionalizacion/Introduccion y Generalidades | regionalización, generalidades | a63ef843452ba2ba0ac111c5e985b37222dd20b9 |
| API Regionalizacion/README | /Desarrollo/Componentes Transversales/API Regionalizacion/README | regionalización, índice | d1a852bc3c3e7dba42e1bdc85ade2c6f4aeb4879 |
| API Regionalizacion/Pruebas | /Desarrollo/Componentes Transversales/API Regionalizacion/Pruebas | regionalización, pruebas, carpeta sin contenido |  |
| API Regionalizacion/Pruebas/Diagramas Pruebas | /Desarrollo/Componentes Transversales/API Regionalizacion/Pruebas/Diagramas Pruebas | regionalización, pruebas | 640702ed0b4fb269d78ad06c5cce3d8d1856e43e |
| API Regionalizacion/Pruebas/Guia Pruebas Postman | /Desarrollo/Componentes Transversales/API Regionalizacion/Pruebas/Guia Pruebas Postman | regionalización, pruebas | fe297620a02ec5c505cd7ecdf0a2f76a1784599f |
| API Regionalizacion/Pruebas/README | /Desarrollo/Componentes Transversales/API Regionalizacion/Pruebas/README | regionalización, pruebas | ef1afbc90aef03ac39fabc1603e23791711be6b3 |
| API Usuario (Funcionario) | /Desarrollo/Componentes Transversales/API Usuario (Funcionario) | transversales, funcionarios | 2e45168f4f549809f02df4bc6b1c86bd53f396d7 |
| Gestor de archivos transversal | /Desarrollo/Componentes Transversales/Gestor de archivos transversal | transversales, archivos | cff46edbc70d28882cb6600b820e5419d950e7b2 |
| Consul | /Desarrollo/Consul | consul, ambientes, nomenclatura | f2d14ab43304f2e19fba492c444c7bfa68adbfc1 |
| Consul/Actualizacion variables | /Desarrollo/Consul/Actualizacion variables | consul, solicitudes | a344032fc5f3ab8e86027b760c8431326710dac8 |
| Consul/Creación variables | /Desarrollo/Consul/Creación variables | consul, solicitudes | 0c0fd2f5dfda27d9b6205e42eda1b44adc4451a9 |
| Consul/Tokens-y-Policies-ACL | /Desarrollo/Consul/Tokens-y-Policies-ACL | consul, tokens, seguridad | 11747493d327bb8828d2cf5a8088ce6e0357d69d |
| Integracion SSO | /Desarrollo/Integracion SSO | sso, openid connect, índice | dc470841c09f1b08f68c312a541660355182ae01 |
| Integracion SSO/Arquitectura y Conceptos | /Desarrollo/Integracion SSO/Arquitectura y Conceptos | sso, openid connect, conceptos | 87bda0be50a82e0364e9944fee2dc3a4e45cfd91 |
| Integracion SSO/Configuracion Clientes | /Desarrollo/Integracion SSO/Configuracion Clientes | sso, clientes, mapeo de atributos, alcances | b3eae45ce35639993fbd7b4c3ea5dc5f110df5df |
| Integracion SSO/Despliegue e Instalacion | /Desarrollo/Integracion SSO/Despliegue e Instalacion | sso, proveedores, configuración, dependencias | d95fd0558c5fee761f6cdc4326f2974a7ef76777 |
| Integracion SSO/Despliegue e Instalación de ambientes de prueba | /Desarrollo/Integracion SSO/Despliegue e Instalación de ambientes de prueba | sso, ambiente de prueba, docker | 63312034be7abb1495995b03bdac1f57b681577a |
| Integracion SSO/Ejecucion y Pruebas | /Desarrollo/Integracion SSO/Ejecucion y Pruebas | sso, flujos, casos de prueba, errores | 128449132b0a8c3f859c48ecf7617e5882d51da0 |
| Integracion SSO/Seguridad y Autenticacion | /Desarrollo/Integracion SSO/Seguridad y Autenticacion | sso, seguridad, tokens | fa5392db68ec9bccc22e2598a668aad0e03f8a9b |
| CI CD | /Desarrollo/CI CD | ci/cd, carpeta sin contenido |  |
| CI CD/Implementación con V7 | /Desarrollo/CI CD/Implementación con V7 | ci/cd, v7, despliegue, consul, openshift | 5449919b8385d108942e6186ecad48345c87b30b |
