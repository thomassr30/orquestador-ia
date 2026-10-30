---
name: post-deploy-check
description: Verificación después de desplegar (smoke test) — estado de pods, logs de arranque, configuración esperada, health endpoints, flujos clave en el navegador y recomendación de rollback. Usar cuando el usuario despliegue un cambio o pida verificar un entorno.
---
# Verificación post-despliegue

Entrada: entorno (dev/qa/prod), servicio(s), versión/commit esperado y el cambio relacionado (si existe). Si falta, pregúntalo.

## Checklist (en orden; comandos de cluster con aprobación del usuario)
1. **Versión desplegada** = esperada (tag de imagen del deployment / endpoint de versión).
2. **Pods** `Running` y `Ready`, sin reinicios recientes (`kubectl get pods`, `describe` si hay problemas).
3. **Logs de arranque**: sin errores; configuración cargada (nombres de claves); conexión a dependencias OK.
4. **Health**: `/health/ready` y `/health/live` responden 200.
5. **Smoke funcional**: con `sdd-browser-operator` (skill `browser-automation`), recorrer 1–3 flujos clave del cambio en el entorno (solo lectura salvo que el usuario autorice crear datos de prueba).
6. **Errores**: revisar consola/red en el navegador y logs del servicio durante el smoke.
7. **Verificaciones manuales pendientes** del el plan de pruebas del cambio (ej. TP de despliegue): ejecutarlas o listarlas para el usuario.

## Resultado (en el chat)
```markdown
# Verificación post-despliegue — <entorno> — OK | CON OBSERVACIONES | FALLIDA
| Verificación | Resultado | Evidencia |
## Problemas (síntoma, evidencia, causa probable)
## Recomendación: continuar | corregir con /sdd-fix | rollback (comando propuesto, NO ejecutado)
```
- Rollback y cualquier acción sobre el entorno = decisión crítica: solo proponer el comando.
- Si aprendiste algo durable (ej. claves requeridas por entorno), ofrece al usuario guardarlo en la memoria; no lo guardes sin que lo pida.
