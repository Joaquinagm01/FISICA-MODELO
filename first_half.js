let angleSlider, windSlider, altitudeSlider, massSlider;
let angleAttack = 0;
let liftMagnitude = 0;
let flowOffset = 0;
let windSpeed = 70; // m/s
let altitude = 0; // m
let mass = 80; // kg
let rho = 1.225; // kg/m³
let weight = mass * 9.81; // N
let bgImage;
let P1 = 101325; // Upper surface pressure
let P2 = 101325; // Lower surface pressure
let currentWeather = 'clear'; // Current weather condition
let rainDrops = []; // Array of raindrop objects
let snowFlakes = []; // Array of snowflake objects
let lightningFlash = 0; // Lightning flash intensity
let lightningTimer = 0; // Lightning flash timer
let flowParticles = []; // Array of flow particles following aerodynamic paths

// Bloom effect variables
let bloomEnabled = true;
let bloomIntensity = 0.8;
let bloomRadius = 20;

// Depth of field variables
let dofEnabled = true;
let dofStrength = 0.3;
let focusDistance = 0.5; // 0 = background, 1 = foreground

// Motion blur variables
let motionBlurEnabled = true;
let motionBlurStrength = 0.7;
let motionBlurSteps = 5;

// Previous positions for motion blur
let prevPropellerAngle1 = 0;
let prevPropellerAngle2 = 0;

// Level of Detail variables
let lodEnabled = true;
let lodDistanceThreshold = 200; // Distance from center where LOD kicks in

// Graphics quality control variables
let bloomSlider, dofSlider, motionBlurSlider, lodSlider;

// Weather API variables
let weatherData = null;
let weatherApiKey = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with actual API key
let currentCity = 'Buenos Aires,AR'; // Default location
let weatherUpdateInterval = 600000; // 10 minutes in milliseconds

// Material textures variables
let materialTextures = {};
let fuselageTexture = null;
let wingTexture = null;
let engineTexture = null;

function preload() {
  // No sounds to load
}

function setup() {
  console.log('Setup called');

  // Create canvas with responsive sizing
  let canvasWidth = min(1000, windowWidth - 320); // Leave space for data panel
  let canvasHeight = min(700, windowHeight - 20);
  createCanvas(canvasWidth, canvasHeight);
  smooth(); // Enable anti-aliasing for smoother edges
  console.log('Canvas created with size:', canvasWidth, canvasHeight);

  // Initialize DOM elements immediately
  initializeDOMElements();

  // updateParameters() is now called at the end of initializeDOMElements()

  // Load material textures
  loadMaterialTextures();

  // Initialize flow particles
  initializeFlowParticles();

  console.log('Setup completed');
}

function initializeDOMElements() {
  console.log('Initializing DOM elements...');

  // Get slider elements using p5.js select() for consistency
  angleSlider = select('#angle-slider');
  windSlider = select('#wind-slider');
  altitudeSlider = select('#altitude-slider');
  massSlider = select('#mass-slider');

  // Get buttons
  let resetBtn = select('#reset-btn');
  let tutorialBtn = select('#tutorial-btn');
  let exportBtn = select('#export-btn');
  let closeTutorialBtn = select('#close-tutorial');
  let saveBtn = select('#save-btn');
  let loadBtn = select('#load-btn');
  let togglePanelBtn = select('#toggle-panel-btn');
  let showPanelBtn = select('#show-panel-btn');

  // Weather buttons
  let clearBtn = select('#weather-clear');
  let rainBtn = select('#weather-rain');
  let snowBtn = select('#weather-snow');
  let stormBtn = select('#weather-storm');

  // Add event listeners
  if (angleSlider) {
    angleSlider.input(updateParameters);
    console.log('Angle slider initialized');
  }
  if (windSlider) windSlider.input(updateParameters);
  if (altitudeSlider) altitudeSlider.input(updateParameters);
  if (massSlider) massSlider.input(updateParameters);

  // Button listeners
  if (resetBtn) resetBtn.mousePressed(resetSimulation);
  if (tutorialBtn) tutorialBtn.mousePressed(showTutorial);
  if (exportBtn) exportBtn.mousePressed(exportData);
  if (closeTutorialBtn) closeTutorialBtn.mousePressed(hideTutorial);
  if (saveBtn) saveBtn.mousePressed(saveConfiguration);
  if (loadBtn) loadBtn.mousePressed(loadConfiguration);
  if (togglePanelBtn) togglePanelBtn.mousePressed(togglePanel);
  if (showPanelBtn) showPanelBtn.mousePressed(togglePanel);

  // Weather buttons
  if (clearBtn) clearBtn.mousePressed(() => setWeather('clear'));
  if (rainBtn) rainBtn.mousePressed(() => setWeather('rain'));
  if (snowBtn) snowBtn.mousePressed(() => setWeather('snow'));
  if (stormBtn) stormBtn.mousePressed(() => setWeather('storm'));

  // Initialize parameters after all DOM elements are set up
  updateParameters();

  console.log('DOM elements initialized');
}

