// Simulación de Dron Biomimético con Alas Batientes
let flapFrequency = 5;
let flapAmplitude = 45;
let wingSize = 10; // cm
let time = 0;
let wingFlapAngle = 0;
let airDensity = 1.225;
let gravity = 9.81;
let mass = 0.1; // kg (muy ligero como insectos)

let flapFrequencySlider, flapAmplitudeSlider, wingSizeSlider;
let liftDisplay, powerDisplay, currentFreqDisplay, flapAngleDisplay;
let showCloudsCheckbox, showTerrainCheckbox, timeOfDaySlider, timeOfDayValueDisplay;
// Tree defaults (use JS defaults; UI controls removed)
let treeDensitySlider, treeDensityValueDisplay, lowPerformanceCheckbox, lowPerformanceValueDisplay;
let treeDensity = 58; // percent default requested by user
let lowPerformance = false; // default requested by user
let showClouds = true;
let showTerrain = true;
let timeOfDay = 12.0; // noon
let sunAngle = 0;
// Debugging: push/pop balance detector (set true to enable runtime checks)
let DEBUG_BALANCE = true;

// Internal tracking (attached to window when enabled)
function enablePushPopDebug(){
    try {
        if (typeof window === 'undefined') return;
        if (window.__push_pop_debug_enabled) return;
        window.__push_pop_debug_enabled = true;
        window.__pp_depth = 0;
        window.__orig_push = window.push;
        window.__orig_pop = window.pop;
        window.push = function(){
            try { window.__orig_push.apply(this, arguments); } catch(e){ /* ignore */ }
            window.__pp_depth++;
            // small trace in debug mode (comment out next line to reduce noise)
            // console.debug('[PP] push -> depth=', window.__pp_depth);
        };
        window.pop = function(){
            window.__pp_depth--;
            if (window.__pp_depth < 0) {
                console.warn('[PP-DEBUG] pop() called without matching push(); depth', window.__pp_depth);
                // capture a light stack trace
                try { throw new Error('pop without push'); } catch (e) { console.warn(e.stack.split('\n').slice(2,6).join('\n')); }
                window.__pp_depth = 0;
            }
            try { window.__orig_pop.apply(this, arguments); } catch(e){ /* ignore */ }
        };
    } catch(e){ console.warn('enablePushPopDebug failed', e); }
}
// Bernoulli defaults for educational readout
let rhoBern = 1.155; // kg/m^3 (user provided)
let vTop = 24.3; // m/s
let vBottom = 8.3; // m/s

let deltaP = 0;
let bernoulliForce = 0;
// Flow particles (lightweight implementation)
let flowParticles = [];
let flowDensity = 60; // 0-100, percent
let flowSpeedFactor = 1.0;
let flowEnabled = true;
// (lightweight flow particles kept simple for drone)

// Non-invasive physics helpers namespaced under `drone`.
// These are additive utilities and do not replace existing simulation logic.
const drone = {
    // Calculate quasi-steady lift using simple lifting-line approximation
    calculateLift: function(options = {}) {
        // options: { velocity: m/s, alpha: degrees, area: m^2 }
        const vel = (typeof options.velocity !== 'undefined') ? options.velocity : 0;
        const alpha = (typeof options.alpha !== 'undefined') ? options.alpha : 0;
        const A = (typeof options.area !== 'undefined') ? options.area : ((wingSize/100)*(wingSize/100)*0.7);
        const Cl = this.calculateLiftCoefficient(alpha);
        return 0.5 * airDensity * vel * vel * A * Cl;
    },

    // Simple drag estimate using Cd0 + k*Cl^2
    calculateDrag: function(options = {}) {
        const vel = (typeof options.velocity !== 'undefined') ? options.velocity : 0;
        const alpha = (typeof options.alpha !== 'undefined') ? options.alpha : 0;
        const A = (typeof options.area !== 'undefined') ? options.area : ((wingSize/100)*(wingSize/100)*0.7);
        const Cl = this.calculateLiftCoefficient(alpha);
        const Cd0 = 0.05;
        const k = 0.1;
        const Cd = Cd0 + k * Cl * Cl;
        return 0.5 * airDensity * vel * vel * A * Cd;
    },

    calculateWeight: function(m = mass) {
        return m * gravity;
    },

    // Thin-airfoil approximation (small angles) with clamped range
    calculateLiftCoefficient: function(alphaDeg) {
        const alphaRad = alphaDeg * Math.PI / 180;
        // 2π for thin airfoil, but clamp to realistic range
        const cl = Math.max(Math.min(2 * Math.PI * Math.sin(alphaRad), 3.5), -1.0);
        return cl;
    },

    // Bernoulli delta pressure between bottom and top velocities
    calculateBernoulliDP: function(vTop, vBottom) {
        return 0.5 * airDensity * (vBottom * vBottom - vTop * vTop);
    }
};

