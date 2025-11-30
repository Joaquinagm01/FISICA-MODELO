// Simulación de Dron Biomimético con Alas Batientes
let flapFrequency = 5;
let flapAmplitude = 45;
let wingSize = 10; // cm
let sunAngle = 0;
let time = 0;
let wingFlapAngle = 0;
let airDensity = 1.225;
let gravity = 9.81;
let mass = 0.1; // kg (muy ligero como insectos)

// Apply user-requested defaults (will be set again from UI in setup())
const DEFAULTS = {
    flapFrequency: 9.8,
    flapAmplitude: 22,
    wingSize: 10,
    angleOfAttack: 3.7,
    altitude: 6792,
    mass: 10094.1
};

let flapFrequencySlider, flapAmplitudeSlider, wingSizeSlider;
let angleOfAttackInput, altitudeInput, planeMassInput;
let liftDisplay, powerDisplay, currentFreqDisplay, flapAngleDisplay;
let showCloudsCheckbox, showTerrainCheckbox, timeOfDaySlider, timeOfDayValueDisplay;
// Tree defaults (use JS defaults; UI controls removed)
let treeDensitySlider, treeDensityValueDisplay, lowPerformanceCheckbox, lowPerformanceValueDisplay;
let treeDensity = 58; // percent default requested by user
let lowPerformance = false; // default requested by user
let showClouds = true;
let showTerrain = true;

// Cache y throttling para panel Bernoulli (evitar updates DOM por frame)
let _bernoulliCache = {
    lastUpdate: 0,
    rhoEl: null,
    vTopEl: null,
    vBottomEl: null,
    dpEl: null,
    fEl: null,
    velEl: null,
    pressureEl: null,
    newtonEl: null,
    bar: null,
    calcPanel: null
};
const BERN_THROTTLE_MS = 200; // actualizar DOM máximo cada 200 ms
// último resultado de Bernoulli expuesto globalmente
let bernoulliResult = { rho: 1.225, vAbove: 0, vBelow: 0, deltaP: 0, force: 0 };

// Estado visual de vectores (suavizado)
let _visForces = {
    lift: 0,
    weight: 0,
    drag: 0
};

// Cuando true, forzamos visualmente que la sustentación mostrada sea al menos igual al peso
// Esto no cambia cálculos físicos, solo la representación para que el dron 'parezca volar'
const VISUAL_FORCE_OVERRIDE = true;

// Helper lerp suave
function smoothLerp(current, target, factor){
    return current + (target - current) * Math.max(0.05, Math.min(0.25, factor));
}

// Flow visualization defaults (educational overlay)
let flowEnabled = false; // toggle para partículas de flujo
let flowDensity = 40; // porcentaje visual, puede ajustarse con setFlowDensity
let flowSpeedFactor = 1.0; // factor multiplicador de velocidad de partículas

// Minimal stubs: si el proyecto ya define funciones más complejas, estas serán sobrescritas.
function initializeFlowParticles(){
    // lazy init: create a minimal particles array if not present
    if (typeof _flowParticles === 'undefined') window._flowParticles = [];
    // populate a small number proportional to flowDensity
    const target = Math.max(6, Math.floor((flowDensity/100) * 60));
    while (window._flowParticles.length < target) window._flowParticles.push({x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight, vx: 0, vy: 0});
}
function updateFlowParticles(){
    if (!window._flowParticles) return;
    for (let p of window._flowParticles){
        p.vx += (Math.random()-0.5) * 0.2 * flowSpeedFactor;
        p.vy += (Math.random()-0.5) * 0.2 * flowSpeedFactor;
        p.x = (p.x + p.vx + (window.innerWidth)) % (window.innerWidth);
        p.y = (p.y + p.vy + (window.innerHeight)) % (window.innerHeight);
    }
}
function drawFlowParticles(){
    if (!window._flowParticles) return;
    push(); noStroke(); fill(255,255,255,120);
    for (let p of window._flowParticles){ ellipse(p.x % width, p.y % height, 2 + Math.random()*2, 2 + Math.random()*2); }
    pop();
}