function updateParameters() {
  // Check if sliders are initialized before using them
  if (!angleSlider || !windSlider || !altitudeSlider || !massSlider) {
    console.log('Sliders not yet initialized, skipping updateParameters');
    return;
  }

  // Update variables from sliders
  angleAttack = radians(angleSlider.value());
  windSpeed = windSlider.value();
  altitude = altitudeSlider.value();
  mass = massSlider.value();

  // Calculate air density based on altitude (simplified)
  rho = 1.225 * exp(-altitude / 8000); // Exponential decay approximation

  // Calculate weight
  weight = mass * 9.81;

  // Update UI values
  select('#angle-value').html(angleSlider.value() + '°');
  select('#wind-value').html(windSpeed + ' m/s');
  select('#altitude-value').html(altitude + ' m');
  select('#mass-value').html(mass + ' kg');
  select('#weight-value').html(weight.toFixed(0) + ' N');
  select('#rho-value').html(rho.toFixed(3) + ' kg/m³');

  let alpha_deg = angleSlider.value();
  // More realistic lift coefficient (thin airfoil theory)
  let cl = 2 * PI * sin(angleAttack);
  // Simulate stall: reduction when α > 15°
  if (alpha_deg > 15) {
    cl *= max(0, 1 - (alpha_deg - 15) / 10);
  }
  // Lift magnitude (simplified, assuming wing area and dynamic pressure)
  liftMagnitude = max(0, cl * 0.5 * rho * windSpeed**2 * 0.1); // Area = 0.1 m² approximation

  select('#lift-value').html(liftMagnitude.toFixed(0) + ' N');

  // Dynamic velocities based on angle and wind speed
  let delta_v = windSpeed * 0.1 * sin(angleAttack); // Approximation
  let v1 = windSpeed + delta_v; // Above (faster)
  let v2 = windSpeed - delta_v; // Below (slower)

  // Pressures using Bernoulli
  P1 = 101325 - 0.5 * rho * (v1**2 - windSpeed**2);
  P2 = 101325 - 0.5 * rho * (v2**2 - windSpeed**2);

  select('#p1').html(P1.toFixed(0));
  select('#p2').html(P2.toFixed(0));
  select('#v1').html(v1.toFixed(0));
  select('#v2').html(v2.toFixed(0));
}

function applyBloom(x, y, radius, intensity, color) {
  if (!bloomEnabled) return;

  // Create multiple concentric circles with decreasing opacity for glow effect
  for (let i = radius; i > 0; i -= 2) {
    let alpha = map(i, 0, radius, 0, intensity * 255);
    fill(red(color), green(color), blue(color), alpha);
    noStroke();
    ellipse(x, y, i * 2, i * 2);
  }
}