function setup() {
    let canvas = createCanvas(800, 600);
    canvas.parent('canvas-parent');
    
    // Get DOM elements
    flapFrequencySlider = select('#flapFrequency');
    flapAmplitudeSlider = select('#flapAmplitude');
    wingSizeSlider = select('#wingSize');
    liftDisplay = select('#lift-display');
    powerDisplay = select('#power-display');
    currentFreqDisplay = select('#current-freq-display');
    flapAngleDisplay = select('#flap-angle-display');
    
    // Set initial values
    updateValues();
    
    // Add event listeners
    flapFrequencySlider.input(updateValues);
    flapAmplitudeSlider.input(updateValues);
    wingSizeSlider.input(updateValues);

    // New UI bindings
    showCloudsCheckbox = select('#show-clouds');
    showTerrainCheckbox = select('#show-terrain');
    timeOfDaySlider = select('#timeOfDay');
    timeOfDayValueDisplay = select('#timeOfDay-value');

    if (showCloudsCheckbox) showCloudsCheckbox.changed(() => { showClouds = showCloudsCheckbox.elt.checked; });
    if (showTerrainCheckbox) showTerrainCheckbox.changed(() => { showTerrain = showTerrainCheckbox.elt.checked; });
    if (timeOfDaySlider) timeOfDaySlider.input(() => { timeOfDay = Number(timeOfDaySlider.value()); if (timeOfDayValueDisplay) timeOfDayValueDisplay.html(timeOfDay.toFixed(1)); });

    // Recompute derived values when timeOfDay changes
    if (timeOfDaySlider) timeOfDaySlider.input(() => { updateValues(); });

    // Initialize educational features (tutorial + experiments)
    initializeEducationalFeatures();
    if (DEBUG_BALANCE) enablePushPopDebug();
    // Initialize flow particles if enabled
    if (flowEnabled) initializeFlowParticles();

    // Presentation modal bindings
    const presModal = select('#presentationModal');
    const presContent = select('#presentationContent');
    const presClose = select('#presentationClose');
    const presCopy = select('#presentationCopy');
    const presPrint = select('#presentationPrint');

    function renderPresentation(){
        if (!presContent) return;
    // Build presentation content using the exact block requested by the user and current computed values
    let html = '';
    html += '<p><strong>Frecuencia de Batida (Hz):</strong><br><strong>' + Number(flapFrequency).toFixed(0) + ' Hz</strong></p>';
    html += '<p><strong>Amplitud de Batida (°):</strong><br><strong>' + Number(flapAmplitude).toFixed(0) + '°</strong></p>';
    html += '<p><strong>Tamaño de Alas (cm):</strong><br><strong>' + Number(wingSize).toFixed(0) + ' cm</strong></p>';
    html += '<p><strong>Hora del Día (0-24):</strong><br><strong>' + Number(timeOfDay).toFixed(1) + '</strong></p>';
    html += '<hr>';
    html += '<h4>Bernoulli / Presión</h4>';
    html += '<p><strong>ρ (densidad)</strong><br>' + rhoBern.toFixed(3) + ' kg/m³</p>';
    html += '<p><strong>v₁ (sobre ala)</strong><br><strong>' + vTop.toFixed(1) + ' m/s</strong></p>';
    html += '<p><strong>v₂ (bajo ala)</strong><br><strong>' + vBottom.toFixed(1) + ' m/s</strong></p>';
    html += '<p><strong>ΔP (P₂ - P₁)</strong><br><strong>' + deltaP.toFixed(1) + ' Pa</strong></p>';
    html += '<p><strong>Fuerza estimada</strong><br><strong>' + bernoulliForce.toFixed(2) + ' N</strong></p>';
    html += '<hr>';
    html += '<p><strong>Velocidades:</strong> v₁ = ' + vTop.toFixed(1) + ' m/s (sobre el ala), v₂ = ' + vBottom.toFixed(1) + ' m/s (bajo el ala)</p>';
    html += '<p><strong>ΔP =</strong> ½ × ' + rhoBern.toFixed(3) + ' × (v₁² − v₂²) = ' + deltaP.toFixed(1) + ' Pa</p>';
    html += '<p><strong>F↑ =</strong> ' + bernoulliForce.toFixed(2) + ' N (estimada)</p>';
    html += '<hr>';
    html += '<p><em>Esta simulación muestra cómo las alas batientes generan sustentación dinámica mediante el movimiento activo, inspirado en insectos como libélulas y colibríes.</em></p>';
    presContent.html(html);
    }

    // openPres button removed; modal can be shown via console.openPresentation() if needed
    if (presClose) presClose.mousePressed(()=>{ if (presModal) presModal.hide(); });
    if (presPrint) presPrint.mousePressed(()=>{ window.print(); });
    if (presCopy) presCopy.mousePressed(()=>{
        if (!presContent) return;
        // ensure content is up to date
        renderPresentation();
        const text = presContent.elt.innerText || presContent.html();
        navigator.clipboard && navigator.clipboard.writeText(text);
    });

    // Expose a console-accessible opener that renders up-to-date content
    window.openPresentation = function(){ if (presModal) { renderPresentation(); presModal.show(); } };
}

