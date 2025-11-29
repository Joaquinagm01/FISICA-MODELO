// Simulación de Avión con Alas Fijas
let velocity = 30;
let angleOfAttack = 5;
let altitude = 500;
let wingSpan = 10;
let wingChord = 2;
let wingArea = wingSpan * wingChord;
let airDensity = 1.225; // kg/m³ at sea level
let gravity = 9.81;
let mass = 1000; // kg

let velocitySlider, angleSlider, altitudeSlider;
let liftDisplay, dragDisplay, weightDisplay, airVelocityDisplay;

// Variables para efectos visuales avanzados
let timeOfDay = 0; // Ciclo de día
let sunAngle = 0; // Ángulo del sol
let cameraShake = 0;
let cameraRoll = 0;
let cameraPitch = 0;

// Partículas de flujo de aire
let flowParticles = [];

function setup() {
    let canvas = createCanvas(800, 600);
    canvas.parent('canvas-parent');
    
    // Get DOM elements
    velocitySlider = select('#velocity');
    angleSlider = select('#angle');
    altitudeSlider = select('#altitude');
    liftDisplay = select('#lift-display');
    dragDisplay = select('#drag-display');
    weightDisplay = select('#weight-display');
    airVelocityDisplay = select('#air-velocity-display');
    
    // Set initial values
    updateValues();
    
    // Add event listeners
    velocitySlider.input(updateValues);
    angleSlider.input(updateValues);
    altitudeSlider.input(updateValues);
}

function updateValues() {
    velocity = velocitySlider.value();
    angleOfAttack = angleSlider.value();
    altitude = altitudeSlider.value();
    
    // Update display values
    select('#velocity-value').html(velocity + ' m/s');
    select('#angle-value').html(angleOfAttack + '°');
    select('#altitude-value').html(altitude + ' m');
}

function draw() {
    // Variables para efectos visuales mejorados
    timeOfDay = (frameCount * 0.01) % (2 * PI); // Ciclo de día completo
    sunAngle = sin(timeOfDay) * PI/3; // Ángulo del sol (-60° a +60°)

    // Camera effects for flight sensation
    cameraShake = sin(frameCount * 0.1) * map(velocity, 10, 100, 0, 2);
    cameraRoll = sin(frameCount * 0.05) * map(angleOfAttack, -10, 20, -0.5, 0.5);
    cameraPitch = cos(frameCount * 0.08) * map(altitude, 0, 2000, 0, 1);

    // Apply camera transformation
    push();
    translate(width/2, height/2);
    rotate(cameraRoll * PI/180);
    translate(-width/2, -height/2);
    translate(cameraShake, cameraPitch);

    background(135, 206, 235); // Sky blue
    
    // Calculate physics
    let lift = calculateLift();
    let drag = calculateDrag();
    let weight = mass * gravity;
    
    // Update displays
    liftDisplay.html(lift.toFixed(1) + ' N');
    dragDisplay.html(drag.toFixed(1) + ' N');
    weightDisplay.html(weight.toFixed(1) + ' N');
    airVelocityDisplay.html(velocity.toFixed(1) + ' m/s');
    
    // Draw ground
    fill(34, 139, 34);
    rect(0, height - 50, width, 50);
    
    // Draw airplane
    drawAirplane();
    
    // Draw force vectors
    drawForceVectors(lift, drag, weight);
    
    // Draw air flow
    drawAirFlow();
    
    // Draw wing pressure distribution
    drawPressureDistribution();

    pop(); // End camera transformation
}

function calculateLift() {
    // Simplified lift calculation: L = 0.5 * ρ * v² * A * Cl
    // Cl ≈ 2π * α (small angle approximation)
    let cl = 2 * PI * (angleOfAttack * PI / 180); // Convert to radians
    let lift = 0.5 * airDensity * velocity * velocity * wingArea * cl;
    return lift;
}