function applyDepthOfField() {
  if (!dofEnabled) return;

  // Create a blur effect by drawing semi-transparent copies with slight offsets
  push();
  blendMode(SCREEN);
  for (let i = 0; i < 3; i++) {
    let offset = (i + 1) * dofStrength * 2;
    let alpha = map(i, 0, 2, 50, 10);

    // Blur background elements (clouds, sky)
    fill(255, 255, 255, alpha);
    noStroke();

    // Apply blur to clouds by drawing them with slight offsets
    // Cloud 1
    ellipse(180 + sin(frameCount * 0.02) * 5 + offset, 95 + offset, 90, 55);
    ellipse(220 + sin(frameCount * 0.02 + 1) * 3 + offset, 100 + offset, 80, 50);
    ellipse(200 + sin(frameCount * 0.02 + 2) * 4 + offset, 110 + offset, 70, 40);

    // Cloud 2
    ellipse(380 + sin(frameCount * 0.02 * 0.8) * 8 + offset, 115 + offset, 110, 65);
    ellipse(420 + sin(frameCount * 0.02 * 0.8 + 1) * 6 + offset, 120 + offset, 90, 55);
    ellipse(400 + sin(frameCount * 0.02 * 0.8 + 2) * 7 + offset, 130 + offset, 75, 45);
  }
  blendMode(BLEND);
  pop();
}

function applyMotionBlur(x, y, prevX, prevY, drawFunction) {
  if (!motionBlurEnabled) {
    drawFunction();
    return;
  }

  // Calculate movement vector
  let dx = x - prevX;
  let dy = y - prevY;
  let distance = sqrt(dx * dx + dy * dy);

  if (distance < 1) {
    drawFunction();
    return;
  }

  // Draw multiple semi-transparent copies along the movement path
  for (let i = 0; i < motionBlurSteps; i++) {
    let t = i / (motionBlurSteps - 1);
    let blurX = lerp(prevX, x, t);
    let blurY = lerp(prevY, y, t);
    let alpha = map(i, 0, motionBlurSteps - 1, motionBlurStrength * 255, 0);

    push();
    translate(blurX - x, blurY - y);
    fill(255, 255, 255, alpha);
    stroke(255, 255, 255, alpha);
    drawFunction();
    pop();
  }

  // Draw the main element
  drawFunction();
}

function getLODLevel(distance) {
  if (!lodEnabled) return 1.0; // Full detail

  // Return detail level based on distance (1.0 = full detail, 0.0 = minimal detail)
  if (distance < lodDistanceThreshold * 0.5) return 1.0;
  if (distance < lodDistanceThreshold) return 0.7;
  if (distance < lodDistanceThreshold * 1.5) return 0.4;
  return 0.2;
}