// Declaración limpia del tutorial: pasos y textos en español (detallados)
const tutorialSteps = [
    {
        title: 'Bienvenido al Dron Batiente',
        content: `
            <h4>🔰 Introducción</h4>
            <p>Este tutorial explica por qué un dron con <strong>alas batientes</strong> puede generar sustentación: vamos desde los conceptos físicos hasta experimentos prácticos.</p>
            <p>Usa los controles (frecuencia, amplitud, tamaño) y observa el panel de Bernoulli y los vectores en la vista.</p>
        `,
        action: 'intro',
        media: ''
    },
    {
        title: 'Bernoulli y Presión',
        content: `
            <h4>📐 Bernoulli y Presión — El secreto de la sustentación</h4>
            <p>Primero, con <strong>Bernoulli</strong>: imagina que el dron tiene alas que se mueven y que al hacerlo, el aire que pasa por encima de esas alas va más rápido que el aire que pasa por debajo. Cuando el aire va más rápido encima, la presión ahí es más baja, y eso empuja al dron hacia arriba. Es como si el ala “jalara” el aire y, al hacerlo, el dron se eleva.</p>
            <h5>Detalle paso a paso (Bernoulli)</h5>
            <ol>
                <li>Seleccionamos dos puntos: uno sobre la superficie superior del ala y otro bajo la superficie inferior.</li>
                <li>Aplicamos la versión simplificada de Bernoulli (vuelo nivelado): P + ½·ρ·v² = constante.</li>
                <li>Si v encima &gt; v abajo, entonces ½·ρ·v₁² &gt; ½·ρ·v₂² y por conservación P₁ &lt; P₂.</li>
                <li>La diferencia ΔP = P₂ − P₁ = ½·ρ·(v₁² − v₂²) produce una fuerza neta hacia arriba sobre el ala.</li>
            </ol>
            <h5>Ejemplo ilustrativo</h5>
            <p>Con números: ρ = 1.225 kg/m³, v₁ = 80 m/s (sobre), v₂ = 60 m/s (bajo):</p>
            <pre style="background:#222;color:#fff;padding:8px;border-radius:6px;">ΔP = ½·1.225·(60² − 80²) ≈ −1715 Pa</pre>
            <p>El signo indica que la presión es mayor debajo del ala, por tanto hay una fuerza neta hacia arriba.</p>
            <h5>Diagramas rápidos</h5>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <div style="flex:1 1 300px;max-width:320px;background:#fff;padding:8px;border-radius:8px;">
                    <div style="font-weight:700;margin-bottom:6px;font-size:13px;">Velocidades y presión (Bernoulli)</div>
                    <svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" width="100%" style="background:#f6f8fa;border-radius:6px;">
                        <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#0b6efd"/></marker></defs>
                        <path d="M10,80 C80,30 240,30 310,80 L310,100 L10,100 Z" fill="#dbeafe" stroke="#9fb7ff"/>
                        <line x1="30" y1="50" x2="120" y2="20" stroke="#bf360c" stroke-width="3" marker-end="url(#arrow)" />
                        <line x1="60" y1="52" x2="150" y2="22" stroke="#bf360c" stroke-width="3" marker-end="url(#arrow)" />
                        <text x="140" y="14" fill="#bf360c" font-size="11">v₁ (rápido)</text>
                        <line x1="30" y1="90" x2="90" y2="96" stroke="#1b5e20" stroke-width="2" marker-end="url(#arrow)" />
                        <line x1="60" y1="92" x2="120" y2="98" stroke="#1b5e20" stroke-width="2" marker-end="url(#arrow)" />
                        <text x="130" y="102" fill="#1b5e20" font-size="11">v₂ (lento)</text>
                    </svg>
                </div>
            </div>
        `,
        action: 'bernoulli',
        media: ''
    },
    {
        title: 'Acción — Reacción (Newton)',
        content: `
            <h4>🔁 Acción — Reacción (Newton)</h4>
            <p>Piensa que al mover las alas hacia abajo en cada batida, el dron está empujando el aire hacia abajo. Según la Tercera Ley, cuando el dron empuja el aire hacia abajo, el aire empuja al dron hacia arriba. Es un mecanismo complementario a Bernoulli y es especialmente importante en alas batientes o hélices.</p>
            <h5>Detalle paso a paso (Newton)</h5>
            <ol>
                <li>Durante la batida, las alas aceleran una porción de aire hacia abajo (cambian su cantidad de movimiento).</li>
                <li>La tasa de cambio de cantidad de movimiento del aire (masa × velocidad hacia abajo por segundo) requiere una fuerza aplicada por el ala sobre el aire.</li>
                <li>Por reacción, el aire ejerce sobre el ala una fuerza igual y opuesta hacia arriba (F = ṁ · Δv), contribuyendo a la sustentación instantánea.</li>
                <li>En resumen: empujar aire hacia abajo → recibir empuje hacia arriba.</li>
            </ol>
            <h5>Cómo se complementan Bernoulli y Newton</h5>
            <p>No son explicaciones contradictorias: Bernoulli describe cómo la distribución de velocidades y presiones alrededor del ala genera una diferencia de presión promedio; Newton describe cómo la aceleración del aire (cambio de momentum) produce fuerzas instantáneas. En alas batientes ambos efectos son relevantes: la geometría y el flujo producen ΔP, mientras que la batida activa desvía aire y genera reacción directa.</p>
            <h5>Detalle técnico adicional</h5>
            <ul>
                <li>En vuelos subsónicos y con perfil adecuado Bernoulli es una buena aproximación macroscópica.</li>
                <li>En regímenes con separaciones de flujo o batido intenso, la aceleración de masas de aire (Newton) puede dominar las fuerzas instantáneas.</li>
                <li>La sustentación total en un instante es la suma de contribuciones de presión integradas sobre toda el área del ala y de las fuerzas por intercambio de momentum del flujo.</li>
            </ul>
            <p>En la simulación, al variar frecuencia, amplitud y tamaño puedes ver cómo cambian las velocidades estimadas, ΔP y la fuerza aproximada; prueba los presets y observa ambos efectos.</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <div style="flex:1 1 300px;max-width:320px;background:#fff;padding:8px;border-radius:8px;">
                    <div style="font-weight:700;margin-bottom:6px;font-size:13px;">Acción — Reacción (Newton)</div>
                    <svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" width="100%" style="background:#f6f8fa;border-radius:6px;">
                        <defs><marker id="arrow2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#e65100"/></marker></defs>
                        <rect x="110" y="40" width="100" height="12" rx="3" fill="#c7f9d9" stroke="#2e7d32"/>
                        <text x="120" y="36" font-size="11" fill="#2e7d32">Ala</text>
                        <line x1="160" y1="60" x2="160" y2="96" stroke="#0b6efd" stroke-width="3" marker-end="url(#arrow2)" />
                        <text x="168" y="84" font-size="11" fill="#0b6efd">Aire↓</text>
                        <line x1="80" y1="96" x2="80" y2="66" stroke="#e65100" stroke-width="3" marker-end="url(#arrow2)" transform="translate(80,-20) scale(1,-1)" />
                        <text x="86" y="48" font-size="11" fill="#e65100">F↑ sobre ala</text>
                    </svg>
                </div>
            </div>
        `,
        action: 'newton',
        media: ''
    },
    {
        title: 'Anatomía y Movimiento',
        content: `
            <h4>🦋 Anatomía del movimiento</h4>
            <p>Las alas batientes combinan movimiento vertical y rotacional. Tres parámetros clave:</p>
            <ul>
                <li><strong>Frecuencia (Hz):</strong> más ciclos por segundo → más energía transferida.</li>
                <li><strong>Amplitud (°):</strong> mayor amplitud → mayor desplazamiento y velocidad local en los extremos.</li>
                <li><strong>Área (A):</strong> más área → mayor volumen de aire afectado por batida.</li>
            </ul>
            <p>La simulación usa una velocidad efectiva proporcional a frecuencia × amplitud × tamaño para estimar fuerzas.</p>
        `,
        action: 'wing_profile',
        media: ''
    },
    {
        title: 'Fuerzas que actúan',
        content: `
            <h4>⚖️ Balance de fuerzas</h4>
            <p>En vuelo consideramos principalmente:</p>
            <ul>
                <li><strong>Sustentación (L):</strong> fuerza hacia arriba generada por ΔP y aceleración del flujo.</li>
                <li><strong>Peso (W):</strong> masa × gravedad, hacia abajo.</li>
                <li><strong>Arrastre (D):</strong> fuerza que se opone al movimiento relativo.</li>
            </ul>
            <p>Para mantenerse en hover, L debe aproximarse a W. Observa los vectores en la simulación para ver este equilibrio.</p>
        `,
        action: 'forces',
        media: ''
    },
    // 'Parámetros de batida' y la 'Ley práctica' fueron eliminados por petición del usuario.
    {
        title: 'Experimentos rápidos',
        content: `
            <h4>🧪 Presets</h4>
            <p>Prueba los presets incluidos (Hover, Vuelo rápido, Bajo consumo). Observa ΔP, L y los vectores para comparar comportamientos.</p>
        `,
        action: 'experiments',
        media: ''
    }
];

