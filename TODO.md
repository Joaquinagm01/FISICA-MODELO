# Migración: comparación Airplane → Drone (checklist)

Este documento lista de forma clara y accionable las funcionalidades que tiene la simulación del avión (`airplane.*`) y su estado en la simulación del dron (`drone.*`). Marca los items implementados y los pendientes.

Formato: [status] Nombre - breve nota / función(s) relevantes

## Implementado / Parcial
- [x] Physics helpers (drone) - `drone.calculateLift()`, `drone.calculateDrag()`, `drone.calculateBernoulliDP()` (helpers añadidos)
- [x] Terrain: hills, river, ground texture - `drawHills()`, `drawRiver()`, `drawGroundTexture()`
- [x] Airport structures - `drawAirportStructures()` (runway, tower, hangar, terminal, fuel)
- [x] Vegetation (trees) - `drawTrees()`, `drawStaticTree()`, `drawAnimatedTree()` (6+ tipos y animación)
- [x] Tutorial modal / educational flow - `tutorialSteps`, `initializeEducationalFeatures()`

## Pendiente (prioridad alta)
- [ ] QA: balance push()/pop() - Auditar y corregir llamadas `push()`/`pop()` para eliminar warnings de p5; (alta prioridad)

## Pendiente (prioridad media)
- [ ] Flow particles and trails - portear `flowParticles`, `initializeFlowParticles()`, `updateFlowParticles()`, `drawFlowParticles()` desde `airplane.js` (visualización de flujo alrededor del ala)
- [ ] Streamlines / Flow arrows - portear `drawStreamline()` / `drawArrow()` para mostrar direcciones y magnitudes del flujo
- [ ] Bernoulli / Pressure visualizations - `drawBernoulliPressureZones()`, `drawWingAirFlow()`, comparadores top/bottom
- [ ] Enhanced force vectors & labels - vectores con glow, etiquetas con fondo (similar a `airplane.js`)
- [ ] Lighting / shading del dron - usar `sunAngle` para specular/highlight/shadow en `drawDrone()`

## Pendiente (prioridad baja)
- [ ] Chart panels (Chart.js) - gráficos en tiempo real (velocity, altitude, lift, drag)
- [ ] Debug panel (FPS, frameTime, memory, variables) ocultable
- [ ] Experiments panel + presets - panel con presets (takeoff/cruise/stall/landing) que apliquen sliders


---

Notas rápidas:
- Prioridad recomendada: QA push/pop → Flow particles/streamlines → Bernoulli visuals → Instrumentación.
- Mantener cambios no invasivos: funciones nuevas en `drone.js` y llamadas condicionales desde `draw()`.

Si quieres, empiezo por: 1) auditoría push()/pop() ahora; 2) portar `flowParticles`; o 3) crear los Chart panels. Indica la opción.

## Propuestas de mejora para la página de simulación del dron
Estas son mejoras prácticas y de UX/QA que propondría aplicar a toda la página para que la simulación sea más robusta, educativa y accesible.

- UI y controles
	- Añadir controles deslizantes (o inputs) para `rhoBern`, `vTop`, `vBottom` y un toggle para incluir ΔP en la física del dron (experimental).