async function fetchWeather() {
  try {
    console.log('Fetching weather data...');
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${currentCity}&appid=${weatherApiKey}&units=metric`);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    weatherData = {
      temperature: data.main.temp,
      pressure: data.main.pressure * 100, // Convert hPa to Pa
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg || 0,
      description: data.weather[0].description,
      city: data.name,
      country: data.sys.country,
      timestamp: Date.now()
    };
    
    // Update physics parameters based on weather
    updatePhysicsFromWeather();
    
    console.log('Weather data updated:', weatherData);
    
    return true;
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    // Fallback to default values
    weatherData = {
      temperature: 20,
      pressure: 101325,
      humidity: 60,
      windSpeed: 5,
      windDirection: 0,
      description: 'Default conditions',
      city: 'Default',
      country: 'XX',
      timestamp: Date.now()
    };
    updatePhysicsFromWeather();
    return false;
  }
}

function updatePhysicsFromWeather() {
  if (!weatherData) return;
  
  // Update air density based on temperature and pressure
  // ρ = P / (R * T) where R is gas constant for air
  const R = 287.05; // J/(kg·K) for dry air
  const T = weatherData.temperature + 273.15; // Convert to Kelvin
  rho = weatherData.pressure / (R * T);
  
  // Adjust wind speed
  windSpeed = weatherData.windSpeed;
  
  // Update altitude based on pressure (simplified)
  // This is a rough approximation
  altitude = Math.max(0, (101325 - weatherData.pressure) / 11.5); // Rough conversion
  
  // Update UI sliders
  if (windSlider) windSlider.value(windSpeed);
  if (altitudeSlider) altitudeSlider.value(altitude);
  
  // Recalculate physics
  updateParameters();
}

function updateWeatherUI() {
  // Weather UI removed
}

async function loadMaterialTextures() {
  try {
    console.log('Loading material textures...');

    // Create procedural textures instead of loading external images
    const textureSize = 256;

    // Create fuselage texture (metallic surface)
    fuselageTexture = createGraphics(textureSize, textureSize);
    fuselageTexture.loadPixels();
    for (let i = 0; i < textureSize * textureSize * 4; i += 4) {
      let x = (i / 4) % textureSize;
      let y = Math.floor((i / 4) / textureSize);
      let noiseVal = noise(x * 0.01, y * 0.01) * 50;
      fuselageTexture.pixels[i] = 120 + noiseVal;     // R - metallic gray
      fuselageTexture.pixels[i + 1] = 125 + noiseVal; // G
      fuselageTexture.pixels[i + 2] = 135 + noiseVal; // B
      fuselageTexture.pixels[i + 3] = 255;            // A
    }
    fuselageTexture.updatePixels();
    console.log('Fuselage texture created');

    // Create wing texture (aircraft aluminum)
    wingTexture = createGraphics(textureSize, textureSize);
    wingTexture.loadPixels();
    for (let i = 0; i < textureSize * textureSize * 4; i += 4) {
      let x = (i / 4) % textureSize;
      let y = Math.floor((i / 4) / textureSize);
      let noiseVal = noise(x * 0.02, y * 0.02) * 30;
      wingTexture.pixels[i] = 140 + noiseVal;     // R - lighter metallic
      wingTexture.pixels[i + 1] = 145 + noiseVal; // G
      wingTexture.pixels[i + 2] = 155 + noiseVal; // B
      wingTexture.pixels[i + 3] = 255;            // A
    }
    wingTexture.updatePixels();
    console.log('Wing texture created');

    // Create engine texture (procedural engine material)
    engineTexture = createGraphics(textureSize, textureSize);
    engineTexture.loadPixels();
    for (let i = 0; i < textureSize * textureSize * 4; i += 4) {
      let x = (i / 4) % textureSize;
      let y = Math.floor((i / 4) / textureSize);
      let noiseVal = noise(x * 0.03, y * 0.03) * 40;
      // Darker metallic for engine
      engineTexture.pixels[i] = 80 + noiseVal;     // R
      engineTexture.pixels[i + 1] = 85 + noiseVal; // G
      engineTexture.pixels[i + 2] = 95 + noiseVal; // B
      engineTexture.pixels[i + 3] = 255;           // A
    }
    engineTexture.updatePixels();
    console.log('Engine texture created');

    return true;
  } catch (error) {
    console.error('Failed to create material textures:', error);
    return false;
  }
}

function draw() {
  console.log('Draw called');
  clear(); // Clear for P2D

  // Camera effects for flight sensation
  let cameraShake = 0;
  let cameraRoll = 0;
  let cameraPitch = 0;

  // Subtle camera shake based on speed and turbulence
  cameraShake = sin(frameCount * 0.1) * map(windSpeed, 0, 100, 0, 2);
  cameraRoll = sin(frameCount * 0.05) * map(degrees(angleAttack), -10, 20, -0.5, 0.5);
  cameraPitch = cos(frameCount * 0.08) * map(altitude, 0, 10000, 0, 1);

  // Apply camera transformation
  push();
  translate(width/2, height/2);
  rotate(cameraRoll * PI/180);
  translate(-width/2, -height/2);
  translate(cameraShake, cameraPitch);

  // Background con gradiente de cielo optimizado
  if (bgImage) {
    image(bgImage, 0, 0, width, height);
  } else {
    // Gradiente de cielo simple y eficiente
    let topColor = color(135, 206, 250);
    let bottomColor = color(100, 180, 220);

    // Dibujar gradiente de manera eficiente
    for (let y = 0; y < height; y += 3) { // Dibujar cada 3 píxeles para mejor rendimiento
      let inter = map(y, 0, height, 0, 1);
      let c = lerpColor(topColor, bottomColor, inter);
      stroke(c);
      line(0, y, width, y);
      line(0, y + 1, width, y + 1);
      line(0, y + 2, width, y + 2);
    }

    // Horizonte simple
    stroke(100, 150, 200, 100);
    strokeWeight(1);
    line(0, height * 0.7, width, height * 0.7);
  }

  // Don't draw airplane and flows until sliders are initialized
  if (!angleSlider || !windSlider || !altitudeSlider || !massSlider) {
    // Show loading message
    textSize(24);
    textAlign(CENTER);
    fill(255);
    text('Cargando simulación...', width / 2, height / 2);
    return;
  }

  // Nubes volumétricas con profundidad
  let cloudOffset = frameCount * 0.02; // Movimiento lento de nubes
  let cloudScale = 1.0; // Escala fija para evitar problemas

  // Nube 1 (más cercana, más detallada) - movimiento lento
  let lod1 = getLODLevel(abs(180 - width/2));
  fill(255, 255, 255, 200);
  noStroke();
  if (lod1 > 0.5) {
    ellipse(180 + sin(cloudOffset) * 5, 95, 90, 55);
    ellipse(220 + sin(cloudOffset + 1) * 3, 100, 80, 50);
    ellipse(200 + sin(cloudOffset + 2) * 4, 110, 70, 40);
    // Sombra de la nube
    fill(200, 200, 200, 100);
    ellipse(190 + sin(cloudOffset) * 5, 105, 85, 50);
  } else {
    // Low detail version
    ellipse(200, 100, 90 * lod1 * 2, 55 * lod1 * 2);
  }

  // Nube 2 (media distancia) - movimiento medio
  let lod2 = getLODLevel(abs(380 - width/2));
  fill(255, 255, 255, 180);
  if (lod2 > 0.5) {
    ellipse(380 + sin(cloudOffset * 0.8) * 8, 115, 110, 65);
    ellipse(420 + sin(cloudOffset * 0.8 + 1) * 6, 120, 90, 55);
    ellipse(400 + sin(cloudOffset * 0.8 + 2) * 7, 130, 75, 45);
    // Sombra
    fill(200, 200, 200, 80);
    ellipse(390 + sin(cloudOffset * 0.8) * 8, 125, 100, 60);
  } else {
    // Low detail version
    ellipse(400, 120, 110 * lod2 * 2, 65 * lod2 * 2);
  }

  // Nube 3 (más lejana, más azulada) - movimiento sutil
  let lod3 = getLODLevel(abs(580 - width/2));
  fill(240, 248, 255, 160);
  if (lod3 > 0.3) {
    ellipse(580 + sin(cloudOffset * 0.5) * 3, 85, 80, 50);
    ellipse(620 + sin(cloudOffset * 0.5 + 1) * 2, 90, 70, 45);
    ellipse(600 + sin(cloudOffset * 0.5 + 2) * 3, 100, 60, 35);
    // Sombra sutil
    fill(220, 230, 240, 70);
    ellipse(590 + sin(cloudOffset * 0.5) * 3, 95, 75, 45);
  } else {
    // Very low detail version
    ellipse(600, 90, 80 * lod3 * 3, 50 * lod3 * 3);
  }

  // Nube 4 (baja altitud) - movimiento rápido
  fill(255, 255, 255, 190);
  ellipse(130 + sin(cloudOffset * 1.2) * 10, 145, 100, 60);
  ellipse(170 + sin(cloudOffset * 1.2 + 1) * 8, 150, 85, 50);
  ellipse(150 + sin(cloudOffset * 1.2 + 2) * 9, 160, 70, 40);
  // Sombra
  fill(200, 200, 200, 90);
  ellipse(140 + sin(cloudOffset * 1.2) * 10, 155, 95, 55);

  // Nube 5 (alta altitud, más delgada) - movimiento muy lento
  fill(250, 250, 255, 170);
  ellipse(480 + sin(cloudOffset * 0.3) * 2, 155, 95, 45);
  ellipse(520 + sin(cloudOffset * 0.3 + 1) * 1.5, 160, 80, 40);
  ellipse(500 + sin(cloudOffset * 0.3 + 2) * 2, 170, 65, 30);
  // Sombra mínima
  fill(230, 230, 235, 75);
  ellipse(490 + sin(cloudOffset * 0.3) * 2, 165, 90, 40);

  // ===== TERRENO DETALLADO CON CAPAS =====

  // Montañas distantes (fondo) - tonos azules
  fill(100, 120, 140, 120);
  noStroke();
  beginShape();
  vertex(0, height);
  vertex(0, height * 0.8);
  for (let x = 0; x <= width; x += 30) {
    let y = height * 0.8 + sin(x * 0.005 + cloudOffset * 0.05) * 15;
    vertex(x, y);
  }
  vertex(width, height * 0.8);
  vertex(width, height);
  endShape(CLOSE);

  // Montañas medias - tonos verdes/azules
  fill(80, 110, 90, 140);
  beginShape();
  vertex(0, height);
  vertex(0, height * 0.75);
  for (let x = 0; x <= width; x += 25) {
    let y = height * 0.75 + sin(x * 0.008 + cloudOffset * 0.08) * 20;
    vertex(x, y);
  }
  vertex(width, height * 0.75);
  vertex(width, height);
  endShape(CLOSE);

  // Montañas del frente - más detalladas
  fill(60, 90, 70, 160);
  beginShape();
  vertex(0, height);
  vertex(0, height * 0.7);
  for (let x = 0; x <= width; x += 20) {
    let y = height * 0.7 + sin(x * 0.01 + cloudOffset * 0.1) * 25;
    vertex(x, y);
  }
  vertex(width, height * 0.7);
  vertex(width, height);
  endShape(CLOSE);

  // Valle/llanura principal
  fill(100, 150, 100, 180);
  beginShape();
  vertex(0, height);
  vertex(0, height * 0.65);
  for (let x = 0; x <= width; x += 15) {
    let y = height * 0.65 + sin(x * 0.015 + cloudOffset * 0.12) * 8;
    vertex(x, y);
  }
  vertex(width, height * 0.65);
  vertex(width, height);
  endShape(CLOSE);

  // ===== RÍOS Y CUERPOS DE AGUA =====
  // Río principal serpenteante
  stroke(30, 80, 150, 120);
  strokeWeight(3);
  noFill();
  beginShape();
  for (let x = 0; x <= width; x += 10) {
    let baseY = height * 0.75;
    let y = baseY + sin(x * 0.02 + cloudOffset * 0.15) * 5;
    if (x === 0) {
      vertex(x, y);
    } else {
      vertex(x, y);
    }
  }
  endShape();

  // Lago pequeño en el valle
  fill(40, 90, 160, 100);
  noStroke();
  ellipse(width * 0.3, height * 0.78, 80, 30);
  // Reflejo del sol en el lago
  fill(200, 220, 255, 150);
  ellipse(width * 0.3, height * 0.78, 20, 8);

  // ===== VEGETACIÓN =====
  // Árboles en las laderas
  for (let i = 0; i < 15; i++) {
    let treeX = (i * 80 + frameCount * 0.1) % (width + 100) - 50;
    let treeY = height * 0.72 + sin(treeX * 0.02) * 10;

    // Tronco
    stroke(60, 40, 20, 150);
    strokeWeight(2);
    line(treeX, treeY, treeX, treeY - 15);

    // Copa del árbol
    fill(30, 80, 40, 120);
    noStroke();
    ellipse(treeX, treeY - 18, 12, 20);
  }

  // Arbustos y hierba
  for (let i = 0; i < 30; i++) {
    let bushX = (i * 40 + frameCount * 0.05) % (width + 50) - 25;
    let bushY = height * 0.68 + random(-5, 5);

    fill(40, 70, 30, 80);
    noStroke();
    ellipse(bushX, bushY, 8, 6);
  }

  // ===== EFECTOS ATMOSFÉRICOS MEJORADOS =====

  // Niebla estratificada con diferentes densidades
  for (let layer = 0; layer < 3; layer++) {
    let layerY = height * (0.6 + layer * 0.05);
    let layerAlpha = map(layer, 0, 2, 20, 60);

    for (let y = layerY; y < layerY + 20; y += 2) {
      let alpha = map(y, layerY, layerY + 20, 0, layerAlpha);
      let fogColor = color(
        200 + layer * 10,
        220 + layer * 5,
        230 + layer * 5,
        alpha
      );
      stroke(fogColor);
      strokeWeight(1);
      line(0, y, width, y);
    }
  }

  // Partículas atmosféricas mejoradas (polvo, humedad, insectos)
  for (let i = 0; i < 80; i++) {
    let x = (frameCount * (0.3 + i * 0.01) + i * 17) % (width + 100) - 50;
    let y = height * (0.65 + sin(frameCount * 0.005 + i * 0.1) * 0.05) + random(-10, 10);
    let size = random(0.5, 2.5);
    let alpha = map(y, height * 0.6, height * 0.8, 15, 90);

    // Diferentes tipos de partículas
    if (i % 4 === 0) {
      // Polvo fino
      fill(240, 230, 200, alpha);
    } else if (i % 4 === 1) {
      // Humedad
      fill(255, 255, 255, alpha);
    } else if (i % 4 === 2) {
      // Insectos pequeños
      fill(150, 150, 150, alpha * 0.7);
      size *= 0.5;
    } else {
      // Partículas de luz
      fill(255, 250, 200, alpha * 0.8);
      size *= 0.3;
    }

    noStroke();
    ellipse(x, y, size, size);
  }

  // Efectos de luz solar filtrándose a través de las nubes
  if (sunAngle > 0) { // Solo durante el día
    let sunRayCount = 8;
    for (let i = 0; i < sunRayCount; i++) {
      let rayX = width * 0.1 + (width * 0.8 / sunRayCount) * i;
      let rayAlpha = sin(timeOfDay + i) * 30 + 10;

      stroke(255, 255, 200, rayAlpha);
      strokeWeight(2);
      line(rayX, height * 0.4, rayX + 10, height * 0.8);
    }
  }

  // Título
  textSize(28);
  textAlign(CENTER);
  fill(255);
  stroke(0);
  strokeWeight(2);
  text('Simulador Interactivo de Sustentación', width / 2, 50);

  // Etiqueta del slider
  textSize(16);
  textAlign(LEFT);
  fill(255);
  noStroke();
  text('Ángulo de Ataque: ' + angleSlider.value() + ' grados', 20, 15);

  // Variables para el ala (definidas fuera del push para scope global)
  let leadingEdgeX = -180;
  let leadingEdgeY = 0;

  // Dibujar ala aerodinámica sólida y profesional (perfil NACA 2412 mejorado)
  push();
  translate(width / 2, height / 2); // Centrar el ala en el canvas
  scale(1.4); // Hacer el ala más grande para mejor visibilidad
  rotate(angleAttack * 0.3); // Rotación sutil

  // Variables para efectos visuales mejorados con iluminación dinámica
  let timeOfDay = (frameCount * 0.01) % (2 * PI); // Ciclo de día completo
  let sunAngle = sin(timeOfDay) * PI/3; // Ángulo del sol (-60° a +60°)

  // Dirección de la luz basada en el sol y ángulo de ataque
  let lightDirection = createVector(
    cos(sunAngle) * 0.7,
    sin(sunAngle) * 0.8 - 0.2,
    0.4 + sin(angleAttack * 0.1) * 0.2
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
    map(sin(timeOfDay), -1, 1, 100, 255)  // Azul varía (más azul al amanecer/atardecer)
  );

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
    bezierVertex(-150 + layer * 3, 8 - layer, -120 + layer * 2, 10 - layer, -90 + layer, 12 - layer, leadingEdgeX, leadingEdgeY);
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

    // Brillo de borde de ataque
    stroke(red(sunColor), green(sunColor), blue(sunColor), specularIntensity * 100);
    strokeWeight(1);
    beginShape();
    vertex(leadingEdgeX, leadingEdgeY - 3);
    bezierVertex(leadingEdgeX + 30, leadingEdgeY - 8, leadingEdgeX + 60, leadingEdgeY - 6, leadingEdgeX + 90, leadingEdgeY - 4);
    endShape();
  }

  // ===== SOMBRAS 3D DINÁMICAS =====
  // Sombras volumétricas basadas en dirección de luz y hora del día
  push();
  let shadowOffsetX = lightDirection.x * 8;
  let shadowOffsetY = lightDirection.y * 8;
  translate(shadowOffsetX, shadowOffsetY);

  let shadowAlpha = (1 - totalLight) * 80 + 20; // Más oscura cuando menos luz
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

  // Antenas GPS/VOR en la superficie superior
  stroke(80, 80, 90);
  strokeWeight(2);
  // Antena principal
  line(50, -45, 50, -55);
  fill(100, 100, 110);
  ellipse(50, -55, 4, 4);

  // Antena secundaria
  line(120, -40, 120, -50);
  ellipse(120, -50, 3, 3);

  // ===== EFECTOS DE DESGASTE (OPCIONALES) =====
  // Manchas de uso en áreas de alto estrés
  if (angleAttack > radians(10)) { // Solo mostrar en ángulos altos
    // Mancha de desgaste en borde de ataque
    fill(45, 45, 55, 80);
    noStroke();
    ellipse(leadingEdgeX + 15, leadingEdgeY, 25, 8);

    // Mancha de desgaste en flaps
    ellipse(160, -42, 15, 6);
    ellipse(160, 17, 15, 6);
  }

  // Hielo en bordes (simulado para altitudes altas)
  if (altitude > 5000) {
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

  // Borde de ataque reforzado con textura metálica
  fill(60, 70, 80);
  stroke(40, 50, 60);
  strokeWeight(1);
  ellipse(leadingEdgeX, leadingEdgeY, 16, 12);

  // Detalle del borde de ataque
  fill(80, 90, 100);
  ellipse(leadingEdgeX, leadingEdgeY, 10, 8);

  // Detalles del ala con mejoras visuales
  // Flaps cuando ángulo > 15° - más prominentes y realistas
  if (angleAttack > radians(15)) {
    // Flaps superiores con textura metálica
    fill(90, 140, 220);
    stroke(70, 120, 200);
    strokeWeight(2);

    // Flap superior con detalles
    beginShape();
    vertex(120, -50);
    vertex(170, -45);
    vertex(175, -35);
    vertex(125, -40);
    endShape(CLOSE);

    // Detalles del flap superior
    stroke(60, 100, 180);
    strokeWeight(1);
    line(140, -47, 140, -38);
    line(155, -45, 155, -37);

    // Flaps inferiores con textura metálica
    fill(85, 135, 215);
    stroke(65, 115, 195);
    strokeWeight(2);

    beginShape();
    vertex(120, 25);
    vertex(170, 20);
    vertex(175, 30);
    vertex(125, 35);
    endShape(CLOSE);

    // Detalles del flap inferior
    stroke(55, 95, 175);
    strokeWeight(1);
    line(140, 22, 140, 33);
    line(155, 20, 155, 32);

    // Efectos de movimiento en flaps
    if (angleAttack > radians(20)) {
      // Vibración sutil en flaps desplegados
      let flapVibration = sin(frameCount * 0.5) * 0.5;
      stroke(255, 255, 255, 100);
      strokeWeight(1);
      line(170 + flapVibration, -42, 175 + flapVibration, -35);
      line(170 + flapVibration, 23, 175 + flapVibration, 30);
    }
  }

  // Luz de navegación en la punta del ala - más visible y realista
  // Base de la luz
  fill(30, 30, 40);
  stroke(20, 20, 30);
  strokeWeight(1);
  ellipse(195, -8, 12, 12);

  // Luz verde de navegación
  fill(0, 255, 0);
  stroke(0, 150, 0);
  strokeWeight(2);
  ellipse(195, -8, 8, 8);

  // Halo de la luz
  fill(100, 255, 100, 120);
  noStroke();
  ellipse(195, -8, 16, 16);

  // Efecto de parpadeo sutil
  if (frameCount % 60 < 30) {
    fill(150, 255, 150, 80);
    ellipse(195, -8, 20, 20);
  }

  // Número de serie del ala - más visible con efecto 3D
  // Sombra del texto
  fill(0, 0, 0, 100);
  textSize(10);
  textAlign(CENTER);
  text('NACA 2412', 1, 46);

  // Texto principal
  fill(255);
  stroke(0);
  strokeWeight(1);
  text('NACA 2412', 0, 45);

  // Etiqueta del borde de ataque con mejor diseño
  fill(255, 255, 0);
  stroke(150, 150, 0);
  strokeWeight(1);
  textSize(8);
  text('Borde de Ataque', leadingEdgeX - 20, leadingEdgeY - 15);

  // Indicador de dirección de vuelo
  stroke(255, 255, 0, 150);
  strokeWeight(2);
