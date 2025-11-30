// Simulación de Avión con Alas Fijas
let velocity = 30; // km/h
let angleOfAttack = 5;
let altitude = 500;
let wingSpan = 10.9; // m
let wingChord = 1.49; // m
let airDensity = 1.225; // Densidad del aire al nivel del mar (kg/m³)
let gravity = 9.81;
let mass = 1338; // kg

let velocitySlider, angleSlider, altitudeSlider, massSlider, wingAreaSlider;
let liftDisplay, dragDisplay, weightDisplay, airVelocityDisplay;
let showFormulasToggle, formulasPanel;

// Coefficient display elements
let clDisplay, cdDisplay, ldDisplay, alphaDisplay, criticalAngleDisplay, flightStatusDisplay, efficiencyDisplay;

// Aerodynamic constants
const AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m³
const GRAVITY = 9.81; // m/s²
const WING_SPAN = 10.9; // m
const MEAN_CHORD = 1.49; // m
let aircraftMass = 1200; // kg (default mass)
let wingArea = 36.3; // m² (controlled by slider)

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
  return 0.5 * rho * V * V * wingArea * CL;
}

function calculateDrag(velocity, angleOfAttack, altitude) {
  const CD = calculateDragCoefficient(angleOfAttack);
  const rho = calculateAirDensity(altitude);
  const V = velocity / 3.6; // Convert km/h to m/s
  return 0.5 * rho * V * V * wingArea * CD;
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

// Partículas de flujo de aire - Optimizadas para rendimiento
let flowParticles = [];
let maxParticles = 25; // Reduced from 50 for better performance
let particleTrails = []; // Store particle trail history
let maxTrailLength = 8; // Reduced from 15 for better performance
let lastParticleUpdate = 0; // For frame rate limiting
let particleUpdateInterval = 2; // Update particles every 2 frames

// Control de tamaño de texto
let textSizeMultiplier = 1.0;
let textSizeSlider, textSizeDisplay;

function setup() {
    let canvas = createCanvas(1400, 900);
    canvas.parent('canvas-parent');

    // Enable high-quality rendering
    pixelDensity(2); // Retina display support
    smooth(); // Antialiasing for smoother lines
    
    // Get DOM elements
    velocitySlider = select('#velocity');
    angleSlider = select('#angle');
    altitudeSlider = select('#altitude');
    massSlider = select('#mass');
    wingAreaSlider = select('#wing-area');
    liftDisplay = select('#lift-display');
    dragDisplay = select('#drag-display');
    weightDisplay = select('#weight-display');
    airVelocityDisplay = select('#air-velocity-display');

    // Get coefficient display elements
    clDisplay = select('#clDisplay');
    cdDisplay = select('#cdDisplay');
    ldDisplay = select('#ldDisplay');
    alphaDisplay = select('#alphaDisplay');
    criticalAngleDisplay = select('#criticalAngleDisplay');
    flightStatusDisplay = select('#flightStatusDisplay');
    efficiencyDisplay = select('#efficiencyDisplay');
    

    
    // Initialize text size control
    textSizeSlider = select('#text-size');
    textSizeDisplay = select('#text-size-value');
    
    // Initialize flow particles
    initializeFlowParticles();

    // Set initial values
    updateValues();
    updateTextSize();

    // Add event listeners
    velocitySlider.input(updateValues);
    angleSlider.input(updateValues);
    altitudeSlider.input(updateValues);
    massSlider.input(updateValues);
    wingAreaSlider.input(updateValues);
    textSizeSlider.input(updateTextSize);
}

function updateValues() {
    velocity = velocitySlider.value();
    angleOfAttack = angleSlider.value();
    altitude = altitudeSlider.value();
    aircraftMass = massSlider.value();
    wingArea = wingAreaSlider.value();

    // Update display values with null checks
    if (select('#velocity-value')) select('#velocity-value').html((velocity / 3.6).toFixed(1) + ' m/s');
    if (select('#angle-value')) select('#angle-value').html(angleOfAttack + '°');
    if (select('#altitude-value')) select('#altitude-value').html(altitude + ' m');
    if (select('#mass-value')) select('#mass-value').html(aircraftMass + ' kg');
    if (select('#wing-area-value')) select('#wing-area-value').html(wingArea.toFixed(1) + ' m²');

    // Calculate aerodynamic forces
    const lift = calculateLift(velocity, angleOfAttack, altitude);
    const drag = calculateDrag(velocity, angleOfAttack, altitude);
    const weight = calculateWeight();
    const CL = calculateLiftCoefficient(angleOfAttack);
    const CD = calculateDragCoefficient(angleOfAttack);
    const airDensity = calculateAirDensity(altitude);
    const criticalAngle = calculateCriticalAngle();
    const efficiency = calculateEfficiency(lift, drag);
    const flightStatus = getFlightStatus(lift, weight, angleOfAttack, criticalAngle);

    // Update force displays
    if (liftDisplay) liftDisplay.html(lift.toFixed(0) + ' N');
    if (dragDisplay) dragDisplay.html(drag.toFixed(0) + ' N');
    if (weightDisplay) weightDisplay.html(weight.toFixed(0) + ' N');
    if (airVelocityDisplay) airVelocityDisplay.html((velocity / 3.6).toFixed(1) + ' m/s');

    // Update coefficient displays (with safety checks)
    if (clDisplay) clDisplay.html(CL.toFixed(3));
    if (cdDisplay) cdDisplay.html(CD.toFixed(3));
    if (ldDisplay) ldDisplay.html(efficiency.toFixed(2));
    if (alphaDisplay) alphaDisplay.html(angleOfAttack + '°');
    if (criticalAngleDisplay) criticalAngleDisplay.html(criticalAngle + '°');
    if (flightStatusDisplay) flightStatusDisplay.html(flightStatus);
    if (efficiencyDisplay) efficiencyDisplay.html(efficiency.toFixed(2));

    // Update dynamic calculations panel
    updateDynamicCalculations(lift, drag, weight, CL, CD, airDensity, efficiency, velocity, angleOfAttack, altitude, aircraftMass);
}

function updateDynamicCalculations(lift, drag, weight, CL, CD, airDensity, efficiency, velocity, angleOfAttack, altitude, mass) {
    const velocity_ms = velocity / 3.6; // Convert km/h to m/s



    // Calculate pressure difference using Bernoulli (ΔP = lift / area for consistency)
    const pressure_diff = lift / wingArea;
    const pressure_comparison = pressure_diff > 0 ? 'mayor' : 'menor';

    // Calculate velocities above and below wing using Bernoulli principle
    // Assuming freestream velocity below, and pressure difference gives velocity above
    const velocity_below = velocity_ms; // Freestream velocity (below wing approximation)
    const velocity_above = Math.sqrt(velocity_below * velocity_below + 2 * pressure_diff / airDensity);

    // Update velocity calculation
    const velocityFormula = `v₁ = ${velocity_above.toFixed(1)} m/s (superior), v₂ = ${velocity_below.toFixed(1)} m/s (inferior)`;
    const velocityElement = document.getElementById('velocity-formula');
    if (velocityElement) velocityElement.textContent = velocityFormula;

    const velocityExplanationElement = document.getElementById('velocity-explanation');
    if (velocityExplanationElement) velocityExplanationElement.innerHTML = `<strong>Cálculo:</strong> La velocidad superior es mayor debido a la curvatura del perfil aerodinámico (ángulo de ataque: ${angleOfAttack}°).`;

    // Update pressure difference calculation
    const pressureFormula = `ΔP = P₂ - P₁ = ½ρ(v₁² - v₂²) = ${pressure_diff.toFixed(0)} Pa`;
    const pressureElement = document.getElementById('pressure-formula');
    if (pressureElement) pressureElement.textContent = pressureFormula;

    const pressureExplanationElement = document.getElementById('pressure-explanation');
    if (pressureExplanationElement) pressureExplanationElement.innerHTML = `<strong>Resultado:</strong> Presión ${pressure_comparison} debajo del ala genera fuerza hacia arriba (ρ = ${airDensity.toFixed(3)} kg/m³).`;

    // Update Newton's Third Law calculation
    const newtonFormula = `F↑ = F↓ (sobre el aire) = ${lift.toFixed(0)} N`;
    const newtonElement = document.getElementById('newton-formula');
    if (newtonElement) newtonElement.textContent = newtonFormula;

    const newtonExplanationElement = document.getElementById('newton-explanation');
    if (newtonExplanationElement) newtonExplanationElement.innerHTML = `<strong>Complementario:</strong> El ala desvía el aire hacia abajo, generando una fuerza igual y opuesta hacia arriba.`;

    // Update General Bernoulli Equation section with actual values
    const generalBernoulliHTML = `
        <h4 style="margin: 0 0 10px 0; color: #2e7d32;">📐 Ecuación General de Bernoulli</h4>
        <div class="formula" style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">P + ½ρv² + ρgh = constante</div>
        <p style="font-size: 12px; margin: 5px 0; color: #2e7d32; line-height: 1.4;">
            <strong>Donde:</strong><br>
            P: presión estática del aire (Pa)<br>
            ρ: densidad del aire (${airDensity.toFixed(3)} kg/m³)<br>
            v: velocidad del flujo (${velocity_ms.toFixed(1)} m/s)<br>
            g: gravedad (9.81 m/s²)<br>
            h: altura sobre un punto de referencia (${altitude} m)
        </p>
    `;
    const generalBernoulliDiv = document.querySelector('#calculations-panel > div:nth-child(5)');
    if (generalBernoulliDiv) generalBernoulliDiv.innerHTML = generalBernoulliHTML;

    // Update Airplane Wing Application section with actual values
    const wingApplicationHTML = `
        <h4 style="margin: 0 0 10px 0; color: #e65100;">✈️ Aplicación al Ala de un Avión</h4>
        <p style="font-size: 12px; margin: 5px 0; color: #e65100; line-height: 1.4;">
            En un vuelo recto y nivelado (horizontal), se puede suponer que la altura h no cambia significativamente entre la parte superior e inferior del ala. Por lo tanto, el término ρgh se mantiene constante y puede eliminarse de la comparación:
        </p>
        <div class="formula" style="font-size: 14px; margin: 8px 0;">P + ½ρv² = constante</div>
        <p style="font-size: 12px; margin: 5px 0; color: #e65100;">
            <strong>Ahora comparamos dos puntos en la superficie del ala:</strong><br>
            Punto 1: Parte superior del ala (aire más rápido: ${velocity_above.toFixed(1)} m/s)<br>
            Punto 2: Parte inferior del ala (aire más lento: ${velocity_below.toFixed(1)} m/s)
        </p>
        <div class="formula" style="font-size: 14px; margin: 8px 0;">P₁ + ½ρ(${velocity_above.toFixed(1)})² = P₂ + ½ρ(${velocity_below.toFixed(1)})²</div>
        <p style="font-size: 12px; margin: 5px 0; color: #e65100;">
            Reordenando para hallar la diferencia de presiones:
        </p>
        <div class="formula" style="font-size: 14px; margin: 8px 0; color: #d32f2f;">ΔP = P₂ - P₁ = ½ρ((${velocity_above.toFixed(1)})² - (${velocity_below.toFixed(1)})²) = ${pressure_diff.toFixed(0)} Pa</div>
        <p style="font-size: 12px; margin: 5px 0; color: #e65100; font-weight: bold;">
            Esa diferencia de presiones genera una fuerza hacia arriba: la sustentación (${lift.toFixed(0)} N).
        </p>
    `;
    const wingApplicationDiv = document.querySelector('#calculations-panel > div:nth-child(6)');
    if (wingApplicationDiv) wingApplicationDiv.innerHTML = wingApplicationHTML;

    // Update Practical Example section with actual values
    const practicalExampleHTML = `
        <h4 style="margin: 0 0 10px 0; color: #c2185b;">🔢 Ejemplo Práctico</h4>
        <div style="background: #f8f8f8; padding: 10px; border-radius: 5px; margin: 8px 0;">
            <div style="font-size: 12px; margin-bottom: 5px;"><strong>Datos actuales de la simulación:</strong></div>
            <div style="font-size: 12px; margin: 2px 0;">ρ = ${airDensity.toFixed(3)} kg/m³</div>
            <div style="font-size: 12px; margin: 2px 0;">v₁ = ${velocity_above.toFixed(1)} m/s (sobre el ala)</div>
            <div style="font-size: 12px; margin: 2px 0;">v₂ = ${velocity_below.toFixed(1)} m/s (bajo el ala)</div>
        </div>
        <div class="formula" style="font-size: 14px; margin: 8px 0;">ΔP = ½ × ${airDensity.toFixed(3)} × ((${velocity_above.toFixed(1)})² - (${velocity_below.toFixed(1)})²) = ½ × ${airDensity.toFixed(3)} × (${(velocity_above*velocity_above - velocity_below*velocity_below).toFixed(0)}) = ${pressure_diff.toFixed(0)} Pa</div>
        <p style="font-size: 12px; margin: 5px 0; color: #c2185b; font-weight: bold;">
            <strong>Resultado:</strong> La presión es ${pressure_comparison} debajo del ala → fuerza neta hacia arriba (${lift.toFixed(0)} N).
        </p>
    `;
    const practicalExampleDiv = document.querySelector('#calculations-panel > div:nth-child(7)');
    if (practicalExampleDiv) practicalExampleDiv.innerHTML = practicalExampleHTML;


}

function updateTextSize() {
    textSizeMultiplier = textSizeSlider.value();
    textSizeDisplay.html(textSizeMultiplier.toFixed(1) + 'x');
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

    // Enhanced sky background with time-of-day lighting
    let skyR = map(sunAngle, -PI/3, PI/3, 50, 135);
    let skyG = map(sunAngle, -PI/3, PI/3, 100, 206);
    let skyB = map(sunAngle, -PI/3, PI/3, 150, 235);

    for (let y = 0; y < height; y++) {
        let alpha = map(y, 0, height * 0.7, 255, 200);
        let brightness = map(sunAngle, -PI/3, PI/3, 0.6, 1.0);
        stroke(skyR * brightness, skyG * brightness, skyB * brightness, alpha);
        line(0, y, width, y);
    }

    // Draw enhanced clouds with atmospheric effects
    drawEnhancedClouds();

    // Draw condensation trails if at high altitude and fast
    if (altitude > 8000 && velocity > 80) {
        drawCondensationTrails();
    }

    // Draw enhanced terrain and landscape
    drawTerrainAndLandscape();

    // Draw trees for enhanced scenery
    drawTrees();

    // Update and draw flow particles - Optimizado para rendimiento
    updateFlowParticles();
    drawFlowParticles();

    // Calculate physics
    let lift = calculateLift(velocity, angleOfAttack, altitude);
    let drag = calculateDrag(velocity, angleOfAttack, altitude);
    let weight = calculateWeight();

    // Update displays
    if (liftDisplay) liftDisplay.html(lift.toFixed(1) + ' N');
    if (dragDisplay) dragDisplay.html(drag.toFixed(1) + ' N');
    if (weightDisplay) weightDisplay.html(weight.toFixed(1) + ' N');
    if (airVelocityDisplay) airVelocityDisplay.html(velocity.toFixed(1) + ' m/s');

    // Draw complete airplane with lighting effects
    drawCompleteAirplaneWithLighting();

    // Draw Bernoulli pressure visualization (air flows above/below wing)
    drawBernoulliPressureZones();

    // Draw velocity comparison above/below wing (air flows)
    drawVelocityComparison();

    // Draw force vectors
    drawEnhancedForceVectors(lift, drag, weight);



    // Draw title label with better styling
    drawTitleLabel();

    // Draw reference point with glow
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
}

function drawEnhancedForceVectors(lift, drag, weight) {
    push();
    translate(width/2, height/2);

    let scale = 0.008;
    let vectorAlpha = 220;

    // Add glow effect background
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = 'rgba(255, 255, 255, 0.3)';

    // Lift vector (green, upward) with enhanced styling
    drawingContext.shadowColor = 'rgba(0, 255, 0, 0.5)';
    stroke(0, 255, 0, vectorAlpha);
    strokeWeight(5);
    fill(0, 255, 0, vectorAlpha);
    let liftLength = lift * scale;
    line(0, 0, 0, -liftLength);
    // Enhanced arrow head with glow
    triangle(0, -liftLength, -4, -liftLength + 10, 4, -liftLength + 10);
    // Label with background - positioned higher and larger
    fill(0, 50, 0, 220);
    noStroke();
    rect(-45, -liftLength - 60, 90, 28, 5);
    fill(0, 255, 0);
    textAlign(CENTER);
    textStyle(BOLD);
    textSize(24 * textSizeMultiplier);
    text('Sustentación', 0, -liftLength - 42);

    // Drag vector (red, backward) with enhanced styling
    drawingContext.shadowColor = 'rgba(255, 0, 0, 0.5)';
    stroke(255, 0, 0, vectorAlpha);
    strokeWeight(5);
    fill(255, 0, 0, vectorAlpha);
    let dragLength = drag * scale;
    line(0, 0, -dragLength, 0);
    triangle(-dragLength, 0, -dragLength + 10, -4, -dragLength + 10, 4);
    // Label with background - positioned below to avoid overlap
    fill(50, 0, 0, 220);
    noStroke();
    rect(-dragLength - 85, 10, 70, 28, 5);
    fill(255, 0, 0);
    textAlign(RIGHT);
    textStyle(BOLD);
    textSize(24 * textSizeMultiplier);
    text('Resistencia', -dragLength - 20, 28);

    // Weight vector (orange, downward) with enhanced styling
    drawingContext.shadowColor = 'rgba(255, 165, 0, 0.5)';
    stroke(255, 165, 0, vectorAlpha);
    strokeWeight(5);
    fill(255, 165, 0, vectorAlpha);
    let weightLength = weight * scale;
    line(0, 0, 0, weightLength);
    triangle(0, weightLength, -4, weightLength - 10, 4, weightLength - 10);
    // Label with background - positioned lower and larger
    fill(50, 25, 0, 220);
    noStroke();
    rect(-40, weightLength + 15, 80, 28, 5);
    fill(255, 165, 0);
    textAlign(CENTER);
    textStyle(BOLD);
    textSize(24 * textSizeMultiplier);
    text('Peso', 0, weightLength + 35);

    // Reset shadow
    drawingContext.shadowBlur = 0;

    pop();
}

function drawTurbulenceEffects() {
    push();
    translate(width/2, height/2);
    scale(2.5);

    // Create turbulence particles around the wing
    let turbulenceIntensity = map(abs(angleOfAttack), 12, 20, 0.5, 2.0);

    for (let i = 0; i < 8; i++) {
        let angle = (i / 8) * TWO_PI + frameCount * 0.1;
        let radius = 30 + sin(frameCount * 0.2 + i) * 10;
        let x = cos(angle) * radius;
        let y = sin(angle) * radius;

        // Turbulence particles
        fill(150, 150, 255, 100 + sin(frameCount * 0.3 + i * 0.5) * 50);
        noStroke();
        ellipse(x, y, 3 + turbulenceIntensity, 3 + turbulenceIntensity);

        // Small vortices
        if (i % 2 === 0) {
            stroke(100, 150, 255, 80);
            strokeWeight(1);
            noFill();
            let vortexSize = 8 + turbulenceIntensity * 2;
            ellipse(x, y, vortexSize, vortexSize);
        }
    }

    pop();
}

// Draw complete airplane with advanced lighting effects
function drawCompleteAirplaneWithLighting() {
    push();
    translate(width/2, height/2);
    scale(2.5); // Much bigger airplane

    // ===== CALCULATE LIGHTING PARAMETERS =====
    // Sun direction vector (from sun angle)
    let sunDirectionX = cos(sunAngle);
    let sunDirectionY = sin(sunAngle);

    // Light intensity based on sun angle (higher when sun is overhead)
    let lightIntensity = map(abs(sunAngle), 0, PI/3, 1.0, 0.4);

    // Shadow offset based on sun direction
    let shadowOffsetX = sunDirectionX * 15 * lightIntensity;
    let shadowOffsetY = sunDirectionY * 8 * lightIntensity;

    // Calculate wing rotation based on angle of attack
    let wingRotation = angleOfAttack * PI / 180 * 0.3;

    // ===== DRAW SHADOWS FIRST (behind everything) =====
    push();
    translate(shadowOffsetX, shadowOffsetY);

    // Shadow color and transparency
    fill(0, 0, 0, 80 * lightIntensity);
    noStroke();

    // Fuselage shadow
    beginShape();
    vertex(-50, -5);
    bezierVertex(-30, -8, -10, -8, 20, -6);
    bezierVertex(40, -4, 60, -2, 80, 0);
    bezierVertex(100, 2, 120, 4, 140, 6);
    bezierVertex(150, 8, 160, 10, 170, 12);
    bezierVertex(160, 15, 150, 18, 140, 20);
    bezierVertex(120, 18, 100, 16, 80, 14);
    bezierVertex(60, 12, 40, 10, 20, 8);
    bezierVertex(-10, 6, -30, 4, -50, 2);
    endShape(CLOSE);

    // Wing shadows
    push();
    translate(40, -10);
    rotate(wingRotation);

    // Right wing shadow
    beginShape();
    vertex(0, 0);
    bezierVertex(15, -12, 50, -22, 110, -18);
    bezierVertex(130, -13, 150, -8, 170, -3);
    bezierVertex(150, 2, 130, 7, 110, 10);
    bezierVertex(50, 14, 15, 10, 0, 4);
    endShape(CLOSE);

    // Left wing shadow
    beginShape();
    vertex(0, 0);
    bezierVertex(15, 12, 50, 22, 110, 18);
    bezierVertex(130, 13, 150, 8, 170, 3);
    bezierVertex(150, -2, 130, -7, 110, -10);
    bezierVertex(50, -14, 15, -10, 0, -4);
    endShape(CLOSE);

    pop(); // End wing shadow transformation

    pop(); // End shadow transformation

    // ===== FUSELAJE (FUSELAGE) WITH LIGHTING =====
    // Calculate lighting for fuselage (simplified - assumes cylindrical shape)
    let fuselageLight = 0.6 + 0.4 * abs(cos(sunAngle)); // More light when sun is high

    fill(200 * fuselageLight, 200 * fuselageLight, 200 * fuselageLight);
    stroke(100 * fuselageLight, 100 * fuselageLight, 100 * fuselageLight);
    strokeWeight(2);

    // Main fuselage body - cylindrical shape
    beginShape();
    vertex(-50, -5);
    bezierVertex(-30, -8, -10, -8, 20, -6);
    bezierVertex(40, -4, 60, -2, 80, 0);
    bezierVertex(100, 2, 120, 4, 140, 6);
    bezierVertex(150, 8, 160, 10, 170, 12);
    bezierVertex(160, 15, 150, 18, 140, 20);
    bezierVertex(120, 18, 100, 16, 80, 14);
    bezierVertex(60, 12, 40, 10, 20, 8);
    bezierVertex(-10, 6, -30, 4, -50, 2);
    endShape(CLOSE);

    // Cockpit windows with reflections
    let windowLight = fuselageLight * 1.2; // Windows are more reflective
    fill(100 * windowLight, 150 * windowLight, 200 * windowLight, 150);
    stroke(50 * windowLight, 100 * windowLight, 150 * windowLight);
    strokeWeight(1);
    ellipse(-20, -6, 25, 8); // Main cockpit
    ellipse(0, -5, 20, 6); // Secondary window

    // Landing gear with lighting
    stroke(80 * fuselageLight, 80 * fuselageLight, 80 * fuselageLight);
    strokeWeight(3);
    line(-35, 8, -35, 15);
    line(-38, 15, -32, 15);
    line(30, 12, 30, 20);
    line(25, 20, 35, 20);
    line(70, 14, 70, 22);
    line(65, 22, 75, 22);

    // ===== ALAS PRINCIPALES (MAIN WINGS) WITH ADVANCED LIGHTING =====
    push();
    translate(40, -10);
    rotate(wingRotation);

    // Calculate wing lighting based on sun angle and wing orientation
    let wingNormalX = sin(wingRotation); // Wing surface normal
    let wingNormalY = -cos(wingRotation);

    // Dot product for lighting calculation
    let wingLightDot = wingNormalX * sunDirectionX + wingNormalY * sunDirectionY;
    let wingLight = constrain(0.3 + 0.7 * (wingLightDot + 1) * 0.5, 0.3, 1.0);

    // Specular highlight for metallic surfaces
    let specularIntensity = pow(max(0, wingLightDot), 8) * lightIntensity;
    let specularColor = [255, 255, 255, specularIntensity * 200];

    // Right wing with lighting
    fill(255 * wingLight, 255 * wingLight, 255 * wingLight);
    stroke(50 * wingLight, 50 * wingLight, 50 * wingLight);
    strokeWeight(3);

    beginShape();
    vertex(0, 0);
    bezierVertex(15, -12, 50, -22, 110, -18);
    bezierVertex(130, -13, 150, -8, 170, -3);
    bezierVertex(150, 2, 130, 7, 110, 10);
    bezierVertex(50, 14, 15, 10, 0, 4);
    endShape(CLOSE);

    // Add specular highlight on right wing
    if (specularIntensity > 0.1) {
        fill(specularColor[0], specularColor[1], specularColor[2], specularColor[3]);
        noStroke();
        ellipse(80, -15, 30 * specularIntensity, 15 * specularIntensity);
    }

    // Left wing with lighting (mirror calculations)
    let leftWingLightDot = -wingNormalX * sunDirectionX + wingNormalY * sunDirectionY; // Mirror normal
    let leftWingLight = constrain(0.3 + 0.7 * (leftWingLightDot + 1) * 0.5, 0.3, 1.0);
    let leftSpecularIntensity = pow(max(0, leftWingLightDot), 8) * lightIntensity;

    fill(255 * leftWingLight, 255 * leftWingLight, 255 * leftWingLight);
    stroke(50 * leftWingLight, 50 * leftWingLight, 50 * leftWingLight);
    strokeWeight(3);

    beginShape();
    vertex(0, 0);
    bezierVertex(15, 12, 50, 22, 110, 18);
    bezierVertex(130, 13, 150, 8, 170, 3);
    bezierVertex(150, -2, 130, -7, 110, -10);
    bezierVertex(50, -14, 15, -10, 0, -4);
    endShape(CLOSE);

    // Add specular highlight on left wing
    if (leftSpecularIntensity > 0.1) {
        fill(255, 255, 255, leftSpecularIntensity * 200);
        noStroke();
        ellipse(80, 15, 30 * leftSpecularIntensity, 15 * leftSpecularIntensity);
    }

    // Wing details with lighting
    stroke(60 * wingLight, 60 * wingLight, 60 * wingLight);
    strokeWeight(1);
    line(20, -8, 140, -5); // Right wing spar
    line(20, 8, 140, 5); // Left wing spar

    // Flaps with lighting
    fill(150 * wingLight, 150 * wingLight, 150 * wingLight);
    noStroke();
    rect(130, -8, 25, 6, 2); // Right flap
    rect(130, 2, 25, 6, 2); // Left flap

    // Ailerons with lighting
    fill(120 * wingLight, 120 * wingLight, 120 * wingLight);
    rect(155, -6, 20, 4, 1); // Right aileron
    rect(155, 2, 20, 4, 1); // Left aileron

    pop(); // End wing transformation

    // ===== COLA (TAIL) WITH LIGHTING =====
    let tailLight = fuselageLight * 0.9; // Tail gets slightly less light

    // Vertical stabilizer
    fill(180 * tailLight, 180 * tailLight, 180 * tailLight);
    stroke(100 * tailLight, 100 * tailLight, 100 * tailLight);
    strokeWeight(2);
    beginShape();
    vertex(150, -20);
    vertex(155, -40);
    vertex(165, -38);
    vertex(160, -18);
    endShape(CLOSE);

    // Rudder
    fill(140 * tailLight, 140 * tailLight, 140 * tailLight);
    beginShape();
    vertex(160, -38);
    vertex(165, -55);
    vertex(175, -53);
    vertex(170, -36);
    endShape(CLOSE);

    // Horizontal stabilizer
    fill(200 * tailLight, 200 * tailLight, 200 * tailLight);
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

    // Elevator
    fill(120 * tailLight, 120 * tailLight, 120 * tailLight);
    beginShape();
    vertex(175, -25);
    vertex(190, -24);
    vertex(195, -19);
    vertex(180, -20);
    endShape(CLOSE);

    // ===== DETALLES ADICIONALES CON ILUMINACIÓN =====
    // Engine nacelles with lighting
    fill(160 * fuselageLight, 160 * fuselageLight, 160 * fuselageLight);
    stroke(80 * fuselageLight, 80 * fuselageLight, 80 * fuselageLight);
    strokeWeight(1);
    ellipse(20, -12, 15, 8); // Right engine
    ellipse(20, 12, 15, 8); // Left engine

    // Engine exhaust with glow effect
    fill(100 * fuselageLight, 100 * fuselageLight, 100 * fuselageLight);
    ellipse(35, -12, 8, 6);
    ellipse(35, 12, 8, 6);

    // Winglets with lighting
    stroke(120 * wingLight, 120 * wingLight, 120 * wingLight);
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

    // Antennas and sensors with lighting
    stroke(255 * lightIntensity, 0, 0);
    strokeWeight(2);
    line(-45, -8, -50, -12); // VHF antenna
    line(170, -25, 175, -30); // Tail antenna

    // ===== NAVIGATION LIGHTS =====
    // Red navigation light (left wing tip) - always visible
    fill(255, 0, 0);
    noStroke();
    ellipse(175, 8, 6, 6);
    // Light glow
    fill(255, 0, 0, 100);
    ellipse(175, 8, 12, 12);

    // Green navigation light (right wing tip) - always visible
    fill(0, 255, 0);
    noStroke();
    ellipse(175, -8, 6, 6);
    // Light glow
    fill(0, 255, 0, 100);
    ellipse(175, -8, 12, 12);

    // White strobe light (tail) - pulsing effect
    let strobeIntensity = sin(frameCount * 0.3) > 0.8 ? 255 : 100;
    fill(strobeIntensity, strobeIntensity, strobeIntensity);
    noStroke();
    ellipse(175, -25, 4, 4);
    // Light glow
    fill(strobeIntensity, strobeIntensity, strobeIntensity, 150);
    ellipse(175, -25, 10, 10);

    // Anti-collision beacon (top of tail) - flashing red
    let beaconIntensity = sin(frameCount * 0.5) > 0.9 ? 255 : 50;
    fill(beaconIntensity, 0, 0);
    noStroke();
    ellipse(160, -42, 5, 5);
    // Light glow
    fill(beaconIntensity, 0, 0, 120);
    ellipse(160, -42, 12, 12);

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

// Update flow particles - Optimizado para rendimiento
function updateFlowParticles() {
    // Frame rate limiting - only update particles every few frames
    if (frameCount - lastParticleUpdate < particleUpdateInterval) {
        return;
    }
    lastParticleUpdate = frameCount;

    // Process only half the particles per update for better performance
    let startIndex = frameCount % 2 === 0 ? 0 : Math.floor(flowParticles.length / 2);
    let endIndex = frameCount % 2 === 0 ? Math.floor(flowParticles.length / 2) : flowParticles.length;

    for (let i = startIndex; i < endIndex; i++) {
        let p = flowParticles[i];
        if (!p) continue; // Safety check

        // Update position with reduced calculations
        p.x += p.vx * 0.8; // Slightly slower for performance
        p.y += p.vy * 0.8;

        // Add to trail less frequently
        if (frameCount % 3 === 0) {
            p.trail.push({x: p.x, y: p.y});
            if (p.trail.length > maxTrailLength) {
                p.trail.shift();
            }
        }

        // Age particle
        p.age++;

        // Reset particle if it goes off screen or ages out - optimized bounds
        if (p.x > width/2 + 150 || p.age > p.maxAge) {
            if (p.surface === 'upper') {
                p.x = -200;
                p.y = random(-45, -20);
                p.age = 0;
                p.trail = [];
            } else {
                p.x = -200;
                p.y = random(20, 45);
                p.age = 0;
                p.trail = [];
            }
        }
    }
}

// Draw flow particles - Optimizado para rendimiento
function drawFlowParticles() {
    // Performance optimization: skip drawing if too many particles
    if (flowParticles.length > maxParticles) return;

    noStroke();

    // Batch render particles for better performance
    for (let i = 0; i < flowParticles.length; i++) {
        let p = flowParticles[i];
        if (!p) continue;

        // Draw particle with optimized alpha
        let alpha = map(p.age, 0, p.maxAge, 200, 50);
        fill(p.color[0], p.color[1], p.color[2], alpha);
        ellipse(p.x, p.y, p.size, p.size);

        // Draw trail with reduced opacity for performance
        if (p.trail && p.trail.length > 0) {
            beginShape();
            for (let j = 0; j < p.trail.length; j++) {
                let trailPoint = p.trail[j];
                let trailAlpha = map(j, 0, p.trail.length - 1, alpha * 0.8, 10);
                stroke(p.color[0], p.color[1], p.color[2], trailAlpha);
                strokeWeight(1);
                vertex(trailPoint.x, trailPoint.y);
            }
            endShape();
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
// Draw title label
function drawTitleLabel() {
    // Title removed
}

// Draw reference point on leading edge
function drawReferencePoint() {
    push();
    translate(width/2 - 150, height/2);

    // Reference point
    fill(255, 0, 0);
    stroke(255);
    strokeWeight(2);
    ellipse(0, 0, 10, 10);

    // Label with background - positioned above to avoid overlap
    fill(100, 0, 0, 220);
    noStroke();
    rect(12, -45, 120, 28, 5);
    fill(255, 0, 0);
    textAlign(LEFT);
    textStyle(BOLD);
    textSize(20 * textSizeMultiplier);
    text('Borde de Ataque', 18, -29);

    pop();
}

function drawEnhancedClouds() {
    let cloudOffset = frameCount * 0.02;

    // Enhanced volumetric clouds with better layering
    // Cloud 1 - large, slow moving with volume
    push();
    translate(150 + sin(cloudOffset) * 20, 80);
    // Base layer
    fill(255, 255, 255, 180);
    noStroke();
    ellipse(0, 0, 120, 70);
    ellipse(40, -10, 100, 60);
    ellipse(-30, 10, 90, 50);
    ellipse(20, 15, 80, 45);
    // Highlight layer for volume
    fill(255, 255, 255, 120);
    ellipse(-10, -5, 80, 40);
    ellipse(25, 5, 60, 30);
    pop();

    // Cloud 2 - medium, medium speed with turbulence
    push();
    translate(350 + sin(cloudOffset * 0.8) * 15, 110);
    let turbulence = sin(cloudOffset * 2) * 3;
    fill(255, 255, 255, 160);
    noStroke();
    ellipse(0 + turbulence, 0, 90, 55);
    ellipse(30 + turbulence * 0.5, -5, 75, 45);
    ellipse(-20 - turbulence * 0.3, 8, 70, 40);
    // Add some wispy edges
    fill(255, 255, 255, 100);
    ellipse(45, -15, 40, 20);
    pop();

    // Cloud 3 - small, fast moving with dynamic shape
    push();
    translate(550 + sin(cloudOffset * 1.2) * 25, 140);
    let shapeOffset = sin(cloudOffset * 3) * 5;
    fill(255, 255, 255, 140);
    noStroke();
    ellipse(0, 0, 70 + shapeOffset, 40);
    ellipse(20 + shapeOffset * 0.5, -3, 55, 35);
    ellipse(-15 - shapeOffset * 0.3, 5, 50, 30);
    pop();

    // Cloud 4 - wispy, high altitude with atmospheric perspective
    push();
    translate(200 + sin(cloudOffset * 0.5) * 10, 160);
    fill(240, 248, 255, 120);
    noStroke();
    ellipse(0, 0, 150, 30);
    ellipse(50, 5, 120, 25);
    ellipse(-40, -3, 100, 20);
    // Add cirrus-like streaks
    stroke(240, 248, 255, 80);
    strokeWeight(2);
    noFill();
    beginShape();
    vertex(-80, -5);
    bezierVertex(-60, -10, -40, -8, -20, -5);
    bezierVertex(0, -3, 20, -5, 40, -8);
    endShape();
    pop();

    // Cloud 5 - distant, very high altitude
    push();
    translate(600 + sin(cloudOffset * 0.3) * 8, 180);
    fill(245, 250, 255, 80);
    noStroke();
    ellipse(0, 0, 200, 20);
    ellipse(60, 3, 150, 15);
    ellipse(-50, -2, 130, 18);
    pop();

    // Cloud 6 - mid altitude
    push();
    translate(250 + sin(cloudOffset * 0.6) * 12, 130);
    fill(255, 255, 255, 160);
    noStroke();
    ellipse(0, 0, 100, 55);
    ellipse(30, -5, 80, 45);
    ellipse(-20, 8, 70, 40);
    pop();

    // Cloud 7 - fast moving
    push();
    translate(450 + sin(cloudOffset * 1.5) * 30, 150);
    fill(255, 255, 255, 140);
    noStroke();
    ellipse(0, 0, 80, 45);
    ellipse(25, -3, 60, 35);
    ellipse(-15, 5, 55, 30);
    pop();

    // Cloud 8 - wispy high
    push();
    translate(100 + sin(cloudOffset * 0.4) * 8, 170);
    fill(240, 248, 255, 100);
    noStroke();
    ellipse(0, 0, 180, 25);
    ellipse(55, 4, 140, 20);
    ellipse(-45, -2, 120, 22);
    pop();

    // Additional clouds for more density
    // Cloud 9 - medium altitude, slow moving
    push();
    translate(50 + sin(cloudOffset * 0.3) * 10, 140);
    fill(255, 255, 255, 170);
    noStroke();
    ellipse(0, 0, 85, 50);
    ellipse(25, -5, 65, 40);
    ellipse(-20, 7, 60, 35);
    pop();

    // Cloud 10 - high altitude, wispy
    push();
    translate(650 + sin(cloudOffset * 0.7) * 15, 190);
    fill(240, 248, 255, 90);
    noStroke();
    ellipse(0, 0, 160, 25);
    ellipse(45, 4, 130, 20);
    ellipse(-40, -2, 110, 18);
    pop();

    // Cloud 11 - low altitude, puffy
    push();
    translate(300 + sin(cloudOffset * 1.1) * 20, 90);
    fill(255, 255, 255, 190);
    noStroke();
    ellipse(0, 0, 95, 55);
    ellipse(30, -8, 75, 45);
    ellipse(-25, 10, 70, 40);
    ellipse(15, 12, 55, 30);
    pop();

    // Cloud 12 - fast moving, small
    push();
    translate(700 + sin(cloudOffset * 1.8) * 35, 160);
    fill(255, 255, 255, 150);
    noStroke();
    ellipse(0, 0, 65, 38);
    ellipse(18, -4, 50, 32);
    ellipse(-12, 6, 45, 28);
    pop();
}

function drawTerrainAndLandscape() {
    let groundY = height - 80;

    // ===== TEXTURA DEL SUELO =====
    // Base ground with texture variation
    for (let x = 0; x < width; x += 4) {
        let variation = sin(x * 0.01) * 2 + random(-1, 1);
        let groundColor = map(variation, -3, 3, 25, 45); // Darker to lighter green

        stroke(34 + groundColor, 139 + groundColor * 0.5, 34 + groundColor * 0.3);
        strokeWeight(4);
        line(x, groundY, x, groundY + 80);
    }

    // Add grass texture details
    for (let i = 0; i < 200; i++) {
        let x = random(width);
        let y = groundY + random(5, 15);
        let grassLength = random(3, 8);

        stroke(25, 120, 25, 150);
        strokeWeight(1);
        line(x, y, x + random(-2, 2), y - grassLength);
    }

    // Add small rocks and dirt patches
    for (let i = 0; i < 50; i++) {
        let x = random(width);
        let y = groundY + random(10, 30);
        let size = random(2, 6);

        fill(80, 60, 40, 200);
        noStroke();
        ellipse(x, y, size, size * 0.7);
    }

    // ===== COLINAS Y ELEVACIONES =====
    // Draw rolling hills in the background
    drawHills();

    // ===== RÍOS Y LAGOS =====
    // Draw winding river
    drawRiver();

    // ===== EDIFICIOS Y ESTRUCTURAS =====
    // Draw airport structures
    drawAirportStructures();
}

function drawHills() {
    // Background hills with snow caps
    let hillBaseY = height - 60;

    // Hill 1 - gentle slope
    fill(34, 139, 34, 200);
    stroke(25, 120, 25);
    strokeWeight(2);
    beginShape();
    vertex(0, height);
    bezierVertex(100, hillBaseY - 20, 200, hillBaseY - 30, 300, hillBaseY - 15);
    bezierVertex(400, hillBaseY - 25, 500, hillBaseY - 35, 600, hillBaseY - 20);
    vertex(600, height);
    endShape(CLOSE);

    // Hill 2 - steeper
    fill(45, 160, 45, 180);
    stroke(35, 130, 35);
    beginShape();
    vertex(400, height);
    bezierVertex(500, hillBaseY - 40, 600, hillBaseY - 60, 700, hillBaseY - 45);
    bezierVertex(800, hillBaseY - 55, 900, hillBaseY - 65, 1000, hillBaseY - 50);
    vertex(1000, height);
    endShape(CLOSE);

    // Hill 3 - distant mountain with snow cap
    fill(60, 180, 60, 150);
    stroke(50, 150, 50);
    beginShape();
    vertex(800, height);
    bezierVertex(900, hillBaseY - 70, 1000, hillBaseY - 90, 1100, hillBaseY - 75);
    bezierVertex(1200, hillBaseY - 85, 1300, hillBaseY - 95, 1400, hillBaseY - 80);
    vertex(1400, height);
    endShape(CLOSE);

    // Snow caps on distant mountains
    fill(255, 255, 255, 200);
    noStroke();
    beginShape();
    vertex(950, hillBaseY - 85);
    bezierVertex(1000, hillBaseY - 95, 1050, hillBaseY - 100, 1100, hillBaseY - 90);
    bezierVertex(1150, hillBaseY - 95, 1200, hillBaseY - 100, 1250, hillBaseY - 95);
    vertex(1250, hillBaseY - 80);
    bezierVertex(1200, hillBaseY - 75, 1150, hillBaseY - 70, 1100, hillBaseY - 75);
    bezierVertex(1050, hillBaseY - 70, 1000, hillBaseY - 75, 950, hillBaseY - 80);
    endShape(CLOSE);
}

function drawRiver() {
    let riverY = height - 40;

    // River path with gentle curves
    stroke(30, 100, 200, 180);
    strokeWeight(12);
    noFill();
    beginShape();
    for (let x = -50; x < width + 50; x += 10) {
        let y = riverY + sin(x * 0.01) * 8 + sin(x * 0.03) * 4;
        vertex(x, y);
    }
    endShape();

    // River water with animation
    let waterAnimation = sin(frameCount * 0.1) * 2;
    stroke(50, 150, 255, 120);
    strokeWeight(8);
    beginShape();
    for (let x = -50; x < width + 50; x += 8) {
        let y = riverY + sin(x * 0.01) * 8 + sin(x * 0.03) * 4 + waterAnimation;
        vertex(x, y);
    }
    endShape();

    // River reflections (lighter blue)
    stroke(100, 200, 255, 80);
    strokeWeight(4);
    beginShape();
    for (let x = -50; x < width + 50; x += 15) {
        let y = riverY + sin(x * 0.01) * 8 + sin(x * 0.03) * 4 - 3;
        vertex(x, y);
    }
    endShape();

    // River banks (green edges)
    stroke(25, 120, 25, 150);
    strokeWeight(2);
    beginShape();
    for (let x = -50; x < width + 50; x += 10) {
        let y = riverY + sin(x * 0.01) * 8 + sin(x * 0.03) * 4 + 8;
        vertex(x, y);
    }
    endShape();
}

function drawAirportStructures() {
    let groundY = height - 80;

    // ===== RUNWAY =====
    // Main runway
    fill(80, 80, 80);
    stroke(100, 100, 100);
    strokeWeight(2);
    rect(width/2 - 150, groundY - 10, 300, 20);

    // Runway center line (dashed)
    stroke(255, 255, 255);
    strokeWeight(3);
    for (let x = width/2 - 140; x < width/2 + 140; x += 20) {
        line(x, groundY, x + 10, groundY);
    }

    // Runway threshold markings
    fill(255, 255, 255);
    noStroke();
    rect(width/2 - 150, groundY - 8, 5, 16); // Left threshold
    rect(width/2 + 145, groundY - 8, 5, 16); // Right threshold

    // ===== CONTROL TOWER =====
    let towerX = width/2 + 200;
    let towerY = groundY - 60;

    // Tower base
    fill(150, 150, 150);
    stroke(100, 100, 100);
    strokeWeight(2);
    rect(towerX - 8, towerY, 16, 60);

    // Tower cabin
    fill(200, 200, 200);
    stroke(150, 150, 150);
    rect(towerX - 12, towerY - 15, 24, 15);

    // Tower windows
    fill(100, 150, 200, 150);
    noStroke();
    rect(towerX - 10, towerY - 12, 6, 8);
    rect(towerX + 4, towerY - 12, 6, 8);

    // Antenna
    stroke(50, 50, 50);
    strokeWeight(2);
    line(towerX, towerY - 15, towerX, towerY - 25);

    // ===== HANGAR =====
    let hangarX = width/2 - 250;
    let hangarY = groundY - 40;

    // Hangar main building
    fill(120, 120, 120);
    stroke(80, 80, 80);
    strokeWeight(2);
    rect(hangarX, hangarY, 80, 40);

    // Hangar roof
    fill(100, 100, 100);
    triangle(hangarX, hangarY, hangarX + 40, hangarY - 20, hangarX + 80, hangarY);

    // Hangar door (large opening)
    fill(60, 60, 60);
    noStroke();
    rect(hangarX + 30, hangarY + 10, 20, 25);

    // ===== TERMINAL BUILDING =====
    let terminalX = width/2 + 80;
    let terminalY = groundY - 25;

    // Terminal main building
    fill(180, 180, 180);
    stroke(120, 120, 120);
    strokeWeight(2);
    rect(terminalX, terminalY, 60, 25);

    // Terminal roof
    fill(140, 140, 140);
    triangle(terminalX, terminalY, terminalX + 30, terminalY - 15, terminalX + 60, terminalY);

    // Terminal windows
    fill(100, 150, 200, 150);
    noStroke();
    for (let i = 0; i < 3; i++) {
        rect(terminalX + 5 + i * 18, terminalY + 5, 12, 8);
    }

    // Terminal entrance
    fill(80, 80, 80);
    rect(terminalX + 25, terminalY + 15, 10, 10);

    // ===== FUEL TANKS =====
    let fuelX = width/2 - 320;
    let fuelY = groundY - 15;

    // Fuel tank 1
    fill(200, 200, 200);
    stroke(150, 150, 150);
    strokeWeight(1);
    ellipse(fuelX, fuelY, 20, 15);
    rect(fuelX - 10, fuelY, 20, 10);

    // Fuel tank 2
    ellipse(fuelX + 30, fuelY, 20, 15);
    rect(fuelX + 20, fuelY, 20, 10);

    // Fuel tank labels
    fill(255, 0, 0);
    textAlign(CENTER);
    textSize(8 * textSizeMultiplier);
    text('FUEL', fuelX, fuelY - 12);
    text('FUEL', fuelX + 30, fuelY - 12);
}

function drawTrees() {
    // Draw various trees along the ground for enhanced scenery (static, no animation)
    let groundY = height - 80;

    // Define tree positions with variable density (pre-calculated for consistency)
    let treePositions = [
        {x: 100, type: 'oak', show: true},       // Dense forest area start
        {x: 180, type: 'pine', show: true},      // Transition
        {x: 250, type: 'pine', show: true},
        {x: 320, type: 'bush', show: false},     // Sparse area - skip some
        {x: 400, type: 'bush', show: true},
        {x: 500, type: 'tall', show: false},     // Very sparse - skip
        {x: 550, type: 'tall', show: true},
        {x: 650, type: 'spreading', show: true}, // Dense again
        {x: 700, type: 'spreading', show: true},
        {x: 780, type: 'rounded', show: true},  // Dense forest area
        {x: 850, type: 'rounded', show: true},
        {x: 920, type: 'small', show: true},
        {x: 1000, type: 'small', show: true},
        {x: 1080, type: 'pine_var', show: false}, // Sparse transition - skip
        {x: 1150, type: 'pine_var', show: true},
        {x: 1240, type: 'bushy', show: false},   // Sparse area - skip
        {x: 1300, type: 'bushy', show: true},
        {x: 1380, type: 'slender', show: false}  // Very sparse end - skip
    ];

    // Draw trees statically (no animation)
    for (let i = 0; i < treePositions.length; i++) {
        let tree = treePositions[i];

        // Only show trees marked to be visible
        if (!tree.show) continue;

        drawStaticTree(tree.x, groundY, tree.type);
    }

    // Add some additional scattered trees in dense areas (pre-calculated positions)
    let extraTrees = [
        {x: 120, type: 'oak'},
        {x: 680, type: 'pine'},
        {x: 820, type: 'rounded'}
    ];

    for (let extraTree of extraTrees) {
        drawStaticTree(extraTree.x, groundY, extraTree.type);
    }
}

function drawStaticTree(x, groundY, type) {
    push();
    translate(x, groundY);

    // No scaling for static trees - use default heights
    switch(type) {
        case 'oak':
            // Large oak-like tree
            // Trunk
            fill(101, 67, 33);
            noStroke();
            rect(-8, -60, 16, 60);

            // Static leaves
            fill(34, 139, 34);
            ellipse(0, -70, 80, 60);
            ellipse(-15, -60, 60, 50);
            ellipse(15, -60, 60, 50);
            ellipse(0, -50, 70, 55);
            break;

        case 'pine':
            // Medium pine tree
            // Trunk
            fill(139, 69, 19);
            noStroke();
            rect(-5, -45, 10, 45);

            // Static pine layers
            fill(0, 100, 0);
            triangle(-25, -25, 0, -55, 25, -25);
            triangle(-20, -15, 0, -40, 20, -15);
            triangle(-15, -5, 0, -25, 15, -5);
            break;

        case 'bush':
            // Small bushy tree
            // Trunk
            fill(101, 67, 33);
            noStroke();
            rect(-4, -35, 8, 35);

            // Static leaves
            fill(50, 150, 50);
            ellipse(0, -40, 50, 40);
            ellipse(-10, -30, 40, 35);
            ellipse(10, -30, 40, 35);
            break;

        case 'tall':
            // Tall thin tree
            // Trunk
            fill(139, 69, 19);
            noStroke();
            rect(-3, -70, 6, 70);

            // Static top leaves
            fill(34, 139, 34);
            ellipse(0, -80, 40, 35);
            ellipse(-8, -70, 35, 30);
            ellipse(8, -70, 35, 30);
            break;

        case 'spreading':
            // Large spreading tree
            // Trunk
            fill(101, 67, 33);
            noStroke();
            rect(-10, -65, 20, 65);

            // Static leaves
            fill(34, 139, 34);
            ellipse(0, -75, 90, 65);
            ellipse(-20, -65, 70, 55);
            ellipse(20, -65, 70, 55);
            ellipse(0, -55, 80, 60);
            ellipse(-15, -45, 60, 50);
            ellipse(15, -45, 60, 50);
            break;

        case 'rounded':
            // Medium tree with rounded canopy
            // Trunk
            fill(139, 69, 19);
            noStroke();
            rect(-6, -50, 12, 50);

            // Static rounded leaves
            fill(50, 150, 50);
            ellipse(0, -60, 65, 50);
            ellipse(-12, -50, 55, 45);
            ellipse(12, -50, 55, 45);
            ellipse(0, -40, 60, 48);
            break;

        case 'small':
            // Small tree
            // Trunk
            fill(101, 67, 33);
            noStroke();
            rect(-4, -40, 8, 40);

            // Static leaves
            fill(34, 139, 34);
            ellipse(0, -45, 55, 45);
            ellipse(-8, -35, 45, 40);
            ellipse(8, -35, 45, 40);
            break;

        case 'pine_var':
            // Pine tree variation
            // Trunk
            fill(139, 69, 19);
            noStroke();
            rect(-5, -48, 10, 48);

            // Static pine layers with variation
            fill(0, 100, 0);
            triangle(-28, -28, 0, -58, 28, -28);
            triangle(-22, -18, 0, -43, 22, -18);
            triangle(-16, -8, 0, -28, 16, -8);
            break;

        case 'bushy':
            // Bushy tree with dense leaves
            // Trunk
            fill(101, 67, 33);
            noStroke();
            rect(-5, -38, 10, 38);

            // Dense static leaves
            fill(50, 150, 50);
            ellipse(0, -45, 60, 50);
            ellipse(-10, -35, 50, 45);
            ellipse(10, -35, 50, 45);
            ellipse(0, -25, 55, 48);
            ellipse(-8, -15, 45, 42);
            ellipse(8, -15, 45, 42);
            break;

        case 'slender':
            // Tall slender tree
            // Trunk
            fill(139, 69, 19);
            noStroke();
            rect(-3, -75, 6, 75);

            // Small static canopy
            fill(34, 139, 34);
            ellipse(0, -85, 35, 30);
            ellipse(-6, -75, 30, 25);
            ellipse(6, -75, 30, 25);
            break;
    }

    pop();
}

function drawAnimatedTree(x, groundY, type, wind1, wind2, wind3, treeIndex, height) {
    push();
    translate(x, groundY);

    // Calculate scaling based on height parameter
    let defaultHeight;
    switch(type) {
        case 'oak': defaultHeight = 60; break;
        case 'pine': defaultHeight = 45; break;
        case 'bush': defaultHeight = 35; break;
        case 'tall': defaultHeight = 70; break;
        case 'spreading': defaultHeight = 65; break;
        case 'rounded': defaultHeight = 50; break;
        case 'small': defaultHeight = 40; break;
        case 'pine_var': defaultHeight = 48; break;
        case 'bushy': defaultHeight = 38; break;
        case 'slender': defaultHeight = 75; break;
        default: defaultHeight = 50;
    }
    let scaleFactor = height / defaultHeight;
    scale(scaleFactor);

    // Individual tree wind variation
    let treeWind1 = wind1 * (0.8 + sin(treeIndex * 0.5) * 0.4);
    let treeWind2 = wind2 * (0.9 + cos(treeIndex * 0.3) * 0.2);
    let treeWind3 = wind3 * (0.7 + sin(treeIndex * 0.7) * 0.6);
    switch(type) {
        case 'oak':
            // Large oak-like tree with animated branches
            // Trunk (stable)
            fill(101, 67, 33);
            noStroke();
            rect(-8, -60, 16, 60);

            // Animated leaves with wind
            fill(34, 139, 34);
            let oakWindX1 = treeWind1 * 2;
            let oakWindY1 = treeWind2 * 1.5;
            ellipse(oakWindX1, -70 + oakWindY1, 80, 60);

            let oakWindX2 = treeWind2 * 1.8;
            let oakWindY2 = treeWind3 * 1.2;
            ellipse(-15 + oakWindX2, -60 + oakWindY2, 60, 50);

            let oakWindX3 = treeWind3 * 2.2;
            let oakWindY3 = treeWind1 * 1.8;
            ellipse(15 + oakWindX3, -60 + oakWindY3, 60, 50);

            ellipse(treeWind1 * 1.5, -50 + treeWind2, 70, 55);
            break;

        case 'pine':
            // Medium pine tree with swaying layers
            // Trunk
            fill(139, 69, 19);
            noStroke();
            rect(-5, -45, 10, 45);

            // Animated pine layers
            fill(0, 100, 0);
            let pineWind1 = treeWind1 * 1.2;
            triangle(-25 + pineWind1, -25 + treeWind2 * 0.5, pineWind1, -55 + treeWind2, 25 + pineWind1, -25 + treeWind2 * 0.5);

            let pineWind2 = treeWind2 * 1.5;
            triangle(-20 + pineWind2, -15 + treeWind3 * 0.3, pineWind2 * 0.8, -40 + treeWind3, 20 + pineWind2, -15 + treeWind3 * 0.3);

            let pineWind3 = treeWind3 * 1.8;
            triangle(-15 + pineWind3, -5 + treeWind1 * 0.4, pineWind3 * 0.6, -25 + treeWind1, 15 + pineWind3, -5 + treeWind1 * 0.4);
            break;

        case 'bush':
            // Small bushy tree with rustling leaves
            // Trunk
            fill(101, 67, 33);
            noStroke();
            rect(-4, -35, 8, 35);

            // Animated leaves
            fill(50, 150, 50);
            ellipse(treeWind1 * 1.5, -40 + treeWind2, 50, 40);
            ellipse(-10 + treeWind2 * 1.2, -30 + treeWind3, 40, 35);
            ellipse(10 + treeWind3 * 1.4, -30 + treeWind1, 40, 35);
            break;

        case 'tall':
            // Tall thin tree with top-heavy animation
            // Trunk
            fill(139, 69, 19);
            noStroke();
            rect(-3, -70, 6, 70);

            // Animated top leaves (more movement)
            fill(34, 139, 34);
            let tallWind1 = treeWind1 * 2.5;
            let tallWind2 = treeWind2 * 2.2;
            ellipse(tallWind1, -80 + treeWind2 * 1.8, 40, 35);
            ellipse(-8 + tallWind2, -70 + treeWind3 * 1.5, 35, 30);
            ellipse(8 + treeWind3 * 2.1, -70 + treeWind1 * 1.9, 35, 30);
            break;

        case 'spreading':
            // Large spreading tree with complex animation
            // Trunk
            fill(101, 67, 33);
            noStroke();
            rect(-10, -65, 20, 65);

            // Animated leaves with different wind phases
            fill(34, 139, 34);
            ellipse(treeWind1 * 1.8, -75 + treeWind2 * 1.2, 90, 65);
            ellipse(-20 + treeWind2 * 2.1, -65 + treeWind3 * 1.5, 70, 55);
            ellipse(20 + treeWind3 * 1.9, -65 + treeWind1 * 1.7, 70, 55);
            ellipse(treeWind1 * 1.5, -55 + treeWind2 * 1.3, 80, 60);
            ellipse(-15 + treeWind2 * 1.6, -45 + treeWind3 * 1.8, 60, 50);
            ellipse(15 + treeWind3 * 2.0, -45 + treeWind1 * 1.4, 60, 50);
            break;

        case 'rounded':
            // Medium tree with rounded canopy
            // Trunk
            fill(139, 69, 19);
            noStroke();
            rect(-6, -50, 12, 50);

            // Animated rounded leaves
            fill(50, 150, 50);
            ellipse(treeWind1 * 1.6, -60 + treeWind2 * 1.1, 65, 50);
            ellipse(-12 + treeWind2 * 1.8, -50 + treeWind3 * 1.4, 55, 45);
            ellipse(12 + treeWind3 * 1.7, -50 + treeWind1 * 1.3, 55, 45);
            ellipse(treeWind1 * 1.4, -40 + treeWind2 * 1.6, 60, 48);
            break;

        case 'small':
            // Small tree near center
            // Trunk
            fill(101, 67, 33);
            noStroke();
            rect(-4, -40, 8, 40);

            // Animated leaves
            fill(34, 139, 34);
            ellipse(treeWind1 * 1.3, -45 + treeWind2 * 0.9, 55, 45);
            ellipse(-8 + treeWind2 * 1.4, -35 + treeWind3 * 1.1, 45, 40);
            ellipse(8 + treeWind3 * 1.5, -35 + treeWind1 * 1.0, 45, 40);
            break;

        case 'pine_var':
            // Pine tree variation
            // Trunk
            fill(139, 69, 19);
            noStroke();
            rect(-5, -48, 10, 48);

            // Animated pine layers with variation
            fill(0, 100, 0);
            let pvarWind1 = treeWind1 * 1.4;
            triangle(-28 + pvarWind1, -28 + treeWind2 * 0.6, pvarWind1 * 0.5, -58 + treeWind2 * 0.8, 28 + pvarWind1, -28 + treeWind2 * 0.6);

            let pvarWind2 = treeWind2 * 1.6;
            triangle(-22 + pvarWind2, -18 + treeWind3 * 0.4, pvarWind2 * 0.7, -43 + treeWind3 * 0.7, 22 + pvarWind2, -18 + treeWind3 * 0.4);

            let pvarWind3 = treeWind3 * 1.9;
            triangle(-16 + pvarWind3, -8 + treeWind1 * 0.5, pvarWind3 * 0.6, -28 + treeWind1 * 0.6, 16 + pvarWind3, -8 + treeWind1 * 0.5);
            break;

        case 'bushy':
            // Bushy tree with dense animated leaves
            // Trunk
            fill(101, 67, 33);
            noStroke();
            rect(-5, -38, 10, 38);

            // Dense animated leaves
            fill(50, 150, 50);
            ellipse(treeWind1 * 1.7, -45 + treeWind2 * 1.2, 60, 50);
            ellipse(-10 + treeWind2 * 1.8, -35 + treeWind3 * 1.4, 50, 45);
            ellipse(10 + treeWind3 * 1.6, -35 + treeWind1 * 1.3, 50, 45);
            ellipse(treeWind1 * 1.4, -25 + treeWind2 * 1.5, 55, 48);
            ellipse(-8 + treeWind2 * 1.9, -15 + treeWind3 * 1.6, 45, 42);
            ellipse(8 + treeWind3 * 1.7, -15 + treeWind1 * 1.4, 45, 42);
            break;

        case 'slender':
            // Tall slender tree with minimal animation
            // Trunk
            fill(139, 69, 19);
            noStroke();
            rect(-3, -75, 6, 75);

            // Small animated canopy
            fill(34, 139, 34);
            let slenderWind1 = treeWind1 * 2.8; // More movement at top
            let slenderWind2 = treeWind2 * 2.5;
            ellipse(slenderWind1, -85 + treeWind2 * 2.0, 35, 30);
            ellipse(-6 + slenderWind2, -75 + treeWind3 * 1.8, 30, 25);
            ellipse(6 + treeWind3 * 2.3, -75 + treeWind1 * 1.9, 30, 25);
            break;
    }

    pop();
}

function drawCondensationTrails() {
    push();
    translate(width/2, height/2);
    scale(2.5);

    // Create condensation trails behind wing tips
    let trailLength = map(velocity, 80, 120, 50, 150);
    let trailOpacity = map(altitude, 8000, 12000, 100, 200);

    // Left wing condensation trail
    stroke(255, 255, 255, trailOpacity);
    strokeWeight(3);
    noFill();
    beginShape();
    for (let i = 0; i < trailLength; i += 5) {
        let x = 175 - i * 0.8;
        let y = 8 + sin(i * 0.1 + frameCount * 0.1) * 2;
        let spread = sin(i * 0.05) * 3;
        vertex(x, y + spread);
    }
    endShape();

    // Right wing condensation trail
    beginShape();
    for (let i = 0; i < trailLength; i += 5) {
        let x = 175 - i * 0.8;
        let y = -8 + sin(i * 0.1 + frameCount * 0.1) * 2;
        let spread = sin(i * 0.05) * 3;
        vertex(x, y + spread);
    }
    endShape();

    // Engine condensation trails (if applicable)
    if (velocity > 100) {
        // Left engine trail
        beginShape();
        for (let i = 0; i < trailLength * 0.7; i += 5) {
            let x = 35 - i * 0.6;
            let y = 12 + sin(i * 0.08 + frameCount * 0.15) * 1.5;
            vertex(x, y);
        }
        endShape();

        // Right engine trail
        beginShape();
        for (let i = 0; i < trailLength * 0.7; i += 5) {
            let x = 35 - i * 0.6;
            let y = -12 + sin(i * 0.08 + frameCount * 0.15) * 1.5;
            vertex(x, y);
        }
        endShape();
    }

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
    textSize(10 * textSizeMultiplier);
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
    textSize(8 * textSizeMultiplier);
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

    }

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
    textSize(12 * textSizeMultiplier);
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
    textSize(12 * textSizeMultiplier);
    text('Ley de Newton', legendX + 70, legendY + 5);

    // Pressure scale
    textAlign(LEFT);
    textSize(10 * textSizeMultiplier);
    fill(255, 100, 100);
    text('Presión Alta', legendX + 5, legendY + 25);
    text('(Flujo Lento)', legendX + 5, legendY + 38);

    fill(100, 150, 255);
    text('Presión Baja', legendX + 5, legendY + 55);
    text('(Flujo Rápido)', legendX + 5, legendY + 68);

    // Bernoulli equation
    fill(255, 255, 0);
    textSize(11 * textSizeMultiplier);
    text('P + ½ρv² + ρgh = cte', legendX + 5, legendY + 88);
}

function drawNewtonsThirdLaw() {
    push();
    translate(width/2, height/2);
    scale(2.5);

    // Wing position
    let wingX = 40;
    let wingY = -10;

    // ===== NEWTON'S THIRD LAW VISUALIZATION =====
    // "For every action, there is an equal and opposite reaction"
    // Action: Wing pushes air downward
    // Reaction: Air pushes wing upward (lift)

    // Show air deflection downward (action force)
    for (let i = 0; i < 6; i++) {
        let x = wingX + map(i, 0, 5, 20, 160);
        let y = wingY + 30 + i * 3; // Below wing surface

        // Air particles being deflected downward
        stroke(255, 100, 100, 180); // Red for downward deflection
        strokeWeight(3);
        fill(255, 100, 100, 120);

        // Draw deflected air particles
        ellipse(x, y, 8, 6);

        // Downward deflection arrows
        if (i % 2 === 0) {
            let arrowStartY = y - 5;
            let arrowEndY = y + 15;
            line(x, arrowStartY, x, arrowEndY);

            // Arrow head pointing down
            fill(255, 100, 100, 180);
            triangle(x, arrowEndY, x - 3, arrowEndY - 4, x + 3, arrowEndY - 4);
        }
    }

    // Show upward reaction force on wing (equal and opposite)
    for (let i = 0; i < 4; i++) {
        let x = wingX + map(i, 0, 3, 40, 140);
        let y = wingY - 25 - i * 2; // Above wing surface

        // Upward reaction arrows on wing
        stroke(100, 255, 100, 200); // Green for upward reaction
        strokeWeight(4);
        fill(100, 255, 100, 150);

        let arrowStartY = y + 10;
        let arrowEndY = y - 20;
        line(x, arrowStartY, x, arrowEndY);

        // Arrow head pointing up
        fill(100, 255, 100, 200);
        triangle(x, arrowEndY, x - 4, arrowEndY + 5, x + 4, arrowEndY + 5);
    }

    // Label the Newton's Third Law principle
    fill(255, 255, 0);
    textAlign(CENTER);
    textSize(14 * textSizeMultiplier);
    text('3ª Ley de Newton', wingX + 90, wingY - 60);

    // Action-Reaction labels
    fill(255, 100, 100);
    textSize(10 * textSizeMultiplier);
    text('Acción: Ala empuja aire ↓', wingX + 90, wingY + 70);

    fill(100, 255, 100);
    text('Reacción: Aire empuja ala ↑', wingX + 90, wingY - 80);

    // Equal force magnitudes indicator
    stroke(255, 255, 0, 150);
    strokeWeight(2);
    noFill();
    ellipse(wingX + 90, wingY - 20, 60, 100); // Connecting both forces

    pop();
}

function drawWingProfileWithCurvature() {
    push();
    translate(width/2, height/2);
    scale(2.5);

    // Wing position
    let wingX = 40;
    let wingY = -10;

    // Draw wing profile outline
    stroke(255);
    strokeWeight(2);
    noFill();
    beginShape();
    vertex(wingX, wingY);
    bezierVertex(wingX + 15, wingY - 12, wingX + 50, wingY - 22, wingX + 110, wingY - 18);
    bezierVertex(wingX + 130, wingY - 13, wingX + 150, wingY - 8, wingX + 170, wingY - 3);
    bezierVertex(wingX + 150, wingY + 2, wingX + 130, wingY + 7, wingX + 110, wingY + 10);
    bezierVertex(wingX + 50, wingY + 14, wingX + 15, wingY + 10, wingX, wingY + 4);
    endShape();

    // Draw curvature visualization - upper surface
    stroke(100, 255, 100, 200); // Green for upper
    strokeWeight(1);
    noFill();
    beginShape();
    for (let x = wingX; x <= wingX + 170; x += 2) {
        let t = map(x, wingX, wingX + 170, 0, 1);
        // Simplified curvature representation
        let curvature = sin(t * PI) * 20;
        vertex(x, wingY - curvature);
    }
    endShape();

    // Draw curvature visualization - lower surface
    stroke(255, 100, 100, 200); // Red for lower
    beginShape();
    for (let x = wingX; x <= wingX + 170; x += 2) {
        let t = map(x, wingX, wingX + 170, 0, 1);
        let curvature = sin(t * PI) * 15;
        vertex(x, wingY + curvature);
    }
    endShape();

    // Label
    fill(255, 255, 0);
    textAlign(CENTER);
    textSize(12 * textSizeMultiplier);
    text('Perfil Alar con Curvatura', wingX + 85, wingY - 50);

    // Curvature indicators
    stroke(255, 255, 0);
    strokeWeight(1);
    // Leading edge radius
    noFill();
    ellipse(wingX, wingY, 20, 14);
    // Trailing edge
    line(wingX + 170, wingY - 3, wingX + 170, wingY + 3);

    pop();
}

function drawVelocityComparison() {
    push();
    translate(width/2, height/2);
    scale(2.5);

    // Wing position
   // let wingX = 40;
    //let wingY = -10;

    // Calculate velocities using Bernoulli's principle
    //let velocity_ms = velocity / 3.6; // Convert km/h to m/s
    //let velocityAbove = velocity_ms * 1.3; // Faster above (lower pressure)
    //let velocityBelow = velocity_ms * 0.7; // Slower below (higher pressure)

    // ===== VELOCITY COMPARISON VISUALIZATION =====
    // Show velocity vectors above and below the wing

    // Above wing velocity (faster, blue)
    //let aboveX = wingX + 80;
    //let aboveY = wingY - 40;

    // Velocity vector above
    //stroke(100, 150, 255, 200);
    //strokeWeight(4);
    //fill(100, 150, 255, 150);

    //let aboveVectorLength = velocityAbove * 2;
    //line(aboveX, aboveY, aboveX + aboveVectorLength, aboveY);

    // Arrow head
    //fill(100, 150, 255, 200);
    //triangle(aboveX + aboveVectorLength, aboveY, aboveX + aboveVectorLength - 8, aboveY - 4, aboveX + aboveVectorLength - 8, aboveY + 4);

    // Label
    //fill(100, 150, 255);
    //textAlign(CENTER);
    //textSize(10 * textSizeMultiplier);
    //text('v₁ = ' + velocityAbove.toFixed(1) + ' m/s', aboveX + aboveVectorLength/2, aboveY - 15);

    // Below wing velocity (slower, red)
   // let belowX = wingX + 80;
    //let belowY = wingY + 40;

    // Velocity vector below
   // stroke(255, 100, 100, 200);
    //strokeWeight(4);
    //fill(255, 100, 100, 150);

    //let belowVectorLength = velocityBelow * 2;
    //line(belowX, belowY, belowX + belowVectorLength, belowY);

    // Arrow head
   // fill(255, 100, 100, 200);
    //triangle(belowX + belowVectorLength, belowY, belowX + belowVectorLength - 8, belowY - 4, belowX + belowVectorLength - 8, belowY + 4);

    // Label
    //fill(255, 100, 100);
    //textAlign(CENTER);
    //textSize(10 * textSizeMultiplier);
    //text('v₂ = ' + velocityBelow.toFixed(1) + ' m/s', belowX + belowVectorLength/2, belowY + 20);


    // Velocity ratio
    //let ratio = velocityAbove / velocityBelow;
   // fill(255, 255, 255);
    //textSize(10 * textSizeMultiplier);
    //text('Relación: ' + ratio.toFixed(2) + ':1', wingX + 80, wingY + 80);

    pop();
}

function drawAerodynamicGlossary() {
    // Draw aerodynamic terms glossary in bottom right corner
    push();
    translate(width - 250, height - 190);

    // Background panel
    fill(0, 0, 0, 180);
    stroke(255);
    strokeWeight(1);
    rect(0, 0, 240, 180, 10);

    // Title
    fill(255, 255, 0);
    textAlign(CENTER);
    textSize(14 * textSizeMultiplier);
    text('Glosario Aerodinámico', 120, 20);

    // Terms and definitions
    fill(255);
    textAlign(LEFT);
    textSize(10 * textSizeMultiplier);

    let yPos = 40;
    let lineHeight = 15;

    text('• Sustentación: Fuerza ↑ perpendicular', 10, yPos);
    yPos += lineHeight;
    text('  al flujo que levanta el avión', 10, yPos);
    yPos += lineHeight;

    text('• Resistencia: Fuerza ← opuesta al', 10, yPos);
    yPos += lineHeight;
    text('  movimiento del avión', 10, yPos);
    yPos += lineHeight;

    text('• Ángulo de Ataque: Ángulo entre', 10, yPos);
    yPos += lineHeight;
    text('  ala y dirección del viento', 10, yPos);
    yPos += lineHeight;

    text('• Bernoulli: P + ½ρv² + ρgh = cte', 10, yPos);
    yPos += lineHeight;

    text('• 3ª Ley Newton: Acción = -Reacción', 10, yPos);

    pop();
}

function drawNumericalExamples() {
    // Draw step-by-step numerical examples in bottom center
    push();
    translate(420, height - 250);

    // Background panel
    fill(0, 0, 0, 180);
    stroke(255);
    strokeWeight(1);
    rect(0, 0, 300, 220, 10);

    // Title
    fill(255, 255, 0);
    textAlign(CENTER);
    textSize(14 * textSizeMultiplier);
    text('Ejemplos Numéricos', 150, 20);

    // Current parameters
    fill(255);
    textAlign(LEFT);
    textSize(10 * textSizeMultiplier);

    let yPos = 40;
    let lineHeight = 15;

    text('Parámetros actuales:', 10, yPos);
    yPos += lineHeight;
    text('• Velocidad: ' + velocity + ' km/h (' + (velocity/3.6).toFixed(1) + ' m/s)', 10, yPos);
    yPos += lineHeight;
    text('• Ángulo de ataque: ' + angleOfAttack + '°', 10, yPos);
    yPos += lineHeight;
    text('• Altitud: ' + altitude + ' m', 10, yPos);
    yPos += lineHeight;
    text('• Masa: ' + aircraftMass + ' kg', 10, yPos);
    yPos += lineHeight * 1.5;

    // Step-by-step calculation
    text('Cálculo de Sustentación:', 10, yPos);
    yPos += lineHeight;

    let CL = calculateLiftCoefficient(angleOfAttack);
    let rho = calculateAirDensity(altitude);
    let V = velocity / 3.6;
    let lift = calculateLift(velocity, angleOfAttack, altitude);

    text('1. CL = ' + CL.toFixed(3), 10, yPos);
    yPos += lineHeight;
    text('2. ρ = ' + rho.toFixed(3) + ' kg/m³', 10, yPos);
    yPos += lineHeight;
    text('3. V = ' + V.toFixed(1) + ' m/s', 10, yPos);
    yPos += lineHeight;
    text('4. Área = ' + wingArea.toFixed(1) + ' m²', 10, yPos);
    yPos += lineHeight;
    text('5. L = ½ × ' + rho.toFixed(3) + ' × ' + V.toFixed(0) + '² × ' + wingArea.toFixed(1) + ' × ' + CL.toFixed(3), 10, yPos);
    yPos += lineHeight;
    text('   = ' + lift.toFixed(0) + ' N', 10, yPos);

    pop();
}

function updateInteractiveQuestions() {
    // Update interactive questions in HTML area
    let questionsDiv = select('#interactive-questions');
    if (!questionsDiv) return;

    // Cycle through questions based on frame count
    let questionIndex = floor(frameCount / 300) % 3; // Change every 5 seconds (60 fps * 5)

    let html = '<h4 style="color: yellow; text-align: center; margin-top: 0;">Preguntas Interactivas</h4>';

    if (questionIndex === 0) {
        // Question about lift and velocity
        let currentLift = calculateLift(velocity, angleOfAttack, altitude);
        let higherLift = calculateLift(velocity * 1.2, angleOfAttack, altitude);

        html += '<p>¿Qué sucede con la sustentación al aumentar la velocidad?</p>';
        html += '<p>A) Disminuye</p>';
        html += '<p>B) Se mantiene igual</p>';
        html += '<p style="color: green;">C) Aumenta (L ∝ v²)</p>';
        html += '<p>Actual: ' + currentLift.toFixed(0) + ' N → ' + higherLift.toFixed(0) + ' N (+20% vel)</p>';

    } else if (questionIndex === 1) {
        // Question about Bernoulli principle
        html += '<p>¿Qué explica las diferencias de presión en el ala?</p>';
        html += '<p>A) 1ª Ley de Newton</p>';
        html += '<p style="color: green;">B) Ley de Newton (F = ma)</p>';
        html += '<p>C) Ley de gravitación universal</p>';
        html += '<p>Velocidad arriba: ' + (velocity/3.6 * 1.3).toFixed(1) + ' m/s (presión baja)</p>';

    } else {
        // Question about Newton's Third Law
        html += '<p>¿Qué ley explica por qué el ala empuja el aire hacia abajo?</p>';
        html += '<p>A) 1ª Ley de Newton</p>';
        html += '<p>B) 2ª Ley de Newton</p>';
        html += '<p style="color: green;">C) 3ª Ley de Newton (acción = -reacción)</p>';
        html += '<p>Ala ↓ aire → Aire ↑ ala (sustentación)</p>';
    }

    questionsDiv.html(html);
}

function updatePressureDistribution() {
    // Update pressure distribution values in HTML
    let velocitySpan = select('#pressure-velocity');
    let angleSpan = select('#pressure-angle');
    let liftSpan = select('#pressure-lift');

    if (velocitySpan) velocitySpan.html(velocity.toFixed(0));
    if (angleSpan) angleSpan.html(angleOfAttack.toFixed(0));
    if (liftSpan) liftSpan.html(calculateLift(velocity, angleOfAttack, altitude).toFixed(0));
}

function drawBernoulliAnimations() {
    // Draw explanatory animations of Bernoulli principle
    push();
    translate(width - 340, 50);

    // Background panel
    fill(0, 0, 0, 180);
    stroke(255);
    strokeWeight(1);
    rect(0, 0, 330, 200, 10);

    // Title
    fill(255, 255, 0);
    textAlign(CENTER);
    textSize(14 * textSizeMultiplier);
    text('Animación de Bernoulli', 165, 20);

    // ===== BERNOULLI EQUATION WITH ANIMATION =====
    fill(255);
    textAlign(CENTER);
    textSize(12 * textSizeMultiplier);
    text('P + ½ρv² + ρgh = constante', 165, 45);

    // Animate the terms
    let animPhase = sin(frameCount * 0.05);
    let pressureColor = animPhase > 0 ? [255, 100, 100] : [100, 255, 100]; // Red when high, green when low
    let velocityColor = animPhase < 0 ? [100, 150, 255] : [255, 255, 100]; // Blue when high, yellow when low

    // Pressure term animation
    fill(pressureColor[0], pressureColor[1], pressureColor[2]);
    textSize(16 * textSizeMultiplier * (1 + animPhase * 0.3));
    text('P', 80, 70);

    // Velocity term animation
    fill(velocityColor[0], velocityColor[1], velocityColor[2]);
    textSize(16 * textSizeMultiplier * (1 - animPhase * 0.3));
    text('½ρv²', 165, 70);

    // ===== VENTURI TUBE ANIMATION =====
    fill(255);
    textAlign(CENTER);
    textSize(10 * textSizeMultiplier);
    text('Tubos de Venturi:', 165, 95);

    // Draw venturi tube
    stroke(255);
    strokeWeight(3);
    noFill();
    beginShape();
    vertex(50, 110);
    vertex(100, 110);
    vertex(120, 125); // Narrow section
    vertex(100, 140);
    vertex(50, 140);
    endShape(CLOSE);

    // Animate particles through the tube
    let particleX = 50 + (frameCount * 3) % 200;
    if (particleX > 280) particleX = 50;

    // Particle speed animation (faster in narrow section)
    let particleSpeed = 1;
    if (particleX > 100 && particleX < 120) {
        particleSpeed = 2.5; // Faster in narrow section
    }

    // Draw particle
    fill(255, 255, 0);
    noStroke();
    ellipse(particleX, 125, 6, 6);

    // Pressure indicators
    fill(255, 100, 100, 150);
    ellipse(75, 125, 20, 20); // High pressure (wide section)
    fill(100, 255, 100, 150);
    ellipse(110, 125, 15, 15); // Low pressure (narrow section)

    // Labels
    fill(255);
    textSize(8 * textSizeMultiplier);
    text('Presión Alta', 75, 150);
    text('Presión Baja', 110, 150);
    text('Velocidad ↑', 110, 165);

    // ===== WING CROSS-SECTION =====
    fill(255);
    textAlign(CENTER);
    textSize(10 * textSizeMultiplier);
    text('Aplicación al Ala:', 165, 185);

    // Simple wing cross-section
    stroke(255);
    strokeWeight(2);
    noFill();
    beginShape();
    vertex(130, 190);
    bezierVertex(145, 185, 155, 180, 165, 175);
    bezierVertex(175, 180, 185, 185, 200, 190);
    endShape();

    // Pressure zones on wing
    fill(255, 100, 100, 100);
    ellipse(150, 182, 12, 8); // High pressure below
    fill(100, 255, 100, 100);
    ellipse(150, 178, 12, 8); // Low pressure above

    pop();
}

function drawPressureDistributionGraph() {
    // Draw pressure distribution graph along the wing chord
    push();
    translate(50, height - 300);

    // Background panel
    fill(0, 0, 0, 180);
    stroke(255);
    strokeWeight(1);
    rect(0, 0, 350, 250, 10);

    // Title
    fill(255, 255, 0);
    textAlign(CENTER);
    textSize(14 * textSizeMultiplier);
    text('Distribución de Presión', 175, 20);

    // Graph area
    let graphX = 30;
    let graphY = 40;
    let graphWidth = 290;
    let graphHeight = 160;

    // Draw graph axes
    stroke(255);
    strokeWeight(1);
    line(graphX, graphY, graphX, graphY + graphHeight); // Y axis
    line(graphX, graphY + graphHeight, graphX + graphWidth, graphY + graphHeight); // X axis

    // Axis labels
    fill(255);
    textAlign(CENTER);
    textSize(10 * textSizeMultiplier);
    text('Posición a lo largo de la cuerda', graphX + graphWidth/2, graphY + graphHeight + 20);
    textAlign(RIGHT);
    text('Presión', graphX - 10, graphY + graphHeight/2);

    // Calculate pressure distribution
    let numPoints = 20;
    let upperPressures = [];
    let lowerPressures = [];

    for (let i = 0; i < numPoints; i++) {
        let chordPos = i / (numPoints - 1); // 0 to 1 along chord

        // Simplified pressure distribution (Bernoulli effect)
        // Upper surface: lower pressure (higher velocity)
        let upperPressure = 1.0 - 0.8 * sin(chordPos * PI); // Lower pressure above
        // Lower surface: higher pressure (lower velocity)
        let lowerPressure = 0.8 + 0.4 * sin(chordPos * PI); // Higher pressure below

        upperPressures.push(upperPressure);
        lowerPressures.push(lowerPressure);
    }

    // Draw pressure curves
    strokeWeight(3);

    // Upper surface (blue - low pressure)
    stroke(100, 150, 255);
    noFill();
    beginShape();
    for (let i = 0; i < numPoints; i++) {
        let x = graphX + (i / (numPoints - 1)) * graphWidth;
        let y = graphY + graphHeight - (upperPressures[i] * graphHeight * 0.8);
        vertex(x, y);
    }
    endShape();

    // Lower surface (red - high pressure)
    stroke(255, 100, 100);
    beginShape();
    for (let i = 0; i < numPoints; i++) {
        let x = graphX + (i / (numPoints - 1)) * graphWidth;
        let y = graphY + graphHeight - (lowerPressures[i] * graphHeight * 0.8);
        vertex(x, y);
    }
    endShape();

    // Fill area between curves to show pressure difference
    fill(255, 255, 0, 50);
    strokeWeight(1);
    stroke(255, 255, 0, 100);
    beginShape();
    // Upper curve
    for (let i = 0; i < numPoints; i++) {
        let x = graphX + (i / (numPoints - 1)) * graphWidth;
        let y = graphY + graphHeight - (upperPressures[i] * graphHeight * 0.8);
        vertex(x, y);
    }
    // Lower curve (reverse)
    for (let i = numPoints - 1; i >= 0; i--) {
        let x = graphX + (i / (numPoints - 1)) * graphWidth;
        let y = graphY + graphHeight - (lowerPressures[i] * graphHeight * 0.8);
        vertex(x, y);
    }
    endShape(CLOSE);

    // Legend
    fill(255);
    textAlign(LEFT);
    textSize(10 * textSizeMultiplier);
    text('Superficie Superior (Presión Baja)', graphX + 10, graphY + graphHeight + 40);
    text('Superficie Inferior (Presión Alta)', graphX + 10, graphY + graphHeight + 55);

    // Color indicators
    fill(100, 150, 255);
    noStroke();
    rect(graphX, graphY + graphHeight + 35, 15, 8);
    fill(255, 100, 100);
    rect(graphX, graphY + graphHeight + 50, 15, 8);

    // Bernoulli explanation
    fill(255, 255, 0);
    textAlign(CENTER);
    textSize(9 * textSizeMultiplier);
    text('Principio de Bernoulli: Velocidad ↑ → Presión ↓', 175, graphY + graphHeight + 75);

    pop();
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