function calculateDrag() {
    // Simplified drag calculation
    let cd = 0.05 + 0.01 * abs(angleOfAttack); // Basic drag coefficient
    let drag = 0.5 * airDensity * velocity * velocity * wingArea * cd;
    return drag;
}

function drawAirplane() {
    push();
    translate(width/2, height/2); // Centrar el ala en el canvas
    scale(1.4); // Hacer el ala más grande para mejor visibilidad

    // Calcular rotación del ala
    let wingRotation = angleOfAttack * PI / 180 * 0.3;
    rotate(wingRotation); // Rotación sutil

    // Dirección de la luz basada en el sol y ángulo de ataque
    let lightDirection = createVector(
        cos(sunAngle) * 0.7,
        sin(sunAngle) * 0.8 - 0.2,
        0.4 + sin(angleOfAttack * PI / 180 * 0.1) * 0.2
    ).normalize();

    let wingNormal = createVector(0, 0, 1); // Normal del ala (hacia arriba)

    // Calcular intensidad de luz para efectos 3D
    let lightIntensity = max(0, lightDirection.dot(wingNormal));
    let ambientLight = 0.3; // Luz ambiental base
    let totalLight = ambientLight + lightIntensity * 0.7;

    // Color del sol basado en la hora del día
    let sunColor = color(
        map(sin(timeOfDay), -1, 1, 255, 255), // Rojo constante
        map(sin(timeOfDay), -1, 1, 150, 255), // Verde varía
        map(sin(timeOfDay), -1, 1, 100, 255)  // Azul varía
    );

    // Variables para el ala
    let leadingEdgeX = -180;
    let leadingEdgeY = 0;

    // ===== TEXTURA METÁLICA CON ILUMINACIÓN DINÁMICA =====
    // Base metálica con gradiente afectado por la iluminación
    for (let layer = 0; layer < 4; layer++) {
        let layerLight = totalLight + layer * 0.1;
        let alpha = map(layer, 0, 3, 255, 150) * layerLight;

        // Color base metálico afectado por la luz del sol
        let baseR = map(layer, 0, 3, 60, 140) * layerLight;
        let baseG = map(layer, 0, 3, 65, 150) * layerLight;
        let baseB = map(layer, 0, 3, 75, 160) * layerLight;

        // Aplicar tinte del sol
        let metallicColor = color(
            constrain(baseR + red(sunColor) * 0.1, 0, 255),
            constrain(baseG + green(sunColor) * 0.1, 0, 255),
            constrain(baseB + blue(sunColor) * 0.1, 0, 255)
        );

        fill(red(metallicColor), green(metallicColor), blue(metallicColor), alpha);
        stroke(red(metallicColor) * 0.7, green(metallicColor) * 0.7, blue(metallicColor) * 0.7, alpha * 0.7);
        strokeWeight(1);

        // Dibujar perfil con gradiente metálico mejorado
        beginShape();
        vertex(leadingEdgeX, leadingEdgeY);
        bezierVertex(-120 + layer * 2, -25 + layer, -60 + layer, -45 + layer, 0, -55 + layer);
        bezierVertex(60 - layer, -55 + layer, 120 - layer * 2, -45 + layer, 180 - layer * 3, -25 + layer);
        vertex(200 - layer * 4, layer * 0.5);
        bezierVertex(180 - layer * 3, 15 - layer, 120 - layer * 2, 25 - layer, 60 - layer, 30 - layer);
        bezierVertex(0, 30 - layer, -60 + layer, 25 - layer, -120 + layer * 2, 15 - layer);
        bezierVertex(-150 + layer * 3, 8 - layer, -120 + layer * 2, 10 - layer, -90 + layer, 12 - layer);
        endShape(CLOSE);
    }

    // ===== BRILLOS ESPECULARES DINÁMICOS =====
    // Brillos especulares que cambian con la iluminación
    let specularIntensity = pow(max(0, lightDirection.dot(wingNormal)), 8) * 0.8;

    if (specularIntensity > 0.1) {
        stroke(red(sunColor), green(sunColor), blue(sunColor), specularIntensity * 255);
        strokeWeight(2);

        // Brillo principal (highlight) - más intenso con buena iluminación
        beginShape();
        vertex(leadingEdgeX + 10, leadingEdgeY - 5);
        bezierVertex(-80, -15, -20, -25, 20, -30);
        bezierVertex(80, -30, 140, -20, 170, -10);
        endShape();

        // Brillos secundarios con intensidad variable
        stroke(red(sunColor), green(sunColor), blue(sunColor), specularIntensity * 150);
        beginShape();
        vertex(leadingEdgeX + 20, leadingEdgeY - 2);
        bezierVertex(-60, -8, 0, -12, 40, -15);
        bezierVertex(100, -15, 150, -8, 180, -3);
        endShape();
    }

    // ===== SOMBRAS 3D DINÁMICAS =====
    // Sombras volumétricas basadas en dirección de luz
    push();
    let shadowOffsetX = lightDirection.x * 8;
    let shadowOffsetY = lightDirection.y * 8;
    translate(shadowOffsetX, shadowOffsetY);

    let shadowAlpha = (1 - totalLight) * 80 + 20;
    fill(0, 0, 0, shadowAlpha);
    noStroke();

    // Sombra del perfil principal
    beginShape();
    vertex(leadingEdgeX, leadingEdgeY);
    bezierVertex(-120, -25, -60, -45, 0, -55);
    bezierVertex(60, -55, 120, -45, 180, -25);
    vertex(200, 0);
    bezierVertex(180, 15, 120, 25, 60, 30);
    bezierVertex(0, 30, -60, 25, -120, 15);
    bezierVertex(-150, 8, -120, 10, -90, 12, leadingEdgeX, leadingEdgeY);
    endShape(CLOSE);
    pop();

    // ===== DETALLES DE SUPERFICIE =====
    // Paneles estructurales
    stroke(30, 30, 40, 120);
    strokeWeight(1);
    for (let i = 0; i < 6; i++) {
        let panelX = leadingEdgeX + 30 + i * 30;
        if (panelX < 180) {
            line(panelX, -40, panelX, 20);
        }
    }

    // Remaches en los paneles
    fill(60, 60, 70);
    noStroke();
    for (let i = 0; i < 8; i++) {
        let rivetX = leadingEdgeX + 20 + i * 25;
        let rivetY = -35;
        if (rivetX < 170) {
            ellipse(rivetX, rivetY, 2, 2);
            ellipse(rivetX, rivetY + 10, 2, 2);
            ellipse(rivetX, rivetY + 20, 2, 2);
            ellipse(rivetX, rivetY + 30, 2, 2);
            ellipse(rivetX, rivetY + 40, 2, 2);
        }
    }

    // Antenas GPS/VOR
    stroke(80, 80, 90);
    strokeWeight(2);
    // Antena principal
    line(50, -45, 50, -55);
    fill(100, 100, 110);
    ellipse(50, -55, 4, 4);

    // Antena secundaria
    line(120, -40, 120, -50);
    ellipse(120, -50, 3, 3);

    // ===== EFECTOS DE DESGASTE =====
    // Manchas de uso en áreas de alto estrés
    if (abs(angleOfAttack) > 10) { // Solo mostrar en ángulos altos
        fill(45, 45, 55, 80);
        noStroke();
        ellipse(leadingEdgeX + 15, leadingEdgeY, 25, 8);
        ellipse(160, -42, 15, 6);
        ellipse(160, 17, 15, 6);
    }

    // Hielo en bordes (para altitudes altas)
    if (altitude > 1500) { // Mostrar hielo en altitudes altas
        stroke(200, 220, 255, 120);
        strokeWeight(2);
        noFill();

        // Hielo en borde de ataque
        beginShape();
        vertex(leadingEdgeX, leadingEdgeY - 3);
        bezierVertex(leadingEdgeX + 20, leadingEdgeY - 5, leadingEdgeX + 40, leadingEdgeY - 4, leadingEdgeX + 60, leadingEdgeY - 3);
        endShape();

        // Hielo en borde de salida
        beginShape();
        vertex(180, -3);
        bezierVertex(185, -5, 190, -4, 195, -2);
        endShape();
    }

    // ===== BORDES MEJORADOS =====
    // Borde exterior con efecto metálico
    stroke(100, 110, 120, 200);
    strokeWeight(2);
    noFill();
    beginShape();
    vertex(leadingEdgeX, leadingEdgeY);
    bezierVertex(-120, -25, -60, -45, 0, -55);
    bezierVertex(60, -55, 120, -45, 180, -25);
    vertex(200, 0);
    bezierVertex(180, 15, 120, 25, 60, 30);
    bezierVertex(0, 30, -60, 25, -120, 15);
    bezierVertex(-150, 8, -120, 10, -90, 12, leadingEdgeX, leadingEdgeY);
    endShape();

    // Borde de ataque reforzado
    fill(60, 70, 80);
    stroke(40, 50, 60);
    strokeWeight(1);
    ellipse(leadingEdgeX, leadingEdgeY, 16, 12);

    fill(80, 90, 100);
    ellipse(leadingEdgeX, leadingEdgeY, 10, 8);

    // ===== FLAPS DINÁMICOS =====
    // Flaps cuando ángulo > 15°
    if (abs(angleOfAttack) > 15) {
        // Flaps superiores
        fill(90, 140, 220);
        stroke(70, 120, 200);
        strokeWeight(2);
        beginShape();
        vertex(160, -40);
        bezierVertex(170, -35, 180, -30, 185, -25);
        bezierVertex(180, -20, 170, -15, 160, -10);
        endShape(CLOSE);

        // Flaps inferiores
        beginShape();
        vertex(160, 15);
        bezierVertex(170, 20, 180, 25, 185, 30);
        bezierVertex(180, 35, 170, 40, 160, 45);
        endShape(CLOSE);
    }

    pop();
}