// current step index for tutorial
let currentTutorialStep = 0;

function setup() {
    let canvas = createCanvas(800, 600);
    canvas.parent('canvas-parent');

    flapFrequencySlider = select('#flapFrequency');
    flapAmplitudeSlider = select('#flapAmplitude');
    wingSizeSlider = select('#wingSize');
    angleOfAttackInput = document.getElementById('angleOfAttack');
    altitudeInput = document.getElementById('altitude');
    planeMassInput = document.getElementById('planeMass');
    timeOfDaySlider = select('#timeOfDay');

    flapFrequencySlider.input(updateValues);
    flapAmplitudeSlider.input(updateValues);
    wingSizeSlider.input(updateValues);
    // set initial slider values to requested defaults if UI exists
    if (flapFrequencySlider) flapFrequencySlider.value(DEFAULTS.flapFrequency);
    if (flapAmplitudeSlider) flapAmplitudeSlider.value(DEFAULTS.flapAmplitude);
    if (wingSizeSlider) wingSizeSlider.value(DEFAULTS.wingSize);
    if (angleOfAttackInput) angleOfAttackInput.value = DEFAULTS.angleOfAttack;
    if (altitudeInput) altitudeInput.value = DEFAULTS.altitude;
    if (planeMassInput) planeMassInput.value = DEFAULTS.mass;
    if (angleOfAttackInput) angleOfAttackInput.addEventListener('input', updateValues);
    if (altitudeInput) altitudeInput.addEventListener('input', updateValues);
    if (planeMassInput) planeMassInput.addEventListener('input', updateValues);
    timeOfDaySlider.input(updateValues);

    updateValues();
    initializeEducationalFeatures();
}

function updateValues() {
    flapFrequency = flapFrequencySlider.value();
    flapAmplitude = flapAmplitudeSlider.value();
    wingSize = wingSizeSlider.value();
    // Read new controls
    const aoa = angleOfAttackInput ? Number(angleOfAttackInput.value) : 5;
    const alt = altitudeInput ? Number(altitudeInput.value) : 500;
    const planeMass = planeMassInput ? Number(planeMassInput.value) : mass;
    // Apply mass if user provided
    if (!isNaN(planeMass) && planeMass > 0) mass = planeMass;
    // update displays for new controls if exist
    const aoaEl = document.getElementById('angleOfAttack-value'); if (aoaEl) aoaEl.innerText = aoa.toFixed(1) + '°';
    const altEl = document.getElementById('altitude-value'); if (altEl) altEl.innerText = alt + ' m';
    const massEl = document.getElementById('planeMass-value'); if (massEl) massEl.innerText = mass.toFixed(1) + ' kg';
    // wingAreaInput removed — area se calcula automáticamente desde wingSize
    let timeOfDay = timeOfDaySlider.value();

    select('#flapFrequency-value').html(flapFrequency + ' Hz');
    select('#flapAmplitude-value').html(flapAmplitude + '°');
    select('#wingSize-value').html(wingSize + ' cm');
    if (document.getElementById('timeOfDay-value')) {
        select('#timeOfDay-value').html(nf(timeOfDay, 2, 1));
    }

    // Map time of day (0-24) to sun angle (0 to 2*PI for a full cycle)
    sunAngle = map(timeOfDay, 0, 24, 0, TWO_PI);
}

// p5.js draw loop (principal)
function draw(){
    time += 0.05;
    wingFlapAngle = sin(time * flapFrequency) * flapAmplitude;

    // Dynamic sky color based on sunAngle (0 to 2*PI)
    // This is 1 at PI (noon), 0 at 0/2PI (midnight)
    let noonFactor = (cos(sunAngle - PI) + 1) / 2;
    let skyR = lerp(10, 135, noonFactor);
    let skyG = lerp(20, 206, noonFactor);
    let skyB = lerp(40, 250, noonFactor);
    background(skyR, skyG, skyB);

    push();
    // Update dynamic Bernoulli calculations panel
    updateBernoulliCalculations();
    let lift = calculateDynamicLift();

    // Draw ground
    if (showTerrain) {
        drawTerrainAndLandscape();
    } else {
        fill(34, 139, 34);
        rect(0, height - 50, width, 50);
    }
    // Flow particles (educational) - update/draw
    if (flowEnabled) {
        updateFlowParticles();
        drawFlowParticles();
    }
    
    // Draw drone
    drawDrone();
    
    // Draw flapping wings
    drawFlappingWings();
    
    // Draw force vectors
    drawDroneForceVectors(lift);
    
    // Draw air vortices
    drawAirVortices();
    
    // Draw pressure waves
    drawPressureWaves();

    // Draw sun (glow) and clouds with parallax
    drawSunWithGlow();
    if (showClouds) drawEnhancedClouds();

    // Draw Bernoulli annotation near drone (desactivado por solicitud)
    // drawBernoulliAnnotation();
    pop();
}

