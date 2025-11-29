// Simulación de Avión con Alas Fijas
let velocity = 108; // km/h (30 m/s)
let angleOfAttack = 5;
let altitude = 500;
let wingSpan = 10.9; // m
let wingChord = 1.49; // m
let wingArea = wingSpan * wingChord;
let airDensity = 1.225; // Densidad del aire al nivel del mar (kg/m³)
let gravity = 9.81;
let mass = 1200; // kg

let velocitySlider, angleSlider, altitudeSlider, massSlider;
let liftDisplay, dragDisplay, weightDisplay, airVelocityDisplay;
let clDisplay, cdDisplay, ldDisplay, alphaDisplay, criticalAngleDisplay, flightStatusDisplay, efficiencyDisplay;
let showFormulasToggle, showCoefficientsToggle, formulasPanel, coefficientsPanel;

// Aerodynamic constants
const AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m³
const GRAVITY = 9.81; // m/s²
const WING_AREA = 16.2; // m² (wingSpan * wingChord = 10.9 * 1.49)
const WING_SPAN = 10.9; // m
const MEAN_CHORD = 1.49; // m
let aircraftMass = 1200; // kg (default mass)

// Aerodynamic calculation functions
function calculateLiftCoefficient(angleOfAttack) {
  // Simplified lift coefficient calculation
  // CL = CL0 + CL_alpha * alpha (in radians)
  const CL0 = 0.2; // Zero-lift coefficient
  const CL_alpha = 5.7; // Lift curve slope (per radian)
  const alpha_rad = angleOfAttack * Math.PI / 180;
  return CL0 + CL_alpha * alpha_rad;
}

function calculateDragCoefficient(angleOfAttack) {
  // Simplified drag coefficient calculation
  // CD = CD0 + k * CL²
  const CD0 = 0.02; // Zero-lift drag coefficient
  const k = 0.05; // Induced drag factor
  const CL = calculateLiftCoefficient(angleOfAttack);
  return CD0 + k * CL * CL;
}

function calculateAirDensity(altitude) {
  // Simplified air density calculation (exponential decay)
  const scaleHeight = 8500; // m
  return AIR_DENSITY_SEA_LEVEL * Math.exp(-altitude / scaleHeight);
}

function calculateLift(velocity, angleOfAttack, altitude) {
  const CL = calculateLiftCoefficient(angleOfAttack);
  const rho = calculateAirDensity(altitude);
  const V = velocity / 3.6; // Convert km/h to m/s
  return 0.5 * rho * V * V * WING_AREA * CL;
}

function calculateDrag(velocity, angleOfAttack, altitude) {
  const CD = calculateDragCoefficient(angleOfAttack);
  const rho = calculateAirDensity(altitude);
  const V = velocity / 3.6; // Convert km/h to m/s
  return 0.5 * rho * V * V * WING_AREA * CD;
}

function calculateWeight() {
  return aircraftMass * GRAVITY;
}

function calculateCriticalAngle() {
  // Critical angle of attack (stall angle)
  return 15; // degrees
}

function calculateEfficiency(lift, drag) {
  return lift / drag; // L/D ratio
}

function getFlightStatus(lift, weight, angleOfAttack, criticalAngle) {
  if (angleOfAttack >= criticalAngle) {
    return "STALL - ¡Pérdida de sustentación!";
  } else if (lift > weight * 1.1) {
    return "Ascenso";
  } else if (lift < weight * 0.9) {
    return "Descenso";
  } else {
    return "Vuelo nivelado";
  }
}

// Variables para efectos visuales avanzados
let timeOfDay = 0; // Ciclo de día
let sunAngle = 0; // Ángulo del sol
let cameraShake = 0;
let cameraRoll = 0;
let cameraPitch = 0;

// Partículas de flujo de aire
let flowParticles = [];
let maxParticles = 50; // Reduced for cleaner, more elegant flow visualization
let particleTrails = []; // Store particle trail history
let maxTrailLength = 15; // Maximum trail length

function setup() {
    let canvas = createCanvas(1400, 900);
    canvas.parent('canvas-parent');
    
    // Get DOM elements
    velocitySlider = select('#velocity');
    angleSlider = select('#angle');
    altitudeSlider = select('#altitude');
    massSlider = select('#mass');
    liftDisplay = select('#lift-display');
    dragDisplay = select('#drag-display');
    weightDisplay = select('#weight-display');
    airVelocityDisplay = select('#air-velocity-display');
    
    // Use document.querySelector for coefficient displays to ensure they are found
    clDisplay = document.querySelector('#cl-display');
    cdDisplay = document.querySelector('#cd-display');
    ldDisplay = document.querySelector('#ld-display');
    alphaDisplay = document.querySelector('#alpha-display');
    criticalAngleDisplay = document.querySelector('#critical-angle');
    flightStatusDisplay = document.querySelector('#flight-status');
    efficiencyDisplay = document.querySelector('#efficiency');
    
    showFormulasToggle = select('#show-formulas');
    showCoefficientsToggle = select('#show-coefficients');
    formulasPanel = select('#formulas-panel');
    coefficientsPanel = select('#coefficients-panel');
    
    // Initialize flow particles
    initializeFlowParticles();
    
    // Set initial values
    updateValues();
    
    // Add event listeners
    velocitySlider.input(updateValues);
    angleSlider.input(updateValues);
    altitudeSlider.input(updateValues);
    massSlider.input(updateValues);
    showFormulasToggle.changed(toggleFormulas);
    showCoefficientsToggle.changed(toggleCoefficients);
}

