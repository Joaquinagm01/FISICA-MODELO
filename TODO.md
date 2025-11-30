
# Migración: llevar funcionalidades del Avión al Dron

Objetivo: implementar en la simulación del dron todas las mejoras visuales, educativas y de instrumentación que tiene la simulación del avión, sin romper la lógica original del dron (todo debe ser aditivo y namespaced cuando aplique).

Instrucciones: iremos tarea por tarea. Marcaré cada paso como "in-progress" cuando lo empiece y "completed" al terminar. Si algo no puede hacerse de forma segura, lo marcaré como "blocked" con la razón.

Phase 0 — Preparación
- [ ] 0.1 - Hacer backup rápido de `drone.js` y `drone.html` (crear `drone.js.bak` y `drone.html.bak`).
- [ ] 0.2 - Asegurar que `drone.html` incluye p5.js y que `drone.js` tiene `setup()`/`draw()` funcionando (smoke test).

Phase 1 — Física y Cálculos (no invasivo)
- [ ] 1.1 - Crear namespace `drone` en `drone.js` con helpers: `calculateLift()`, `calculateDrag()`, `calculateWeight()`, `calculateLiftCoefficient()`.
- [ ] 1.2 - Añadir funciones auxiliares para Bernoulli / velocidades relativas si aplica.
- [ ] 1.3 - Integrar estos helpers en paneles y experimentos sin reemplazar funciones de la simulación actual (usar solo para visualización y nuevos paneles).

Phase 2 — Visuales y Escenario
- [ ] 2.1 - Portar `drawEnhancedClouds()` del avión a `drone.js` como función separada y llamarla desde `draw()` de forma condicional.
- [ ] 2.2 - Portar `drawTerrainAndLandscape()` y sub-funciones (hills/river/airport structures) en su propio bloque.
- [ ] 2.3 - Añadir opciones de rendimiento: toggles para desactivar nubes/terreno si GPU es limitada.
- [ ] 2.4 - Implementar efectos de iluminación suaves (sunAngle/timeOfDay) reutilizando cálculos existentes.

Phase 3 — Modelo de Dron y Fuerzas
- [ ] 3.1 - Mejorar `drawDrone()` (o añadir `drawCompleteDroneWithLighting()`) con iluminación y propulsores borrosos, encapsulado para no romper el código original.
- [ ] 3.2 - Mejorar `drawDroneForceVectors()` con estilos nuevos (glow, etiquetas con fondo) y asegurar balance push/pop.

Phase 4 — Educativo y UI
- [ ] 4.1 - Migrar modal de tutorial del avión a `drone.html` y adaptar contenido al dron.
- [ ] 4.2 - Implementar navegación (prev/siguiente) y los `tutorialSteps` específicos del dron.
- [ ] 4.3 - Migrar panel de experimentos y adaptarlos a escenarios drone (hover, forward, low_battery).
- [ ] 4.4 - Integrar panel de visualización de datos con `Chart.js` y actualizaciones periódicas (configurable cada N frames).

Phase 5 — Instrumentación, QA y Accesibilidad
- [ ] 5.1 - Revisar y balancear todas las llamadas `push()`/`pop()` en `drone.js`.
- [ ] 5.2 - Añadir panel de debug (FPS, frameTime, valores clave) opcional.
- [ ] 5.3 - Añadir atributos ARIA y comprobaciones de contraste / tamaños de texto.

Phase 6 — Verificación final y documentación
- [ ] 6.1 - Pruebas manuales en Chrome/Firefox (abrir `drone.html`, verificar consola y comportamiento).
- [ ] 6.2 - Documentar pasos de despliegue e incluir notas sobre performance (en README.md o `TODO.md`).

Notas de implementación
- Hacer cambios pequeños y verificables. Evitar reemplazar funciones críticas del dron: en su lugar encapsular mejoras en nuevas funciones y llamarlas condicionalmente.
- Si se necesitan nuevas dependencias, avisaré y propondré cómo añadirlas (`package.json` o CDN). Preferir CDN para Chart.js y p5.js.

Prioridad inmediata (qué haré ahora)
1) Crear backups y comprobar `setup()`/`draw()` (smoke test). 2) Implementar namespace `drone` con helpers físicos (1.1) como cambio seguro y visible.