function updateBernoulliCalculations(){
    // Compute Bernoulli-related diagnostics from current controls.
    // Use altitude to derive air density (simple barometric approximation) and current flapping parameters to derive representative velocities.
    // Read altitude and angle of attack from controls if available
    const alt = (typeof altitudeInput !== 'undefined' && altitudeInput) ? Number(altitudeInput.value) : 500;
    // simple exponential atmosphere model (scale height ~8000 m)
    const rho0 = 1.225;
    const rho = rho0 * Math.exp(-alt / 8000);
    const aoa = (typeof angleOfAttackInput !== 'undefined' && angleOfAttackInput) ? Number(angleOfAttackInput.value) : 5;

    // instantaneous/flapping-based velocity heuristic
    const flappingAngular = flapFrequency * flapAmplitude * Math.PI / 180; // rad/s approx
    const flappingVelocity = Math.abs(Math.cos(time * flapFrequency * TWO_PI)) * flappingAngular * (wingSize / 100);
    let effectiveVelocity = Math.sqrt((flappingVelocity * flappingVelocity) + 1); // baseline > 1
    // include small effect of angle of attack on effective velocity (visual coupling)
    effectiveVelocity *= (1 + Math.max(-0.2, Math.min(0.2, aoa * 0.01)));

    // scale to m/s for visualization: scale increases with wingSize, frequency and amplitude
    const scaleFactor = 12 * (wingSize / 10) * (flapFrequency / 5) * (flapAmplitude / 45);
    const baseSpeed = effectiveVelocity * Math.max(0.1, scaleFactor);

    // Calibración para que valores por defecto den magnitudes conocidas
    const ref = { f: 5, a: 45, w: 10, vAbove: 24.3, vBelow: 8.3 };
    const angularRef = ref.f * ref.a * Math.PI / 180;
    const flVref = 1 * angularRef * (ref.w / 100);
    const effRef = Math.sqrt(flVref * flVref + 1);
    const scaleRef = 12 * (ref.w / 10) * (ref.f / 5) * (ref.a / 45);
    const baseRef = effRef * Math.max(0.1, scaleRef);
    const aFactor = (baseRef > 0) ? (ref.vAbove / baseRef) : 1.3;
    const bFactor = (baseRef > 0) ? (ref.vBelow / baseRef) : 0.7;

    // modify factors slightly with angle of attack: larger aoa tends to increase effective top speed difference
    const aoaFactor = 1 + (aoa * 0.01);
    const vAbove = baseSpeed * aFactor * aoaFactor; // velocidad sobre el ala (calibrada)
    const vBelow = baseSpeed * bFactor * Math.max(0.6, 1 - aoa * 0.005); // velocidad bajo el ala (calibrada)

    // ΔP = ½ ρ (v_bajo² − v_sobre²) (P2 - P1)
    const deltaPcalc = 0.5 * rho * (vBelow * vBelow - vAbove * vAbove);

    // approximate wing area (m²) using same heuristic as lift function
    let wingArea = (wingSize / 100) * (wingSize / 100) * 0.7;
    const bernForceCalc = deltaPcalc * wingArea; // N

    // expose result for other systems (vectors)
    bernoulliResult = { rho, vAbove, vBelow, deltaP: deltaPcalc, force: bernForceCalc };

    // Lazy cache DOM elements
    if (!_bernoulliCache.rhoEl) {
        _bernoulliCache.rhoEl = document.getElementById('rho-display');
        _bernoulliCache.vTopEl = document.getElementById('vtop-display');
        _bernoulliCache.vBottomEl = document.getElementById('vbottom-display');
        _bernoulliCache.dpEl = document.getElementById('deltaP-display');
        _bernoulliCache.fEl = document.getElementById('bernForce-display');
        _bernoulliCache.velEl = document.getElementById('velocity-formula');
        _bernoulliCache.pressureEl = document.getElementById('pressure-formula');
        _bernoulliCache.newtonEl = document.getElementById('newton-formula');
        _bernoulliCache.bar = document.getElementById('pressure-bar');
        _bernoulliCache.calcPanel = (typeof select === 'function') ? select('#bernoulli-calculations') : null;
    }

    const now = Date.now();
    if (now - _bernoulliCache.lastUpdate < BERN_THROTTLE_MS) {
        // only update cache values (fast) but avoid DOM writes
        _bernoulliCache._lastValues = { rho, vAbove, vBelow, deltaPcalc, bernForceCalc };
        return;
    }

    // Write DOM once per throttle interval
    if (_bernoulliCache.rhoEl) _bernoulliCache.rhoEl.innerText = rho.toFixed(3) + ' kg/m³';
    if (_bernoulliCache.vTopEl) _bernoulliCache.vTopEl.innerText = vAbove.toFixed(1) + ' m/s';
    if (_bernoulliCache.vBottomEl) _bernoulliCache.vBottomEl.innerText = vBelow.toFixed(1) + ' m/s';
    if (_bernoulliCache.dpEl) _bernoulliCache.dpEl.innerText = deltaPcalc.toFixed(1) + ' Pa';
    if (_bernoulliCache.fEl) _bernoulliCache.fEl.innerText = bernForceCalc.toFixed(2) + ' N';
    if (_bernoulliCache.velEl) _bernoulliCache.velEl.innerHTML = `<strong>Velocidades:</strong> v₁ = <span style="color:#bf360c">${vAbove.toFixed(1)} m/s</span> (sobre el ala), v₂ = <span style="color:#1b5e20">${vBelow.toFixed(1)} m/s</span> (bajo el ala)`;
    if (_bernoulliCache.pressureEl) _bernoulliCache.pressureEl.innerHTML = `<strong>ΔP =</strong> ½ × <em>${rho.toFixed(3)}</em> × (v₂² − v₁²) = <span style="color:#4a148c">${deltaPcalc.toFixed(1)} Pa</span>`;
    if (_bernoulliCache.newtonEl) _bernoulliCache.newtonEl.innerHTML = `<strong>F↑ =</strong> <span style="color:#e65100">${bernForceCalc.toFixed(2)} N</span> (estimada)`;
    if (_bernoulliCache.bar) {
        const p = constrain(Math.abs(deltaPcalc), 0, 5000);
        const pct = Math.round((p / 5000) * 100);
        _bernoulliCache.bar.style.width = pct + '%';
    }
    if (_bernoulliCache.calcPanel && _bernoulliCache.calcPanel.show) { try { _bernoulliCache.calcPanel.show(); } catch(e){} }

    _bernoulliCache.lastUpdate = now;
}

// Expose simple setters for flow controls (can be wired to UI later)
window.setFlowDensity = function(percent){ flowDensity = constrain(Number(percent), 0, 100); initializeFlowParticles(); };
window.setFlowSpeedFactor = function(factor){ flowSpeedFactor = Number(factor); };
window.toggleFlow = function(on){ flowEnabled = !!on; if (flowEnabled) initializeFlowParticles(); };

function drawBernoulliAnnotation(){
    push();
    translate(width/2, height/2 - 120);
    noStroke();
    fill(255, 255, 255, 200);
    rect(-90, -60, 180, 60, 6);
    fill(0);
    textSize(12);
    textAlign(LEFT, TOP);
    const dpStr = (typeof deltaP === 'number') ? deltaP.toFixed(1) + ' Pa' : '—';
    const fStr = (typeof bernoulliForce === 'number') ? bernoulliForce.toFixed(1) + ' N' : '—';
    text('ΔP: ' + dpStr, -85, -55);
    text('F: ' + fStr, -85, -35);
    pop();
}

// Sun with glow influenced by timeOfDay
function drawSunWithGlow(){
    push();
    const cx = width * 0.1 + map(cos(sunAngle), -1, 1, 0, width * 0.8);
    const cy = height * 0.15 + map(-sin(sunAngle), -1, 1, -height*0.05, height*0.05);
    const sunSize = 60;
    let sunHue = lerpColor(color(255, 240, 200), color(255, 200, 140), map(abs(sunAngle), 0, PI/2, 0, 1));
    // Glow rings
    noStroke();
    for (let i = 6; i > 0; i--){
        let a = map(i, 6, 0, 20, 180);
        fill(red(sunHue), green(sunHue), blue(sunHue), a);
        ellipse(cx, cy, sunSize * (1 + i*0.6), sunSize * (1 + i*0.6));
    }
    // Core
    fill(255, 250, 200);
    ellipse(cx, cy, sunSize, sunSize);
    pop();
}