function updateValues() {
    velocity = velocitySlider.value();
    angleOfAttack = angleSlider.value();
    altitude = altitudeSlider.value();
    aircraftMass = massSlider.value();
    
    // Update display values
    select('#velocity-value').html(velocity + ' km/h');
    select('#angle-value').html(angleOfAttack + '°');
    select('#altitude-value').html(altitude + ' m');
    select('#mass-value').html(aircraftMass + ' kg');
    
    // Calculate aerodynamic forces
    const lift = calculateLift(velocity, angleOfAttack, altitude);
    const drag = calculateDrag(velocity, angleOfAttack, altitude);
    const weight = calculateWeight();
    const CL = calculateLiftCoefficient(angleOfAttack);
    const CD = calculateDragCoefficient(angleOfAttack);
    const criticalAngle = calculateCriticalAngle();
    const efficiency = calculateEfficiency(lift, drag);
    const flightStatus = getFlightStatus(lift, weight, angleOfAttack, criticalAngle);
    
    // Update force displays
    liftDisplay.html(lift.toFixed(0) + ' N');
    dragDisplay.html(drag.toFixed(0) + ' N');
    weightDisplay.html(weight.toFixed(0) + ' N');
    airVelocityDisplay.html((velocity / 3.6).toFixed(1) + ' m/s');
    
    // Update coefficient displays (with safety checks)
    if (clDisplay) clDisplay.textContent = CL.toFixed(3);
    if (cdDisplay) cdDisplay.textContent = CD.toFixed(3);
    if (ldDisplay) ldDisplay.textContent = efficiency.toFixed(2);
    if (alphaDisplay) alphaDisplay.textContent = angleOfAttack + '°';
    if (criticalAngleDisplay) criticalAngleDisplay.textContent = criticalAngle + '°';
    if (flightStatusDisplay) flightStatusDisplay.textContent = flightStatus;
    if (efficiencyDisplay) efficiencyDisplay.textContent = efficiency.toFixed(2);
}

function toggleFormulas() {
    if (showFormulasToggle.checked()) {
        formulasPanel.style('display', 'block');
    } else {
        formulasPanel.style('display', 'none');
    }
}

function toggleCoefficients() {
    if (showCoefficientsToggle.checked()) {
        coefficientsPanel.style('display', 'block');
    } else {
        coefficientsPanel.style('display', 'none');
    }
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

    // Enhanced sky background - light blue with gradient
    for (let y = 0; y < height; y++) {
        let alpha = map(y, 0, height * 0.7, 255, 200);
        stroke(135, 206, 235, alpha);
        line(0, y, width, y);
    }

    // Draw diffuse clouds in upper part
    drawClouds();

    // Draw ground - green strip at bottom
    fill(34, 139, 34);
    noStroke();
    rect(0, height - 80, width, 80);

    // Update flow particles
    updateFlowParticles();

    // Calculate physics
    let lift = calculateLift();
    let drag = calculateDrag();
    let weight = mass * gravity;

    // Update displays
    liftDisplay.html(lift.toFixed(1) + ' N');
    dragDisplay.html(drag.toFixed(1) + ' N');
    weightDisplay.html(weight.toFixed(1) + ' N');
    airVelocityDisplay.html(velocity.toFixed(1) + ' m/s');

    // Draw complete airplane
    drawCompleteAirplane();

    // Draw Bernoulli pressure visualization (only wing air flows)
    drawBernoulliPressureZones();

    // Draw force vectors
    drawForceVectors(lift, drag, weight);

    // Draw percentage indicators
    drawPercentageIndicators(lift, drag, weight);

    // Draw title label
    drawTitleLabel();

    // Draw reference point
    drawReferencePoint();
    
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
    translate(width/2, height/2);
    scale(1.4);
    
    // Calcular rotación del ala
    let wingRotation = angleOfAttack * PI / 180 * 0.3;
    rotate(wingRotation);
    
    // Variables para el ala
    let leadingEdgeX = -180;
    let leadingEdgeY = 0;
    
    // ===== ALA SIMPLIFICADA Y VISIBLE =====
    // Color base del ala - blanco sólido para máxima visibilidad
    fill(255, 255, 255);
    stroke(100, 150, 200);
    strokeWeight(3);
    
    // Dibujar perfil aerodinámico simplificado pero visible
    beginShape();
    vertex(leadingEdgeX, leadingEdgeY);
    bezierVertex(-120, -25, -60, -45, 0, -55);
    bezierVertex(60, -55, 120, -45, 180, -25);
    vertex(200, 0);
    bezierVertex(180, 15, 120, 25, 60, 30);
    bezierVertex(0, 30, -60, 25, -120, 15);
    bezierVertex(-150, 8, -120, 10, -90, 12);
    endShape(CLOSE);
    
    // Borde de ataque reforzado
    stroke(60, 70, 80);
    strokeWeight(4);
    fill(80, 90, 100);
    ellipse(leadingEdgeX, leadingEdgeY, 20, 14);
    
    // Líneas de flujo arriba del ala (sobre la superficie superior)
    drawAirflowArrows(true); // true = arriba
    
    // Líneas de flujo abajo del ala (sobre la superficie inferior)  
    drawAirflowArrows(false); // false = abajo
    
    pop();
}