function initializeFlowParticles(){
    flowParticles = [];
    const count = Math.max(10, Math.floor(map(flowDensity, 0, 100, 10, 200)));
    for (let i = 0; i < count; i++){
        flowParticles.push({
            x: random(width), y: random(height*0.6), vx: random(-1,1), vy: random(-0.2,0.2), life: random(60,240)
        });
    }
}

function updateFlowParticles(){
    for (let p of flowParticles){
        // simple advection to the right with noise influenced by wing flapping
        p.x += (1.5 + sin(time * 0.5) * 0.5) * flowSpeedFactor;
        p.y += sin(p.x * 0.01 + time * 0.2) * 0.3;
        p.life -= 1;
        if (p.x > width + 20 || p.life <= 0){
            p.x = -20; p.y = random(height*0.6); p.life = random(60,240);
        }
    }
}

function drawFlowParticles(){
    push();
    noStroke();
    fill(200,230,255,160);
    for (let p of flowParticles){
        ellipse(p.x, p.y, 3, 2);
    }
    pop();
}

// Phase E: tutorial steps and experiments panel
const tutorialSteps = [
    { title: 'Introducción', body: 'Esta simulación muestra un dron con alas batientes; usa los sliders para cambiar la frecuencia y amplitud.' },
    { title: 'Sustentación', body: 'La sustentación se calcula dinámicamente en función del movimiento de las alas.' },
    { title: 'Escenario', body: 'Observa el terreno, el río y las estructuras del aeropuerto; los árboles son decorativos.' }
];


function initializeEducationalFeatures(){
    // Experiments panel removed — tutorial bindings continue below

    // Tutorial modal bindings
    const tPrev = select('#tutorialPrev');
    const tNext = select('#tutorialNext');
    const tClose = select('#tutorialClose');
    const tModal = select('#tutorialModal');
    const tContent = select('#tutorialContent');
    const tTitle = select('#tutorialTitle');
    const tIndicator = select('#tutorialIndicator');

    let currentStep = 0;

    function renderStep(){
        if (!tModal) return;
        tTitle.html(tutorialSteps[currentStep].title);
        tContent.html('<p>' + tutorialSteps[currentStep].body + '</p>');
        tIndicator.html((currentStep+1) + ' / ' + tutorialSteps.length);
    }

    if (tPrev) tPrev.mousePressed(() => { currentStep = max(0, currentStep-1); renderStep(); });
    if (tNext) tNext.mousePressed(() => { currentStep = min(tutorialSteps.length-1, currentStep+1); renderStep(); });
    if (tClose) tClose.mousePressed(() => { if (tModal) tModal.hide(); });

    // Expose simple API to open tutorial (can be used by UI later)
    window.openTutorial = function(){ if (tModal) { tModal.show(); currentStep = 0; renderStep(); } };
}