// Phase 2 visuals: clouds and terrain (non-invasive)
function drawEnhancedClouds(){
    // Layered parallax clouds
    push();
    noStroke();
    const layers = [0.2, 0.5, 1.0]; // parallax factors
    for (let L = 0; L < layers.length; L++){
        const speed = 0.02 * layers[L];
        const yBase = 60 + L * 40;
        for (let i = -1; i < 6; i++){
            let x = (i * 220 + (time * 60 * speed)) % (width + 300) - 150;
            let y = yBase + sin((i + time*0.01) * 0.6) * 8;
            let s = 80 + L * 60;
            let alpha = map(L, 0, layers.length-1, 180, 100);
            fill(255, 255, 255, alpha);
            ellipse(x, y, s*1.4, s*0.8);
            ellipse(x + 40, y - 10, s, s*0.6);
            ellipse(x - 40, y - 6, s*0.9, s*0.5);
        }
    }
    pop();
}

function drawTerrainAndLandscape(){
    // Modular terrain: delegate to specific drawing functions
    push();
    noStroke();
    let groundY = height - 60;

    drawHills(groundY);
    drawRiver(groundY);
    drawGroundTexture(groundY);
    drawAirportStructures(groundY);
    // Vegetation layer (density/performance aware)
    drawTrees(groundY);

    pop();
}

// Draw layered hills with subtle motion and optional snow caps
function drawHills(groundY){
    push();
    noStroke();
    // Back hill layer
    fill(50, 120, 50);
    for (let x = -200; x < width + 200; x += 160){
        let h = 80 + 40 * sin((x * 0.008) + time*0.001);
        ellipse(x + 40, groundY + 10, 400, h);
    }

    // Mid hill layer
    fill(34, 139, 34);
    for (let x = -200; x < width + 200; x += 120){
        let h = 60 + 30 * sin((x * 0.01) + time*0.002);
        ellipse(x + 60, groundY + 30, 300, h);
    }

    // Distant mountains with snow caps
    fill(60, 180, 60, 150);
    for (let x = 300; x < width + 600; x += 400){
        let mh = 120 + 30 * sin((x * 0.005) + time*0.0005);
        ellipse(x, groundY - 10, 600, mh);
        // snow cap
        fill(255,255,255,200);
        ellipse(x - 30, groundY - mh/2 - 10, 120, 30);
        fill(60, 180, 60, 150);
    }
    pop();
}

// Draw a winding river with reflections and simple animation
function drawRiver(groundY){
    push();
    noStroke();
    fill(30, 144, 255, 200);
    beginShape();
    vertex(0, groundY + 80);
    bezierVertex(width*0.2, groundY + 30 + sin(time*0.002)*20, width*0.6, groundY + 140 + cos(time*0.001)*20, width, groundY + 80);
    vertex(width, height);
    vertex(0, height);
    endShape(CLOSE);

    // Reflections: light bands moving
    stroke(100,200,255,120);
    strokeWeight(6);
    noFill();
    beginShape();
    for (let x = -50; x < width + 50; x += 8){
        let y = groundY + 80 + sin(x * 0.01 + time * 0.5) * 6;
        vertex(x, y);
    }
    endShape();
    noStroke();
    pop();
}

// Ground texture: grass strips, rocks and small variations
function drawGroundTexture(groundY){
    push();
    // Foreground grass
    fill(30, 110, 30);
    rect(0, groundY + 40, width, height - (groundY + 40));

    // Grass strokes
    stroke(25, 120, 25, 140);
    strokeWeight(1);
    for (let i = 0; i < 120; i++){
        let x = (i * 37) % width;
        let y = groundY + 50 + (i%7);
        line(x, y, x + random(-2,2), y - random(4,10));
    }
    noStroke();

    // Rocks
    for (let i = 0; i < 30; i++){
        let x = (i * 73) % width;
        let y = groundY + 60 + (i%5);
        fill(80,60,40,200);
        ellipse(x, y, random(4,10), random(3,7));
    }
    pop();
}

// Airport structures: runway, tower, hangar, terminal, fuel tanks
function drawAirportStructures(groundY){
    push();
    // Runway
    fill(80,80,80);
    stroke(100,100,100);
    strokeWeight(2);
    rect(width/2 - 150, groundY - 10, 300, 20);

    // Runway center dashed line
    stroke(255);
    strokeWeight(3);
    for (let x = width/2 - 140; x < width/2 + 140; x += 20) {
        line(x, groundY, x + 10, groundY);
    }

    // Threshold markings
    noStroke();
    fill(255);
    rect(width/2 - 150, groundY - 8, 5, 16);
    rect(width/2 + 145, groundY - 8, 5, 16);

    // Control tower
    let towerX = width/2 + 200;
    let towerY = groundY - 60;
    fill(150,150,150);
    stroke(100);
    rect(towerX - 8, towerY, 16, 60);
    fill(200,200,200);
    rect(towerX - 12, towerY - 15, 24, 15);
    noStroke();
    fill(100,150,200,150);
    rect(towerX - 10, towerY - 12, 6, 8);
    rect(towerX + 4, towerY - 12, 6, 8);

    // Hangar
    let hangarX = width/2 - 250;
    let hangarY = groundY - 40;
    fill(120,120,120);
    stroke(80);
    rect(hangarX, hangarY, 80, 40);
    fill(100);
    triangle(hangarX, hangarY, hangarX + 40, hangarY - 20, hangarX + 80, hangarY);
    noStroke();
    fill(60,60,60);
    rect(hangarX + 30, hangarY + 10, 20, 25);

    // Terminal
    let terminalX = width/2 + 80;
    let terminalY = groundY - 25;
    stroke(120);
    fill(180);
    rect(terminalX, terminalY, 60, 25);
    fill(140);
    triangle(terminalX, terminalY, terminalX + 30, terminalY - 15, terminalX + 60, terminalY);
    noStroke();
    fill(100,150,200,150);
    for (let i = 0; i < 3; i++) rect(terminalX + 5 + i * 18, terminalY + 5, 12, 8);

    // Fuel tanks
    let fuelX = width/2 - 320;
    let fuelY = groundY - 15;
    fill(200);
    stroke(150);
    ellipse(fuelX, fuelY, 20, 15);
    rect(fuelX - 10, fuelY, 20, 10);
    ellipse(fuelX + 30, fuelY, 20, 15);
    rect(fuelX + 20, fuelY, 20, 10);
    noStroke();
    fill(255,0,0);
    textAlign(CENTER);
    textSize(10);
    text('FUEL', fuelX, fuelY - 12);
    text('FUEL', fuelX + 30, fuelY - 12);

    pop();
}