function drawAirflowArrows(aboveWing) {
    let offsetY = aboveWing ? -35 : 35; // Posición más cerca del ala - MEJOR VISUALIZACIÓN
    let flowDirection = aboveWing ? 1 : 1; // Ambos flujos van hacia adelante
    let animationOffset = frameCount * 2; // Movimiento más suave de las flechas

    // Dibujar múltiples líneas de flujo - MÁS DENSAS PARA MEJOR COBERTURA
    for (let lineIndex = 0; lineIndex < 8; lineIndex++) { // Aumentado de 5 a 8 líneas
        // Espaciado variable: más denso cerca del ala, más espaciado lejos
        let spacingFactor = aboveWing ? (lineIndex * 0.8 + 0.5) : (lineIndex * 0.6 + 0.8);
        let lineY = offsetY - 15 + lineIndex * 8 * spacingFactor; // Espaciado más inteligente

        // Calcular curvatura basada en la forma del ala - PRINCIPIO DE BERNOULLI
        let startX = -250;
        let endX = 270;

        // Línea base del flujo - MÁS VISIBLE Y SUAVE
        let alpha = 200 - lineIndex * 12; // Gradiente de opacidad más sutil
        stroke(80, 180, 255, alpha);
        strokeWeight(2.5); // Más delgado para mejor definición
        noFill();

        beginShape();
        for (let x = startX; x <= endX; x += 8) {
            let y = lineY;

            // Aplicar principio de Bernoulli: flujo superior más curvado (mayor velocidad, menor presión)
            if (x > -180 && x < 150) { // Zona más amplia de influencia
                let normalizedX = map(x, -180, 150, 0, PI);

                // Curvatura mucho más pronunciada arriba (Bernoulli) - AJUSTADA PARA DISTANCIA
                let baseCurvature = aboveWing ? 35 : 20; // Superior: 35px, Inferior: 20px (más suave)
                // Variación más compleja con múltiples frecuencias para mejor "rodeo" del ala
                let variation1 = sin(normalizedX * 2.2 + lineIndex * 0.3) * 4;
                let variation2 = sin(normalizedX * 4.4 + lineIndex * 0.6) * 2; // Armónico superior
                let variation = variation1 + variation2;
                let curvature = sin(normalizedX) * (baseCurvature + variation);

                // Efecto de convergencia en la parte superior (mayor velocidad) - MÁS SUAVE
                if (aboveWing && x > 20) {
                    let convergenceFactor = map(x, 20, 150, 0, 18); // Convergencia más gradual
                    curvature += convergenceFactor * sin(normalizedX * 1.3);
                }

                // Efecto de aceleración cerca del borde de salida - MÁS SUAVE
                if (aboveWing && x > 80) {
                    let accelerationFactor = map(x, 80, 150, 0, 8);
                    curvature += accelerationFactor;
                }

                // Para flujo superior: curvar hacia arriba (alejándose del ala)
                // Para flujo inferior: curvar hacia abajo (siguiendo el perfil)
                if (aboveWing) {
                    y -= curvature; // Curva hacia arriba
                } else {
                    y += curvature; // Curva hacia abajo
                }
            }

            vertex(x, y);
        }
        endShape();

        // Dibujar flechas a lo largo del flujo con animación - MÁS FRECUENTES Y SUAVES
        let arrowSpacing = 16; // Más flechas para mejor visualización (reducido de 20)
        let speedMultiplier = 1 + lineIndex * 0.12; // Velocidad variable más sutil
        for (let i = 0; i < 12; i++) {
            let x = startX + 30 + (i * arrowSpacing + animationOffset * speedMultiplier) % (endX - startX - 60);
            let y = lineY;

            // Calcular posición y ángulo de la flecha según Bernoulli
            let arrowAngle = 0; // Ángulo de la flecha
            if (x > -180 && x < 150) {
                let normalizedX = map(x, -180, 150, 0, PI);
                let baseCurvature = aboveWing ? 35 : 20;
                let variation = sin(normalizedX * 2.2 + lineIndex * 0.3) * 4;
                let curvature = sin(normalizedX) * (baseCurvature + variation);

                if (aboveWing && x > 20) {
                    let convergenceFactor = map(x, 20, 150, 0, 18);
                    curvature += convergenceFactor * sin(normalizedX * 1.3);
                }

                if (aboveWing && x > 80) {
                    let accelerationFactor = map(x, 80, 150, 0, 8);
                    curvature += accelerationFactor;
                }

                // Para flujo superior: curvar hacia arriba (alejándose del ala)
                // Para flujo inferior: curvar hacia abajo (siguiendo el perfil)
                if (aboveWing) {
                    y -= curvature; // Curva hacia arriba
                } else {
                    y += curvature; // Curva hacia abajo
                }

                // Calcular ángulo de la flecha basado en la derivada de la curvatura
                let dx = 8;
                let nextNormalizedX = map(x + dx, -180, 150, 0, PI);
                let nextCurvature = sin(nextNormalizedX) * (baseCurvature + sin(nextNormalizedX * 2.2 + lineIndex * 0.3) * 4);
                if (aboveWing && x + dx > 20) {
                    let nextConvergence = map(x + dx, 20, 150, 0, 18);
                    nextCurvature += nextConvergence * sin(nextNormalizedX * 1.3);
                }
                if (aboveWing && x + dx > 80) {
                    let nextAcceleration = map(x + dx, 80, 150, 0, 8);
                    nextCurvature += nextAcceleration;
                }

                // Aplicar la misma lógica de dirección para el cálculo del ángulo
                let dy;
                if (aboveWing) {
                    dy = -(nextCurvature - curvature); // Invertir para flujo superior
                } else {
                    dy = nextCurvature - curvature;
                }
                arrowAngle = atan2(dy, dx);
            }

            // Dibujar flecha con ángulo correcto
            drawArrow(x, y, x + 18 * cos(arrowAngle), y + 18 * sin(arrowAngle), 12);
        }
    }
}

