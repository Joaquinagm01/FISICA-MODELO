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
    background(135, 206, 235); // Sky blue
    
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
    fill(34, 139, 34);
    rect(0, height - 50, width, 50);
    
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