// Draw trees: static and animated varieties
function drawTrees(groundY){
    push();
    // Density and performance-aware drawing
    // Use JS defaults unless runtime variables override
    let density = (typeof treeDensity !== 'undefined') ? treeDensity : 58;
    let lowPerf = (typeof lowPerformance !== 'undefined') ? lowPerformance : false;

    // Base positions along the ground; we'll sample according to density
    let basePositions = [60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780];
    // Determine effective count based on density and performance mode
    let maxCount = basePositions.length;
    let effectiveCount = Math.max(1, Math.floor(maxCount * (density / 100)));
    if (lowPerf) {
        effectiveCount = Math.max(1, Math.floor(effectiveCount * 0.4));
    }

    // Choose positions evenly from basePositions
    for (let i = 0; i < effectiveCount; i++){
        let idx = Math.floor(map(i, 0, effectiveCount, 0, basePositions.length - 1));
        let x = basePositions[idx];
        let typeIndex = i % 6;
        if (i === 2 && !lowPerf) {
            // animated tree example (skip animated in low perf)
            drawAnimatedTree(x, groundY + 5, 'spreading', sin(time * 0.8) * 2, cos(time * 0.6) * 1.5, sin(time * 1.2) * 1.2, i, 65);
        } else {
            drawStaticTree(x, groundY + 5, typeIndex);
        }
    }
    pop();
}

function drawStaticTree(x, groundY, typeIndex){
    push();
    translate(x, groundY);
    noStroke();
    switch(typeIndex){
        case 0:
            // Oak
            fill(101,67,33); rect(-6, -50, 12, 50);
            fill(34,139,34); ellipse(0, -65, 70, 50); break;
        case 1:
            // Pine
            fill(139,69,19); rect(-4, -45, 8, 45);
            fill(0,100,0); triangle(-25, -25, 0, -55, 25, -25); break;
        case 2:
            // Rounded
            fill(101,67,33); rect(-5, -40, 10, 40);
            fill(50,150,50); ellipse(0, -50, 60, 48); break;
        case 3:
            // Tall slender
            fill(139,69,19); rect(-3, -70, 6, 70);
            fill(34,139,34); ellipse(0, -80, 30, 26); break;
        case 4:
            // Bushy
            fill(101,67,33); rect(-4, -35, 8, 35);
            fill(34,139,34); ellipse(0, -40, 55, 40); break;
        case 5:
        default:
            // Spreading
            fill(101,67,33); rect(-8, -60, 16, 60);
            fill(34,139,34); ellipse(0, -70, 80, 60); break;
    }
    pop();
}

function drawAnimatedTree(x, groundY, kind, wind1, wind2, wind3, index, heightParam){
    push();
    translate(x, groundY);
    noStroke();
    // Trunk
    fill(101,67,33); rect(-6, -heightParam, 12, heightParam);
    // Animated canopy - use wind params to offset ellipses
    fill(34,139,34);
    ellipse(wind1 * 3, -heightParam - 20 + wind2 * 2, 80 + wind3 * 6, 60 + wind2 * 4);
    ellipse(-15 + wind2 * 2, -heightParam - 10 + wind1 * 2, 60 + wind1 * 4, 45 + wind3 * 3);
    pop();
}

// Ensure trees are drawn as part of terrain
// Insert call inside drawTerrainAndLandscape previously; if not present, call here
// drawTrees(groundY) is already invoked by drawTerrainAndLandscape

function calculateDynamicLift() {
    // Dynamic lift from flapping: L = 0.5 * ρ * v² * A * Cl * (flapping factor)
    let wingArea = (wingSize / 100) * (wingSize / 100) * 0.7; // Approximate wing area
    let flappingVelocity = abs(cos(time * flapFrequency * TWO_PI)) * flapFrequency * flapAmplitude * PI / 180 * wingSize / 100;
    let effectiveVelocity = sqrt(flappingVelocity * flappingVelocity + 1); // Minimum velocity
    let cl = 1.5 + 0.5 * sin(time * flapFrequency * TWO_PI); // Dynamic CL
    let lift = 0.5 * airDensity * effectiveVelocity * effectiveVelocity * wingArea * cl;
    return lift;
}

function calculatePowerConsumption() {
    // Power = force * velocity (simplified)
    let lift = calculateDynamicLift();
    let flappingVelocity = flapFrequency * flapAmplitude * PI / 180 * wingSize / 100;
    let power = lift * flappingVelocity;
    return power;
}

function drawDrone() {
    push();
    translate(width/2, height/2 - 50);
    
    // Body
    fill(100, 100, 100);
    ellipse(0, 0, 20, 10);
    
    // Sensors/antennas
    stroke(255, 0, 0);
    strokeWeight(2);
    line(-10, -5, -15, -10);
    line(10, -5, 15, -10);
    
    pop();
}

function drawFlappingWings() {
    push();
    translate(width/2, height/2 - 50);
    
    // Left wing
    push();
    rotate(wingFlapAngle * PI / 180);
    fill(150, 200, 255, 200);
    stroke(100, 150, 200);
    strokeWeight(2);
    ellipse(-15, 0, wingSize * 2, wingSize * 0.7);
    // Wing veins
    stroke(100, 150, 200, 150);
    line(-15 - wingSize, 0, -15 + wingSize, 0);
    line(-15, 0 - wingSize * 0.35, -15, 0 + wingSize * 0.35);
    pop();
    
    // Right wing
    push();
    rotate(-wingFlapAngle * PI / 180);
    fill(150, 200, 255, 200);
    stroke(100, 150, 200);
    strokeWeight(2);
    ellipse(15, 0, wingSize * 2, wingSize * 0.7);
    // Wing veins
    stroke(100, 150, 200, 150);
    line(15 - wingSize, 0, 15 + wingSize, 0);
    line(15, 0 - wingSize * 0.35, 15, 0 + wingSize * 0.35);
    pop();
    
    pop();
}