function drawArrow(x1, y1, x2, y2, arrowSize) {
    // Dibujar línea principal con borde blanco para máxima visibilidad
    stroke(255, 255, 255, 180); // Borde blanco más sutil
    strokeWeight(4);
    line(x1, y1, x2, y2);

    // Línea principal azul más elegante
    stroke(80, 180, 255, 240);
    strokeWeight(2.5);
    line(x1, y1, x2, y2);

    // Calcular ángulo de la línea
    let angle = atan2(y2 - y1, x2 - x1);

    // Dibujar punta de flecha más elegante
    push();
    translate(x2, y2);
    rotate(angle);

    // Borde sutil de la cabeza
    fill(255, 255, 255, 150);
    noStroke();
    triangle(0, 0, -arrowSize * 0.7, -arrowSize * 0.35, -arrowSize * 0.7, arrowSize * 0.35);

    // Cabeza azul principal
    fill(80, 180, 255, 255);
    triangle(0, 0, -arrowSize * 0.55, -arrowSize * 0.25, -arrowSize * 0.55, arrowSize * 0.25);

    pop();
}function drawForceVectors(lift, drag, weight) {
    push();
    translate(width/2, height/2);

    let scale = 0.008;

    // Lift vector (green, upward)
    stroke(0, 255, 0, 200);
    strokeWeight(4);
    fill(0, 255, 0, 200);
    let liftLength = lift * scale;
    line(0, 0, 0, -liftLength);
    // Arrow head
    triangle(0, -liftLength, -3, -liftLength + 8, 3, -liftLength + 8);
    // Label
    fill(0, 255, 0);
    textAlign(CENTER);
    textSize(14);
    text('Lift', 0, -liftLength - 15);

    // Drag vector (red, backward)
    stroke(255, 0, 0, 200);
    strokeWeight(4);
    fill(255, 0, 0, 200);
    let dragLength = drag * scale;
    line(0, 0, -dragLength, 0);
    triangle(-dragLength, 0, -dragLength + 8, -3, -dragLength + 8, 3);
    fill(255, 0, 0);
    textAlign(RIGHT);
    text('Drag', -dragLength - 10, 5);

    // Weight vector (orange, downward)
    stroke(255, 165, 0, 200);
    strokeWeight(4);
    fill(255, 165, 0, 200);
    let weightLength = weight * scale;
    line(0, 0, 0, weightLength);
    triangle(0, weightLength, -3, weightLength - 8, 3, weightLength - 8);
    fill(255, 165, 0);
    textAlign(CENTER);
    text('Weight', 0, weightLength + 20);

    pop();
}

// Draw complete airplane with fuselage, wings, tail, and other components
function drawCompleteAirplane() {
    push();
    translate(width/2, height/2);
    scale(2.5); // Much bigger airplane

    // Calculate wing rotation based on angle of attack
    let wingRotation = angleOfAttack * PI / 180 * 0.3;

    // ===== FUSELAJE (FUSELAGE) =====
    fill(200, 200, 200);
    stroke(100, 100, 100);
    strokeWeight(2);

    // Main fuselage body - cylindrical shape
    beginShape();
    vertex(-50, -5); // Nose
    bezierVertex(-30, -8, -10, -8, 20, -6); // Forward section
    bezierVertex(40, -4, 60, -2, 80, 0); // Mid section
    bezierVertex(100, 2, 120, 4, 140, 6); // Aft section
    bezierVertex(150, 8, 160, 10, 170, 12); // Tail section
    bezierVertex(160, 15, 150, 18, 140, 20); // Bottom of tail
    bezierVertex(120, 18, 100, 16, 80, 14); // Back to mid section
    bezierVertex(60, 12, 40, 10, 20, 8); // Back to forward section
    bezierVertex(-10, 6, -30, 4, -50, 2); // Back to nose
    endShape(CLOSE);

    // Cockpit windows
    fill(100, 150, 200, 150);
    stroke(50, 100, 150);
    strokeWeight(1);
    ellipse(-20, -6, 25, 8); // Main cockpit
    ellipse(0, -5, 20, 6); // Secondary window

    // Landing gear (simplified)
    stroke(80, 80, 80);
    strokeWeight(3);
    // Nose gear
    line(-35, 8, -35, 15);
    line(-38, 15, -32, 15);
    // Main gear
    line(30, 12, 30, 20);
    line(25, 20, 35, 20);
    line(70, 14, 70, 22);
    line(65, 22, 75, 22);

    // ===== ALAS PRINCIPALES (MAIN WINGS) =====
    push();
    translate(40, -10); // Position wings on fuselage
    rotate(wingRotation); // Apply angle of attack rotation

    // Right wing - more visible and aerodynamic
    fill(255, 255, 255);
    stroke(50, 50, 50);
    strokeWeight(3);

    beginShape();
    vertex(0, 0); // Wing root
    bezierVertex(15, -12, 50, -22, 110, -18); // Leading edge
    bezierVertex(130, -13, 150, -8, 170, -3); // Tip
    bezierVertex(150, 2, 130, 7, 110, 10); // Trailing edge
    bezierVertex(50, 14, 15, 10, 0, 4); // Back to root
    endShape(CLOSE);

    // Left wing (mirror of right) - more visible and aerodynamic
    beginShape();
    vertex(0, 0); // Wing root
    bezierVertex(15, 12, 50, 22, 110, 18); // Leading edge
    bezierVertex(130, 13, 150, 8, 170, 3); // Tip
    bezierVertex(150, -2, 130, -7, 110, -10); // Trailing edge
    bezierVertex(50, -14, 15, -10, 0, -4); // Back to root
    endShape(CLOSE);

    // Wing details
    stroke(60, 60, 60);
    strokeWeight(1);
    // Main spars
    line(20, -8, 140, -5); // Right wing spar
    line(20, 8, 140, 5); // Left wing spar

    // Flaps (control surfaces)
    fill(150, 150, 150);
    noStroke();
    rect(130, -8, 25, 6, 2); // Right flap
    rect(130, 2, 25, 6, 2); // Left flap

    // Ailerons
    fill(120, 120, 120);
    rect(155, -6, 20, 4, 1); // Right aileron
    rect(155, 2, 20, 4, 1); // Left aileron

    pop(); // End wing transformation

    // ===== COLA (TAIL) =====
    // Vertical stabilizer
    fill(180, 180, 180);
    stroke(100, 100, 100);
    strokeWeight(2);
    beginShape();
    vertex(150, -20);
    vertex(155, -40);
    vertex(165, -38);
    vertex(160, -18);
    endShape(CLOSE);

    // Rudder
    fill(140, 140, 140);
    beginShape();
    vertex(160, -38);
    vertex(165, -55);
    vertex(175, -53);
    vertex(170, -36);
    endShape(CLOSE);

    // Horizontal stabilizer
    fill(200, 200, 200);
    beginShape();
    vertex(130, -25);
    vertex(180, -23);
    vertex(185, -18);
    vertex(135, -20);
    endShape(CLOSE);

    beginShape(); // Lower surface
    vertex(130, -15);
    vertex(180, -17);
    vertex(185, -22);
    vertex(135, -24);
    endShape(CLOSE);

    // Elevator (control surface)
    fill(120, 120, 120);
    beginShape();
    vertex(175, -25);
    vertex(190, -24);
    vertex(195, -19);
    vertex(180, -20);
    endShape(CLOSE);

    // ===== DETALLES ADICIONALES =====
    // Engine nacelles (if jet)
    fill(160, 160, 160);
    stroke(80, 80, 80);
    strokeWeight(1);
    ellipse(20, -12, 15, 8); // Right engine
    ellipse(20, 12, 15, 8); // Left engine

    // Engine exhaust
    fill(100, 100, 100);
    ellipse(35, -12, 8, 6);
    ellipse(35, 12, 8, 6);

    // Winglets (modern touch)
    stroke(120, 120, 120);
    strokeWeight(2);
    noFill();
    beginShape();
    vertex(175, -8);
    vertex(185, -12);
    vertex(190, -6);
    vertex(180, -2);
    endShape();

    beginShape();
    vertex(175, 8);
    vertex(185, 12);
    vertex(190, 6);
    vertex(180, 2);
    endShape();

    // Antennas and sensors
    stroke(255, 0, 0);
    strokeWeight(2);
    line(-45, -8, -50, -12); // VHF antenna
    line(170, -25, 175, -30); // Tail antenna

    pop();
}

