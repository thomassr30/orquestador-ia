# Cómo contribuir

## Principios
1. **Guías cortas, detalle en skills.** Las reglas globales y los agentes son un mapa; el conocimiento va en `core/skills/<nombre>/SKILL.md` y `references/`. Una skill por plataforma o tecnología para que ninguna crezca demasiado.
2. **Lo que debe cumplirse siempre va en código** (`harness/`), no solo en instrucciones.
3. **Falla abierta.** Un hook con un error interno nunca bloquea el trabajo del usuario.
4. **Sin red, sin claves, sin dependencias** en el harness: solo Node.js.
5. **Ahorro de contexto.** Cada texto que se inyecta a la IA debe justificar sus tokens.
6. **Todo en español** (mensajes al usuario y a la IA).

## Estructura
- `core/`: reglas globales, 22 agentes, 104 skills y comandos (lo que lee la IA).
- `harness/src/`: núcleo común (política, GATE, sensores, memoria, presupuesto, reglas propias) y un adaptador por herramienta en `adapters/`.
- `harness/opencode/`: plugin de OpenCode.
- `bin/`: hooks (`sdd-hook.js`), compactador de salidas, diagnóstico, evaluaciones y scripts de memoria.
- `install.js`: instala en cada herramienta y registra los hooks; la desinstalación quita solo lo propio.

## Antes de enviar un cambio
```bash
npm test                      # 60+ pruebas: política, GATE, sensores, adaptadores, instalación
node install.js --dry-run     # revisa qué escribiría
```
Si cambias cómo se comporta la IA (agentes, skills, reglas), mide con `node bin/sdd-eval.js` sobre tareas reales antes y después.

## Agregar soporte para otra herramienta
1. Crea `harness/src/adapters/<herramienta>.js` con `parse(eventoNativo, entrada)` → evento común y `format(eventoNativo, decisión)` → salida de la herramienta.
2. Registra sus hooks en `harness/src/hooks-config.js` y en `install.js`.
3. Agrega pruebas en `harness/test/adapters.test.js` y `install.test.js`.

## Versiones
Sube la versión en `package.json` y anota el cambio en `CHANGELOG.md` (SemVer).