function drawDroneForceVectors(lift) {
    push();
    translate(width/2, height/2 - 50);

    // Objetivos físicos (recalcular cada frame)
    const targetLift = lift; // N (ya calculado por calculateDynamicLift)
    const targetWeight = mass * gravity; // N
    const wingArea = (wingSize / 100) * (wingSize / 100) * 0.7;
    const flappingVelocity = flapFrequency * flapAmplitude * PI / 180 * wingSize / 100;
    const Cd = 0.3;
    const targetDrag = 0.5 * airDensity * flappingVelocity * flappingVelocity * wingArea * Cd;

    // Combine dynamic lift with Bernoulli-estimated force to show total effective lift
    const bernForce = (bernoulliResult && bernoulliResult.force) ? bernoulliResult.force : 0;
    const combinedLift = targetLift + bernForce; // N

    // Suavizar valores visuales
    _visForces.lift = smoothLerp(_visForces.lift, combinedLift, 0.12);
    // Visual clamp: evitar que la representación gráfica de la sustentación apunte hacia abajo
    const visualLift = Math.max(0, _visForces.lift);
    _visForces.weight = smoothLerp(_visForces.weight, targetWeight, 0.12);
    _visForces.drag = smoothLerp(_visForces.drag, targetDrag, 0.12);

    // Visual scaling: map forces to screen pixels relative to the largest magnitude so none disappear
    // si activado, forzamos visualmente que la sustentación sea al menos el peso
    const targetWeightVal = _visForces.weight;
    let visualLiftVal = visualLift;
    if (VISUAL_FORCE_OVERRIDE) {
        visualLiftVal = Math.max(visualLift, targetWeightVal);
    }
    const absLift = Math.abs(visualLiftVal);
    const absWeight = Math.abs(_visForces.weight);
    const absDrag = Math.abs(_visForces.drag);
    const maxForce = Math.max(absLift, absWeight, absDrag, 1.0);
    // pixels per Newton chosen so the largest force uses up to ~100px (clamped)
    const pixelsPerN = Math.min(200, Math.max(6, 100 / maxForce));

    const liftPixels = -visualLiftVal * pixelsPerN; // negative => up on canvas; visualLiftVal may be overridden
    const weightPixels = _visForces.weight * pixelsPerN; // positive => down
    const dragPixels = _visForces.drag * pixelsPerN; // positive => right

    // ensure small non-zero vectors remain visible
    function ensureVisible(p){ if (p === 0) return 0; return (Math.abs(p) < 6) ? (p < 0 ? -6 : 6) : p; }
    const liftP = ensureVisible(liftPixels);
    const weightP = ensureVisible(weightPixels);
    const dragP = ensureVisible(dragPixels);

    // Draw lift arrow (up) - fixed visual length for clarity
    const FIXED_LIFT_PIXELS = -80; // always 80px upward
    stroke(0, 200, 0);
    strokeWeight(3);
    line(0, 0, 0, FIXED_LIFT_PIXELS);
    // arrowhead
    noStroke();
    fill(0,200,0);
    push();
    translate(0, liftP);
    triangle(-6, 8, 6, 8, 0, -6);
    pop();
    // numeric label above arrow (avoid overlap) with background for legibilidad
    const labelPad = 6;
    // Improve lift label visibility: larger bold text, shadow and stronger background
    let liftLabel = 'SUSTENTACIÓN (L): ' + _visForces.lift.toFixed(2) + ' N';
    textSize(14);
    textStyle(BOLD);
    const liftLabelW = Math.max(110, textWidth(liftLabel) + labelPad * 2);
    const liftLabelH = 22;
    // background box (larger and more opaque)
    noStroke();
    fill(0, 0, 0, 200);
    rect(6, FIXED_LIFT_PIXELS - 8 - liftLabelH, liftLabelW, liftLabelH, 6);
    // drop shadow for text
    fill(0, 0, 0, 160);
    textAlign(LEFT, TOP);
    text(liftLabel, 9, FIXED_LIFT_PIXELS - 8 - liftLabelH + 3);
    // main text (bright green)
    fill(140, 255, 160);
    text(liftLabel, 8, FIXED_LIFT_PIXELS - 8 - liftLabelH + 2);
    // reset style
    textStyle(NORMAL);

    // Draw weight arrow (down) - fixed visual length for clarity
    const FIXED_WEIGHT_PIXELS = 80; // always 80px downward
    stroke(0, 0, 200);
    strokeWeight(3);
    line(0, 0, 0, FIXED_WEIGHT_PIXELS);
    noStroke();
    fill(0,0,200);
    push();
    translate(0, weightP);
    triangle(-6, -8, 6, -8, 0, 6);
    pop();
    // Peso label with background
    const weightLabel = 'Peso (W): ' + _visForces.weight.toFixed(2) + ' N';
    textSize(12);
    const weightLabelW = Math.max(60, textWidth(weightLabel) + labelPad * 2);
    const weightLabelH = 18;
    noStroke();
    fill(0,0,0,150);
    rect(8, FIXED_WEIGHT_PIXELS + 8, weightLabelW, weightLabelH, 6);
    fill(160, 200, 255);
    textAlign(LEFT, TOP);
    text(weightLabel, 10, FIXED_WEIGHT_PIXELS + 8 + 2);

    // Draw drag arrow (right)
    stroke(200, 80, 0);
    strokeWeight(3);
    line(0, 0, dragP, 0);
    noStroke();
    fill(200,80,0);
    push();
    translate(dragP, 0);
    triangle(-8, -6, -8, 6, 8, 0);
    pop();
    fill(200,80,0);
    textAlign(LEFT, CENTER);
    text('Arrastre (D): ' + _visForces.drag.toFixed(2) + ' N', dragP + 8, 0);

    pop();
}

function drawAirVortices() {
    push();
    translate(width/2, height/2 - 50);
    
    // Draw vortices created by wing flapping
    for (let i = 0; i < 5; i++) {
        let angle = (time * flapFrequency * TWO_PI + i * PI/3) % TWO_PI;
        let radius = 20 + i * 10;
        let x = cos(angle) * radius;
        let y = sin(angle) * radius;
        
        noFill();
        stroke(255, 255, 255, 100 - i * 20);
        strokeWeight(2);
        ellipse(x, y, 15 - i * 2, 15 - i * 2);
    }
    
    pop();
}

function drawPressureWaves() {
    push();
    translate(width/2, height/2 - 50);
    
    // Draw pressure waves emanating from wings
    stroke(255, 100, 100, 150);
    strokeWeight(1);
    noFill();
    
    for (let wave = 1; wave <= 3; wave++) {
        let radius = wave * 30 + (time * 50) % 30;
        ellipse(0, 0, radius * 2, radius * 2);
    }
    
    pop();
}