function applyExperimentPreset(name){
    // experiments removed; stub left for compatibility
    return;
}

function updateValues() {
    flapFrequency = flapFrequencySlider.value();
    flapAmplitude = flapAmplitudeSlider.value();
    wingSize = wingSizeSlider.value();
    
    // Update display values
    select('#flapFrequency-value').html(flapFrequency + ' Hz');
    select('#flapAmplitude-value').html(flapAmplitude + '°');
    select('#wingSize-value').html(wingSize + ' cm');
    
        // Relacionar sliders a velocidades estimadas usadas en la lectura de Bernoulli
        // Estimamos una velocidad 'bajo el ala' (vBottom) proporcional a la componente vertical/horizontal
        // generada por la batida. Esta es una heurística educativa, no afecta la dinámica real del dron.
        try {
            // flappingVelocity ~ flapFrequency * flapAmplitude * wingSize (normalized)
            let flappingVel = Number(flapFrequency) * Number(flapAmplitude) * (Number(wingSize) / 100) * 0.1; // m/s scale
            // Add a baseline forward speed depending on timeOfDay (just for visualization: calmer at night)
            let baseline = map(Number(timeOfDay), 0, 24, 0.5, 3.0);
            vBottom = Math.max(0, flappingVel + baseline);
            // Estimate vTop assuming some acceleration over the wing (common in cambered profiles)
            // Use Bernoulli rearrangement: vTop = sqrt(vBottom^2 - 2*ΔP/ρ). We'll keep previous vTop if invalid.
            let guessedDelta = deltaP; // may be zero initially
            let candidate = vBottom * vBottom - 2 * (guessedDelta) / rhoBern;
            if (candidate > 0) {
                vTop = Math.sqrt(candidate);
            } else {
                // if candidate invalid, assume vTop is higher than vBottom by a factor depending on amplitude
                vTop = vBottom + Math.abs(Number(flapAmplitude)) * 0.02 + Number(flapFrequency) * 0.05;
            }
        } catch (e) {
            // fallback to defaults
            vBottom = vBottom || 8.3;
            vTop = vTop || 24.3;
        }
}