// Initialize flow particles for air flow visualization
function initializeFlowParticles() {
    flowParticles = [];

    // Create particles for upper surface (faster flow) - adjusted for wing shape
    for (let i = 0; i < 20; i++) {
        let chordPos = map(i, 0, 19, -180, 180);
        let upperOffset = random(-50, -15);

        flowParticles.push({
            x: chordPos,
            y: upperOffset,
            vx: 2.5 + random(1.0),
            vy: random(-0.3, 0.3),
            surface: 'upper',
            age: random(100),
            maxAge: 250 + random(100),
            trail: [],
            size: random(2, 4),
            color: [100, 200, 255]
        });
    }

    // Create particles for lower surface (slower flow) - adjusted for wing shape
    for (let i = 0; i < 15; i++) {
        let chordPos = map(i, 0, 14, -180, 180);
        let lowerOffset = random(15, 50);

        flowParticles.push({
            x: chordPos,
            y: lowerOffset,
            vx: 1.2 + random(0.8),
            vy: random(-0.3, 0.3),
            surface: 'lower',
            age: random(100),
            maxAge: 220 + random(80),
            trail: [],
            size: random(2, 4),
            color: [255, 150, 100]
        });
    }
}

// Update flow particles
function updateFlowParticles() {
    for (let i = flowParticles.length - 1; i >= 0; i--) {
        let p = flowParticles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Add to trail
        p.trail.push({x: p.x, y: p.y});
        if (p.trail.length > 10) {
            p.trail.shift();
        }

        // Age particle
        p.age++;

        // Reset particle if it goes off screen or ages out - adjusted for wing dimensions
        if (p.x > width/2 + 200 || p.age > p.maxAge) {
            if (p.surface === 'upper') {
                p.x = -220;
                p.y = random(-50, -15);
                p.age = 0;
                p.trail = [];
            } else {
                p.x = -220;
                p.y = random(15, 50);
                p.age = 0;
                p.trail = [];
            }
        }
    }
}

// Enhanced air flow with continuous streamlines
function drawEnhancedAirFlow() {
    // Draw continuous streamlines around the wing - adjusted for wing shape
    for (let i = 0; i < 8; i++) {
        let yOffset = map(i, 0, 7, -70, 70);
        drawStreamline(yOffset, i);
    }
}

function drawStreamline(yOffset, index) {
    push();
    translate(width/2, height/2);

    stroke(100, 150, 255, 150);
    strokeWeight(2);
    noFill();

    beginShape();
    for (let x = -220; x < 250; x += 3) {
        let y = yOffset;

        // Wing influence zone - adjusted for wing dimensions
        if (x > -180 && x < 180) {
            let normalizedX = map(x, -180, 180, 0, PI);
            let influence = sin(normalizedX);

            // Bernoulli effect - flow accelerates over upper surface
            if (yOffset > 0) { // Above wing
                y += influence * 50 * (1 - abs(yOffset)/100);
            } else { // Below wing
                y += influence * 30 * (1 - abs(yOffset)/100);
            }
        }

        vertex(x, y);
    }
    endShape();

    // Add directional arrows along streamline - adjusted spacing
    let arrowSpacing = 50;
    for (let i = 0; i < 8; i++) {
        let x = -200 + i * arrowSpacing;
        let y = yOffset;

        if (x > -180 && x < 180) {
            let normalizedX = map(x, -180, 180, 0, PI);
            let influence = sin(normalizedX);
            if (yOffset > 0) {
                y += influence * 50 * (1 - abs(yOffset)/100);
            } else {
                y += influence * 30 * (1 - abs(yOffset)/100);
            }
        }

        // Draw arrow
        let nextX = x + 15;
        let nextY = y;
        if (nextX > -180 && nextX < 180) {
            let normalizedX2 = map(nextX, -180, 180, 0, PI);
            let influence2 = sin(normalizedX2);
            if (yOffset > 0) {
                nextY += influence2 * 50 * (1 - abs(yOffset)/100);
            } else {
                nextY += influence2 * 30 * (1 - abs(yOffset)/100);
            }
        }

        drawArrow(x, y, nextX, nextY, 8);
    }

    pop();
}