function drawForceVectors(lift, drag, weight) {
    push();
    translate(width/2, height/2 - 100);
    
    // Scale forces for visualization
    let scale = 0.01;
    
    // Lift vector (up)
    stroke(0, 255, 0);
    strokeWeight(3);
    line(0, 0, 0, -lift * scale);
    fill(0, 255, 0);
    text('Lift', 5, -lift * scale - 10);
    
    // Drag vector (back)
    stroke(255, 0, 0);
    line(0, 0, -drag * scale, 0);
    fill(255, 0, 0);
    text('Drag', -drag * scale - 30, -5);
    
    // Weight vector (down)
    stroke(0, 0, 255);
    line(0, 0, 0, weight * scale);
    fill(0, 0, 255);
    text('Weight', 5, weight * scale + 15);
    
    pop();
}

function drawAirFlow() {
    push();
    translate(width/2, height/2 - 100);
    
    // Draw air flow lines
    stroke(255, 255, 255, 150);
    strokeWeight(2);
    noFill();
    
    for (let i = -50; i <= 50; i += 10) {
        beginShape();
        for (let x = -100; x <= 100; x += 10) {
            let y = i + sin(x * 0.1) * 5; // Simple wave
            vertex(x, y);
        }
        endShape();
    }
    
    pop();
}

function drawPressureDistribution() {
    push();
    translate(width/2, height/2 - 100);
    
    // Draw pressure zones on wing
    push();
    translate(0, -10);
    rotate(angleOfAttack * PI / 180);
    
    // High pressure (bottom)
    fill(255, 100, 100, 150);
    rect(-wingSpan/2 * 10, wingChord/2 * 10 - 5, wingSpan * 10, 5);
    
    // Low pressure (top)
    fill(100, 100, 255, 150);
    rect(-wingSpan/2 * 10, -wingChord/2 * 10, wingSpan * 10, 5);
    
    pop();
    
    pop();
}