// ===== Tutorial helpers appended =====
function initializeEducationalFeatures(){
    // New modal control using modern UI (class toggles) and keyboard accessibility
    const tPrev = document.getElementById('tutorialPrev');
    const tNext = document.getElementById('tutorialNext');
    const tClose = document.getElementById('tutorialClose');
    const tModal = document.getElementById('tutorialModal');
    const tContent = document.getElementById('tutorialContent');
    const tTitle = document.getElementById('tutorialTitle');
    const tIndicator = document.getElementById('tutorialIndicator');
    const tProgressBar = document.getElementById('tutorialProgressBar');

    // Track state
    window.__tutorial_open = false;

    function renderTutorialStep(index){
        const step = tutorialSteps[index] || { title: '', content: '' };
        if (tTitle) tTitle.innerHTML = step.title;
        if (tContent) tContent.innerHTML = step.content;
        if (tIndicator) tIndicator.innerText = `Paso ${index+1} de ${tutorialSteps.length}`;
        if (tNext) tNext.innerText = index < tutorialSteps.length - 1 ? 'Siguiente →' : 'Finalizar';
        if (tPrev) tPrev.style.display = index > 0 ? 'inline-flex' : 'none';

        // Progress bar width
        if (tProgressBar) {
            const pct = Math.round(((index+1) / tutorialSteps.length) * 100);
            tProgressBar.style.width = pct + '%';
        }

        // Inject media if available
        try {
            const mediaEl = document.getElementById('tutorialMedia');
            if (mediaEl) {
                if (step.media) {
                    // if data URL or img path, use an <img>
                    if (typeof step.media === 'string' && (step.media.indexOf('<svg') === -1)) {
                        mediaEl.innerHTML = '<img src="' + step.media + '" style="max-width:100%;height:auto;display:block;" alt="Ilustración tutorial">';
                    } else if (typeof step.media === 'string') {
                        // svg data or inline svg string
                        if (step.media.trim().startsWith('<svg')) {
                            mediaEl.innerHTML = step.media;
                        } else {
                            mediaEl.innerHTML = '<img src="' + step.media + '" style="max-width:100%;height:auto;display:block;" alt="Ilustración tutorial">';
                        }
                    } else {
                        mediaEl.innerHTML = '';
                    }
                } else {
                    mediaEl.innerHTML = '';
                }
            }
        } catch(e){ /* ignore media errors */ }

        performTutorialAction(tutorialSteps[index] && tutorialSteps[index].action);
    }

    function openTutorialModal(){
        if (!tModal) return;
        currentTutorialStep = 0;
        renderTutorialStep(currentTutorialStep);
        tModal.classList.add('open');
        tModal.setAttribute('data-open','true');
        window.__tutorial_open = true;
        // focus first actionable button for keyboard users
    // store previously focused element
    window.__tutorial_prev_focus = document.activeElement;
    setTimeout(()=>{ if (tNext) tNext.focus(); }, 120);
    // mark main content as inert (simple approach)
    try { document.querySelector('body').style.overflow = 'hidden'; } catch(e){}
        // trap focus via keydown listener
        document.addEventListener('keydown', tutorialKeyHandler);
    }

    function closeTutorialModal(){
        if (!tModal) return;
        tModal.classList.remove('open');
        tModal.setAttribute('data-open','false');
        window.__tutorial_open = false;
        document.removeEventListener('keydown', tutorialKeyHandler);
        // restore focus to previous element if possible
        try { document.querySelector('body').style.overflow = ''; } catch(e){}
        if (window.__tutorial_prev_focus && typeof window.__tutorial_prev_focus.focus === 'function') {
            window.__tutorial_prev_focus.focus();
        } else {
            const openBtn = document.getElementById('openTutorial'); if (openBtn) openBtn.focus();
        }
    }

    function tutorialKeyHandler(e){
        if (!window.__tutorial_open) return;
        if (e.key === 'Escape') { closeTutorialModal(); }
        else if (e.key === 'ArrowLeft') { currentTutorialStep = Math.max(0, currentTutorialStep - 1); renderTutorialStep(currentTutorialStep); }
        else if (e.key === 'ArrowRight') {
            if (currentTutorialStep < tutorialSteps.length - 1) { currentTutorialStep++; renderTutorialStep(currentTutorialStep); }
            else { closeTutorialModal(); showTutorialCompletionMessage(); }
        }
    }

    if (tPrev) tPrev.addEventListener('click', ()=>{ currentTutorialStep = Math.max(0, currentTutorialStep - 1); renderTutorialStep(currentTutorialStep); });
    if (tNext) tNext.addEventListener('click', ()=>{
        if (currentTutorialStep < tutorialSteps.length - 1) { currentTutorialStep = Math.min(tutorialSteps.length - 1, currentTutorialStep + 1); renderTutorialStep(currentTutorialStep); }
        else { closeTutorialModal(); showTutorialCompletionMessage(); }
    });
    if (tClose) tClose.addEventListener('click', ()=>{ closeTutorialModal(); });

    // Clicking backdrop closes modal (but not clicks inside panel)
    if (tModal) {
        tModal.addEventListener('click', (ev)=>{
            if (ev.target === tModal) { closeTutorialModal(); }
        });
    }

    // Bind the top-level "Abrir Tutorial" button if present
    try {
        const openBtnElement = document.getElementById('openTutorial');
        if (openBtnElement) openBtnElement.addEventListener('click', openTutorialModal);
    } catch(e) { /* ignore */ }

    // Expose opener
    window.openTutorial = function(){ openTutorialModal(); };
}

function performTutorialAction(action){
    try {
        switch(action){
            case 'bernoulli':
                const panel = select('#bernoulli-calculations'); if (panel) { panel.style('border','2px solid #4a148c'); setTimeout(()=>{ if (panel) panel.style('border','1px solid #eee'); },900); }
                break;
            case 'wing_profile':
                if (wingSizeSlider) { wingSizeSlider.value(14); }
                if (flapAmplitudeSlider) { flapAmplitudeSlider.value(55); }
                updateValues();
                break;
            case 'velocity_lift':
                if (flapFrequencySlider) flapFrequencySlider.value(8);
                if (flapAmplitudeSlider) flapAmplitudeSlider.value(60);
                updateValues();
                break;
            case 'experiments':
                if (flapFrequencySlider) flapFrequencySlider.value(7);
                if (flapAmplitudeSlider) flapAmplitudeSlider.value(50);
                if (wingSizeSlider) wingSizeSlider.value(11);
                updateValues();
                break;
            default:
                break;
        }
    } catch(e){ /* silent */ }
}

function showTutorialCompletionMessage(){
    const overlay = select('#presentationContent');
    if (!overlay) return;
    overlay.html('<h3>🎉 Tutorial completado</h3><p>Explora los controles libremente. Usa <code>openPresentation()</code> para ver la ficha resumen.</p>');
}