// Draw percentage indicators
function drawPercentageIndicators(lift, drag, weight) {
    let totalForce = lift + drag + weight;

    // Position indicators on the right side
    let xPos = width - 150;
    let yPos = 100;

    // Background box
    fill(0, 0, 0, 150);
    stroke(255);
    strokeWeight(1);
    rect(xPos - 10, yPos - 20, 140, 120, 5);

    // Title
    fill(255);
    textAlign(LEFT);
    textSize(12);
    text('Force Distribution:', xPos, yPos);

    // Lift percentage
    let liftPercent = (lift / totalForce * 100).toFixed(1);
    fill(0, 255, 0);
    text(`Lift: ${liftPercent}%`, xPos, yPos + 25);

    // Drag percentage
    let dragPercent = (drag / totalForce * 100).toFixed(1);
    fill(255, 0, 0);
    text(`Drag: ${dragPercent}%`, xPos, yPos + 45);

    // Weight percentage
    let weightPercent = (weight / totalForce * 100).toFixed(1);
    fill(255, 165, 0);
    text(`Weight: ${weightPercent}%`, xPos, yPos + 65);
}

// Draw title label
function drawTitleLabel() {
    fill(255);
    textAlign(CENTER);
    textSize(22);
    text('Complete Aircraft Aerodynamics', width/2, 30);
}

// Draw reference point on leading edge
function drawReferencePoint() {
    push();
    translate(width/2 - 150, height/2);

    // Reference point
    fill(255, 0, 0);
    stroke(255);
    strokeWeight(2);
    ellipse(0, 0, 8, 8);

    // Label
    fill(255);
    textAlign(LEFT);
    textSize(12);
    text('Leading Edge', 10, -5);

    pop();
}

function drawClouds() {
    let cloudOffset = frameCount * 0.02;
    
    // Cloud 1 - large, slow moving
    push();
    translate(150 + sin(cloudOffset) * 20, 80);
    fill(255, 255, 255, 220);
    noStroke();
    ellipse(0, 0, 120, 70);
    ellipse(40, -10, 100, 60);
    ellipse(-30, 10, 90, 50);
    ellipse(20, 15, 80, 45);
    pop();
    
    // Cloud 2 - medium, medium speed
    push();
    translate(350 + sin(cloudOffset * 0.8) * 15, 110);
    fill(255, 255, 255, 200);
    noStroke();
    ellipse(0, 0, 90, 55);
    ellipse(30, -5, 75, 45);
    ellipse(-20, 8, 70, 40);
    pop();
    
    // Cloud 3 - small, fast moving
    push();
    translate(550 + sin(cloudOffset * 1.2) * 25, 140);
    fill(255, 255, 255, 180);
    noStroke();
    ellipse(0, 0, 70, 40);
    ellipse(20, -3, 55, 35);
    ellipse(-15, 5, 50, 30);
    pop();
    
    // Cloud 4 - wispy, high altitude
    push();
    translate(200 + sin(cloudOffset * 0.5) * 10, 160);
    fill(240, 248, 255, 150);
    noStroke();
    ellipse(0, 0, 150, 30);
    ellipse(50, 5, 120, 25);
    ellipse(-40, -3, 100, 20);
    pop();
}

function drawVelocityLegend() {
    // Draw velocity color legend in bottom right corner
    push();
    translate(320, 250);

    // Legend background
    fill(0, 0, 0, 120);
    noStroke();
    rect(-10, -10, 120, 80, 5);

    // Title
    fill(255);
    textSize(10);
    textAlign(CENTER);
    text("Velocidad", 50, 8);

    // Color gradient bar
    for (let i = 0; i < 100; i++) {
        let normalizedSpeed = i / 100;
        let r, g, b;

        if (normalizedSpeed < 0.25) {
            r = map(normalizedSpeed, 0, 0.25, 50, 100);
            g = map(normalizedSpeed, 0, 0.25, 100, 200);
            b = 255;
        } else if (normalizedSpeed < 0.5) {
            r = map(normalizedSpeed, 0.25, 0.5, 100, 50);
            g = 255;
            b = map(normalizedSpeed, 0.25, 0.5, 200, 100);
        } else if (normalizedSpeed < 0.75) {
            r = map(normalizedSpeed, 0.5, 0.75, 50, 200);
            g = 255;
            b = map(normalizedSpeed, 0.5, 0.75, 100, 50);
        } else {
            r = 255;
            g = map(normalizedSpeed, 0.75, 1, 200, 100);
            b = 50;
        }

        stroke(r, g, b);
        strokeWeight(3);
        line(i, 15, i, 35);
    }

    // Labels
    fill(255);
    textSize(8);
    textAlign(CENTER);
    text("Lento", 15, 50);
    text("Rápido", 85, 50);

    // Velocity range
    let minVel = 0;
    let maxVel = velocity * 2;
    text(minVel.toFixed(0) + " m/s", 15, 60);
    text(maxVel.toFixed(0) + " m/s", 85, 60);

    pop();
}

function drawWingLoadDistribution() {
    push();
    translate(width/2, height/2);
    scale(1.4);

    // Draw wing load distribution
    let wingLength = 360;
    let numSegments = 20;

    // Elliptical lift distribution (ideal for minimum induced drag)
    for (let i = 0; i < numSegments; i++) {
        let x = map(i, 0, numSegments - 1, -wingLength/2, wingLength/2);
        let spanwisePosition = abs(x) / (wingLength/2); // 0 at center, 1 at tip

        // Elliptical distribution: L(y) = L_max * sqrt(1 - (2y/b)^2)
        let liftCoefficient = sqrt(1 - pow(2 * spanwisePosition, 2));

        // Scale based on current lift
        let currentLift = calculateLift(velocity, angleOfAttack, altitude);
        let maxLiftPerSpan = currentLift / wingLength * 2; // Approximate

        let loadHeight = liftCoefficient * maxLiftPerSpan * 0.001; // Scale for visualization
        loadHeight = constrain(loadHeight, 0, 50); // Limit height

        // Color based on load intensity
        let loadIntensity = map(loadHeight, 0, 50, 0, 1);
        let r = map(loadIntensity, 0, 1, 100, 255);
        let g = map(loadIntensity, 0, 1, 200, 100);
        let b = 100;

        // Draw load distribution bar
        fill(r, g, b, 180);
        noStroke();
        rect(x - 8, -80 - loadHeight, 16, loadHeight);

        // Add load value text for major segments
        if (i % 5 === 0) {
            fill(255);
            textSize(8);
            textAlign(CENTER);
            text((liftCoefficient * 100).toFixed(0) + "%", x, -85 - loadHeight);
        }
    }

    // Label
    fill(255);
    textSize(10);
    textAlign(CENTER);
    text("Distribución de Carga del Ala", 0, -120);

    pop();
}