function draw() {
    // Update time of day and sun angle
    sunAngle = map(timeOfDay % 24, 0, 24, -PI/2, PI/2); // -90deg (sunrise) to 90deg (sunset)

    // Sky gradient: two-tone vertical gradient influenced by sunAngle
    push();
    noFill();
    for (let y = 0; y <= height; y++){
        let p = y / height;
        // shift color by sun position (warmer near horizon when sun is low)
        const warm = map(abs(sunAngle), 0, PI/2, 0, 80);
        const r = lerp(20 + warm, 135, 1 - p);
        const g = lerp(50 + warm*0.6, 206, 1 - p);
        const b = lerp(80 + warm*0.3, 235, 1 - p);
        stroke(r, g, b);
        line(0, y, width, y);
    }
    pop();
    
    // Update time
    time += deltaTime / 1000; // Convert to seconds
    
    // Calculate flapping
    wingFlapAngle = sin(time * flapFrequency * TWO_PI) * flapAmplitude;
    
    // Calculate physics
    let lift = calculateDynamicLift();
    let power = calculatePowerConsumption();
    
    // Update displays (null-safe: DOM elements may have been removed)
    if (liftDisplay) liftDisplay.html(lift.toFixed(3) + ' N');
    if (powerDisplay) powerDisplay.html(power.toFixed(3) + ' W');
    if (currentFreqDisplay) currentFreqDisplay.html(flapFrequency.toFixed(1) + ' Hz');
    if (flapAngleDisplay) flapAngleDisplay.html(wingFlapAngle.toFixed(1) + '°');
    // Bernoulli calculations (adaptadas al dron)
    deltaP = 0.5 * rhoBern * (vTop * vTop - vBottom * vBottom);
    // Estimate force: deltaP * wing area (approx)
    let wingArea = (wingSize / 100) * (wingSize / 100) * 0.7; // m^2 approx
    bernoulliForce = deltaP * wingArea;
    // Update Bernoulli displays if present
    let rhoDisp = select('#rho-display'); if (rhoDisp) rhoDisp.html(rhoBern + ' kg/m³');
    let vTopDisp = select('#vtop-display'); if (vTopDisp) vTopDisp.html(vTop + ' m/s');
    let vBottomDisp = select('#vbottom-display'); if (vBottomDisp) vBottomDisp.html(vBottom + ' m/s');
    let deltaPDisp = select('#deltaP-display'); if (deltaPDisp) deltaPDisp.html(deltaP.toFixed(1) + ' Pa');
    let bernForceDisp = select('#bernForce-display'); if (bernForceDisp) bernForceDisp.html(bernoulliForce.toFixed(1) + ' N');

    // Update dynamic Bernoulli calculations panel
    updateBernoulliCalculations();
    
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

    // Draw Bernoulli annotation near drone
    drawBernoulliAnnotation();
}

function updateBernoulliCalculations(){
    // Estimate velocities like airplane.js: assume vBottom is freestream and vTop computed from ΔP
    const vBelow = vBottom; // m/s
    // Avoid negative/NaN
    let vAbove = vTop;
    try {
        vAbove = Math.sqrt(Math.max(0, vBelow * vBelow + 2 * ( - deltaP) / rhoBern));
        if (!isFinite(vAbove)) vAbove = vTop;
    } catch(e){ vAbove = vTop; }

    const velEl = document.getElementById('velocity-formula');
    if (velEl) velEl.innerHTML = `<strong>Velocidades:</strong> v₁ = <span style="color:#bf360c">${vAbove.toFixed(1)} m/s</span> (sobre el ala), v₂ = <span style="color:#1b5e20">${vBelow.toFixed(1)} m/s</span> (bajo el ala)`;

    const pressureEl = document.getElementById('pressure-formula');
    if (pressureEl) pressureEl.innerHTML = `<strong>ΔP =</strong> ½ × <em>${rhoBern.toFixed(3)}</em> × (v₁² − v₂²) = <span style="color:#4a148c">${deltaP.toFixed(1)} Pa</span>`;

    const newtonEl = document.getElementById('newton-formula');
    if (newtonEl) newtonEl.innerHTML = `<strong>F↑ =</strong> <span style="color:#e65100">${bernoulliForce.toFixed(2)} N</span> (estimada)`;

    // Update pressure bar (map ΔP to 0-100%) — choose reasonable bounds
    const bar = document.getElementById('pressure-bar');
    if (bar) {
        // clamp and map: assume 0-2000 Pa range for visualization
        const p = constrain(Math.abs(deltaP), 0, 2000);
        const pct = Math.round((p / 2000) * 100);
        bar.style.width = pct + '%';
    }

    // Show panel if exists
    const calcPanel = select('#bernoulli-calculations'); if (calcPanel) calcPanel.show();
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
    text('ΔP: ' + deltaP.toFixed(1) + ' Pa', -85, -55);
    text('F: ' + bernoulliForce.toFixed(1) + ' N', -85, -35);
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
    
    // Scale forces for visualization
    let scale = 100;
    
    // Lift vector (up)
    stroke(0, 255, 0);
    strokeWeight(3);
    line(0, 0, 0, -lift * scale);
    fill(0, 255, 0);
    text('Lift', 5, -lift * scale - 10);
    
    // Weight vector (down)
    let weight = mass * gravity;
    stroke(0, 0, 255);
    line(0, 0, 0, weight * scale);
    fill(0, 0, 255);
    text('Weight', 5, weight * scale + 15);
    
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
