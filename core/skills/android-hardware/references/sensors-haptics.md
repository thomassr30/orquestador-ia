# Sensores y hápticos (Android)

## Sensores
- `SensorManager.getDefaultSensor(Sensor.TYPE_…)` puede ser nulo: comprobar.
- Prefiere sensores compuestos (`TYPE_ROTATION_VECTOR`, `TYPE_GAME_ROTATION_VECTOR`, `TYPE_LINEAR_ACCELERATION`) sobre crudos.
- Registrar con la frecuencia mínima (`SENSOR_DELAY_UI`/`NORMAL`) en `callbackFlow`; desregistrar en `awaitClose`.
- Android 12+: tasas altas requieren `HIGH_SAMPLING_RATE_SENSORS`.
- Podómetro/actividad: `TYPE_STEP_COUNTER` (permiso `ACTIVITY_RECOGNITION` en runtime) o Activity Recognition API / Health Connect según el caso.

## Hápticos
- Preferir feedback de vistas/Compose: `LocalHapticFeedback.current.performHapticFeedback(...)` / `View.performHapticFeedback(HapticFeedbackConstants.CONFIRM | REJECT | CLOCK_TICK | SEGMENT_TICK …)` — respetan la configuración del usuario y no requieren permiso.
- Patrones propios: `VibratorManager.defaultVibrator.vibrate(VibrationEffect.createPredefined(EFFECT_CLICK))` o `VibrationEffect.startComposition()` (verifica soporte con `areAllPrimitivesSupported`); requiere permiso `VIBRATE`.
- Sutiles, ligados a acciones del usuario, nunca continuos.