function drawBernoulliPressureZones() {
    push();
    translate(width/2, height/2);
    scale(2.5);

    // Wing position relative to center
    let wingX = 40;
    let wingY = -10;

    // ===== BERNOULLI PRESSURE VISUALIZATION =====
    // Upper surface: LOW PRESSURE (faster flow) - BLUE/CYAN colors
    // Lower surface: HIGH PRESSURE (slower flow) - RED/ORANGE colors

    // Upper pressure zone (low pressure - suction)
    for (let i = 0; i < 15; i++) {
        let x = wingX + map(i, 0, 14, 0, 180);
        let y = wingY - 20 - i * 2; // Above wing surface

        // Calculate pressure gradient (lower pressure above)
        let pressureIntensity = map(i, 0, 14, 0.8, 0.2); // Decreasing pressure
        let alpha = pressureIntensity * 120;

        // Blue gradient for low pressure (Bernoulli effect)
        let r = map(pressureIntensity, 0, 1, 50, 150);
        let g = map(pressureIntensity, 0, 1, 100, 200);
        let b = 255;

        fill(r, g, b, alpha);
        noStroke();
        ellipse(x, y, 25 - i * 0.8, 15 - i * 0.5);

        // Add pressure arrows pointing upward (suction)
        if (i % 3 === 0) {
            stroke(100, 150, 255, alpha + 50);
            strokeWeight(2);
            let arrowLength = 15 * pressureIntensity;
            line(x, y + 8, x, y + 8 - arrowLength);
            // Arrow head
            fill(100, 150, 255, alpha + 50);
            triangle(x, y + 8 - arrowLength, x - 2, y + 8 - arrowLength + 4, x + 2, y + 8 - arrowLength + 4);
        }
    }

    // Lower pressure zone (high pressure - pushing up)
    for (let i = 0; i < 12; i++) {
        let x = wingX + map(i, 0, 11, 10, 170);
        let y = wingY + 25 + i * 1.5; // Below wing surface

        // Calculate pressure gradient (higher pressure below)
        let pressureIntensity = map(i, 0, 11, 0.9, 0.3); // Higher pressure
        let alpha = pressureIntensity * 100;

        // Red-orange gradient for high pressure
        let r = 255;
        let g = map(pressureIntensity, 0, 1, 100, 200);
        let b = map(pressureIntensity, 0, 1, 50, 100);

        fill(r, g, b, alpha);
        noStroke();
        ellipse(x, y, 20 - i * 0.5, 12 - i * 0.3);

        // Add pressure arrows pointing downward (pushing up)
        if (i % 4 === 0) {
            stroke(255, 150, 100, alpha + 50);
            strokeWeight(2);
            let arrowLength = 12 * pressureIntensity;
            line(x, y - 6, x, y - 6 + arrowLength);
            // Arrow head
            fill(255, 150, 100, alpha + 50);
            triangle(x, y - 6 + arrowLength, x - 2, y - 6 + arrowLength - 4, x + 2, y - 6 + arrowLength - 4);
        }
    }

    // ===== PRESSURE DIFFERENTIAL INDICATORS =====
    // Visual pressure difference arrows
    let pressureDiffX = wingX + 90;
    let upperPressureY = wingY - 35;
    let lowerPressureY = wingY + 40;

    // Large pressure difference arrow
    stroke(255, 255, 0, 200);
    strokeWeight(4);
    fill(255, 255, 0, 150);
    // Arrow from high pressure (bottom) to low pressure (top)
    let arrowStartX = pressureDiffX;
    let arrowStartY = lowerPressureY - 10;
    let arrowEndX = pressureDiffX;
    let arrowEndY = upperPressureY + 10;

    // Draw arrow shaft
    line(arrowStartX, arrowStartY, arrowEndX, arrowEndY);

    // Draw arrow head (pointing upward)
    let arrowAngle = atan2(arrowEndY - arrowStartY, arrowEndX - arrowStartX);
    push();
    translate(arrowEndX, arrowEndY);
    rotate(arrowAngle);
    triangle(0, 0, -6, -4, 6, -4);
    pop();

    // Label the pressure difference
    fill(255, 255, 0);
    textAlign(CENTER);
    textSize(12);
    text('ΔP', pressureDiffX + 20, (upperPressureY + lowerPressureY) / 2);

    // ===== AIR FLOWS ABOVE AND BELOW THE WING =====
    // Focused air flows showing Bernoulli principle clearly

    // Air flows above the wing (faster flow, low pressure)
    for (let i = 0; i < 4; i++) {
        let yOffset = wingY - 15 - i * 8; // Above wing surface
        drawWingAirFlow(yOffset, i, true); // true = above wing
    }

    // Air flows below the wing (slower flow, high pressure)
    for (let i = 0; i < 4; i++) {
        let yOffset = wingY + 15 + i * 8; // Below wing surface
        drawWingAirFlow(yOffset, i, false); // false = below wing
    }

    pop();
}

