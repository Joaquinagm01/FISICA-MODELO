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
let showClouds = true;
let showTerrain = true;
let timeOfDay = 12.0; // noon
let sunAngle = 0;

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
}

function updateValues() {
    flapFrequency = flapFrequencySlider.value();
    flapAmplitude = flapAmplitudeSlider.value();
    wingSize = wingSizeSlider.value();
    
    // Update display values
    select('#flapFrequency-value').html(flapFrequency + ' Hz');
    select('#flapAmplitude-value').html(flapAmplitude + '°');
    select('#wingSize-value').html(wingSize + ' cm');
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
    
    // Update displays
    liftDisplay.html(lift.toFixed(3) + ' N');
    powerDisplay.html(power.toFixed(3) + ' W');
    currentFreqDisplay.html(flapFrequency.toFixed(1) + ' Hz');
    flapAngleDisplay.html(wingFlapAngle.toFixed(1) + '°');
    
    // Draw ground
    if (showTerrain) {
        drawTerrainAndLandscape();
    } else {
        fill(34, 139, 34);
        rect(0, height - 50, width, 50);
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
    // Layered hills, river and runway
    push();
    let groundY = height - 60;
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

    // Foreground grass
    fill(30, 110, 30);
    rect(0, groundY + 40, width, height - (groundY + 40));

    // River (simple bezier path)
    fill(30, 144, 255, 200);
    beginShape();
    vertex(0, groundY + 80);
    bezierVertex(width*0.25, groundY + 30 + sin(time*0.002)*20, width*0.75, groundY + 140 + cos(time*0.001)*20, width, groundY + 80);
    vertex(width, height);
    vertex(0, height);
    endShape(CLOSE);

    // Runway
    fill(80,80,80);
    let rwY = groundY + 20;
    rect(width/2 - 180, rwY - 8, 360, 16, 4);
    // runway markings
    stroke(200);
    strokeWeight(2);
    for (let i = -3; i <= 3; i++){
        line(width/2 + i*30 - 5, rwY - 2, width/2 + i*30 + 5, rwY - 2);
    }
    noStroke();
    pop();
}

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
