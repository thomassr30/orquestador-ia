Proyecto: C:/dev/orquestador-ia
<!-- harness:inicio (bloque automático del harness; no editar) -->
Última actividad: 2026-11-04 12:37 (claude) · Plan: aprobado
Pedido en curso: pero para que detecte mejor debemos añadir skill de figma para que funcione y tambien agrega mas informacion sobre instalar mcp
Archivos modificados en la sesión: harness/test/fixtures/adaptadores/gemini/before-tool-deny.json, harness/test/fixtures/adaptadores/opencode/tool-before-commit.json, harness/test/git-sdd.test.js, harness/test/hook.e2e.test.js, harness/test/install.test.js, harness/test/opencode.test.js, harness/test/output.test.js, harness/test/policy.test.js, install.js, core/skills/design-quality/SKILL.md, core/skills/design-context/SKILL.md, README.md, harness/test/install-mcp.test.js, config/mcp.json, core/skills/figma-design/SKILL.md (+13 más)
Sensores: aprobado — ✓ tests
<!-- harness:fin -->

Objetivo actual: plan de mejora del harness (análisis del 2026-11-06). 3.1.0 entregada; lo que queda está en pendientes.md.

Estado: 3.1.0 lista. Commiteado hasta 99e561f; el bloque de preguntas abiertas y contexto está sin commit. npm test 225/225 (224 pass + 1 skip por disco sensible a mayúsculas), ~50 s medidos en disco local, nunca sobre la carpeta montada.

Próximo paso: `npm run update` para que los hooks instalados usen 3.1.0, y registrar Azure por proyecto: en el repo de JUNJI `node install.js --mcp=azure-devops --org=siigsa --proyecto` y en el de SAG con --org=sag. Lo que queda del plan: medir el consumo con uso real (sdd-harness consumo) y elegir qué skills excluir en config/skills.json según lo que uses de verdad. Dato: los agentes NO precargaban skills (el campo skills: del frontmatter no se escribía en el archivo del cliente); el costo fijo son las descripciones, ~6.400 tokens con las 105.

Decisiones vigentes de esta etapa: el GATE se deja como está; `.sdd` se queda en la raíz; ODD no se adopta, solo ideas puntuales; el harness no publica en Azure, entrega las preguntas listas para que el usuario las publique; un MCP de Azure por proyecto, con el nombre del servidor por organización (JUNJI usa la organización de SIIGSA, SAG tiene la suya).

Dónde está lo demás: cambios por versión en CHANGELOG.md · decisiones y su motivo en decisiones.md · deuda y riesgos en pendientes.md · bitácora de sesiones terminadas en temas/sesiones-anteriores.md · plan completo de mejora en el documento «Orquestador SDD · cambios pendientes».