function drawWingAirFlow(yOffset, index, isAboveWing) {
    push();
    translate(0, 0); // Already translated in parent function

    // Wing position
    let wingX = 40;
    let wingY = -10;

    // Determine flow characteristics based on position
    let baseColor, flowSpeed, curvatureMultiplier;

    if (isAboveWing) {
        // Above wing: faster flow, lower pressure, blue color
        baseColor = [80, 180, 255]; // Blue for low pressure
        flowSpeed = 1.5; // Faster flow
        curvatureMultiplier = 45; // More curved (Bernoulli effect)
    } else {
        // Below wing: slower flow, higher pressure, red color
        baseColor = [255, 120, 80]; // Red for high pressure
        flowSpeed = 0.8; // Slower flow
        curvatureMultiplier = 20; // Less curved
    }

    strokeWeight(3);
    noFill();

    // Draw the main flow streamline
    beginShape();
    for (let x = -150; x < 250; x += 3) {
        let y = yOffset;

        // Wing influence zone - focused on wing area
        if (x > wingX && x < wingX + 170) {
            let normalizedX = map(x, wingX, wingX + 170, 0, PI);
            let influence = sin(normalizedX);

            if (isAboveWing) {
                // Above: flow curves upward (away from wing)
                y -= influence * curvatureMultiplier;
            } else {
                // Below: flow curves downward (following wing contour)
                y += influence * curvatureMultiplier;
            }
        }

        vertex(x, y);
    }
    endShape();

    // Draw animated arrows along the flow
    let arrowSpacing = 40;
    let animationOffset = (frameCount * flowSpeed * 2 + index * 20) % arrowSpacing;

    for (let i = 0; i < 8; i++) {
        let x = -120 + i * arrowSpacing + animationOffset;
        let y = yOffset;

        // Skip if outside wing area
        if (x < wingX - 20 || x > wingX + 190) continue;

        // Calculate flow direction and curvature at this point
        let arrowAngle = 0;
        let localSpeed = flowSpeed;

        if (x > wingX && x < wingX + 170) {
            let normalizedX = map(x, wingX, wingX + 170, 0, PI);
            let influence = sin(normalizedX);

            if (isAboveWing) {
                y -= influence * curvatureMultiplier;
                // Calculate angle for upward curving flow
                let dx = 3;
                let nextInfluence = sin(map(x + dx, wingX, wingX + 170, 0, PI));
                let dy = -(nextInfluence - influence) * curvatureMultiplier;
                arrowAngle = atan2(dy, dx);
            } else {
                y += influence * curvatureMultiplier;
                // Calculate angle for downward curving flow
                let dx = 3;
                let nextInfluence = sin(map(x + dx, wingX, wingX + 170, 0, PI));
                let dy = (nextInfluence - influence) * curvatureMultiplier;
                arrowAngle = atan2(dy, dx);
            }
        }

        // Draw arrow with appropriate color and size
        let arrowLength = 15 + localSpeed * 5;

        // Arrow shaft
        stroke(baseColor[0], baseColor[1], baseColor[2], 220);
        strokeWeight(2.5);
        let endX = x + cos(arrowAngle) * arrowLength;
        let endY = y + sin(arrowAngle) * arrowLength;
        line(x, y, endX, endY);

        // Arrow head
        push();
        translate(endX, endY);
        rotate(arrowAngle);
        fill(baseColor[0], baseColor[1], baseColor[2], 220);
        let headSize = 6 + localSpeed * 2;
        triangle(0, 0, -headSize/2, -headSize/3, headSize/2, -headSize/3);
        pop();
    }

    pop();
}

function drawPressureLegend() {
    // Draw pressure scale legend
    let legendX = -350;
    let legendY = -100;

    // Legend background
    fill(0, 0, 0, 180);
    stroke(255);
    strokeWeight(1);
    rect(legendX - 10, legendY - 15, 160, 100, 5);

    // Title
    fill(255);
    textAlign(CENTER);
    textSize(12);
    text('Principio de Bernoulli', legendX + 70, legendY + 5);

    // Pressure scale
    textAlign(LEFT);
    textSize(10);
    fill(255, 100, 100);
    text('Presión Alta', legendX + 5, legendY + 25);
    text('(Flujo Lento)', legendX + 5, legendY + 38);

    fill(100, 150, 255);
    text('Presión Baja', legendX + 5, legendY + 55);
    text('(Flujo Rápido)', legendX + 5, legendY + 68);

    // Bernoulli equation
    fill(255, 255, 0);
    textSize(11);
    text('P + ½ρv² + ρgh = cte', legendX + 5, legendY + 88);
}

function drawAtmosphericClouds() {
    // Draw atmospheric clouds for enhanced realism
    let cloudOffset = frameCount * 0.005;

    // Cloud 1 - large, slow moving
    push();
    translate(100 + sin(cloudOffset) * 30, 120);
    fill(255, 255, 255, 200);
    noStroke();
    ellipse(0, 0, 120, 60);
    ellipse(40, -5, 100, 50);
    ellipse(-30, 8, 90, 45);
    pop();

    // Cloud 2 - medium, medium speed
    push();
    translate(400 + sin(cloudOffset * 0.8) * 20, 100);
    fill(255, 255, 255, 180);
    noStroke();
    ellipse(0, 0, 90, 55);
    ellipse(30, -5, 75, 45);
    ellipse(-20, 8, 70, 40);
    pop();

    // Cloud 3 - small, fast moving
    push();
    translate(550 + sin(cloudOffset * 1.2) * 25, 140);
    fill(255, 255, 255, 180);
    noStroke();
    ellipse(0, 0, 70, 40);
    ellipse(20, -3, 55, 35);
    ellipse(-15, 5, 50, 30);
    pop();

    // Cloud 4 - wispy, high altitude
    push();
    translate(200 + sin(cloudOffset * 0.5) * 10, 160);
    fill(240, 248, 255, 150);
    noStroke();
    ellipse(0, 0, 150, 30);
    ellipse(50, 5, 120, 25);
    ellipse(-40, -3, 100, 20);
    pop();
}
