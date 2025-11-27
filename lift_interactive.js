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

// Airplane images API variables
let airplaneImages = {};
let aviationApiKey = 'YOUR_AVIATION_STACK_API_KEY'; // Replace with actual API key

// Material textures variables
let materialTextures = {};
let fuselageTexture = null;
let wingTexture = null;
let engineTexture = null;

// Airplane model data - Fixed single model for testing
let currentAirplaneModel = {
  name: 'Boeing 737-800',
  airline: 'Aerolineas Argentinas',
  registration: 'LV-ABC',
  colors: { fuselage: [255, 255, 255], accent: [0, 57, 166], stripe: [220, 20, 60], wings: [80, 80, 90] },
  scale: 1.0,
  wingspan: 35.8,
  length: 39.5,
  maxWeight: 79000
};

function changeAirplaneModel(modelIndex) {
  // Function disabled - using fixed airplane model for testing
  console.log('Airplane model switching disabled for testing');
}

function preload() {
  // No sounds to load
}

function setup() {
  console.log('Setup called');
  createCanvas(1000, 700, P2D); // Using P2D for compatibility
  smooth(); // Enable anti-aliasing for smoother edges
  console.log('Canvas created');

  // Airplane model is already initialized above

  // Wait a bit for DOM to be fully ready
  setTimeout(() => {
    angleSlider = select('#angle-slider');
    if (angleSlider) {
      console.log('Angle slider found');
      angleSlider.input(updateParameters);
    } else {
      console.log('Angle slider not found');
    }
    windSlider = select('#wind-slider');
    if (windSlider) windSlider.input(updateParameters);
    altitudeSlider = select('#altitude-slider');
    if (altitudeSlider) altitudeSlider.input(updateParameters);
    massSlider = select('#mass-slider');
    if (massSlider) massSlider.input(updateParameters);

    // Graphics quality sliders
    bloomSlider = select('#bloom-slider');
    if (bloomSlider) {
      bloomSlider.input(updateGraphicsQuality);
      bloomSlider.value(bloomIntensity * 100);
    }
    dofSlider = select('#dof-slider');
    if (dofSlider) {
      dofSlider.input(updateGraphicsQuality);
      dofSlider.value(dofStrength * 100);
    }
    motionBlurSlider = select('#motion-blur-slider');
    if (motionBlurSlider) {
      motionBlurSlider.input(updateGraphicsQuality);
      motionBlurSlider.value(motionBlurStrength * 100);
    }
    lodSlider = select('#lod-slider');
    if (lodSlider) {
      lodSlider.input(updateGraphicsQuality);
      lodSlider.value(lodDistanceThreshold);
    }

    // Button event listeners
    let resetBtn = select('#reset-btn');
    if (resetBtn) resetBtn.mousePressed(resetSimulation);
    let tutorialBtn = select('#tutorial-btn');
    if (tutorialBtn) tutorialBtn.mousePressed(showTutorial);
    let exportBtn = select('#export-btn');
    if (exportBtn) exportBtn.mousePressed(exportData);
    let closeTutorialBtn = select('#close-tutorial');
    if (closeTutorialBtn) closeTutorialBtn.mousePressed(hideTutorial);
    let saveBtn = select('#save-btn');
    if (saveBtn) saveBtn.mousePressed(saveConfiguration);
    let loadBtn = select('#load-btn');
    if (loadBtn) loadBtn.mousePressed(loadConfiguration);

    // Weather control buttons
    let clearBtn = select('#weather-clear');
    if (clearBtn) clearBtn.mousePressed(() => setWeather('clear'));
    let rainBtn = select('#weather-rain');
    if (rainBtn) rainBtn.mousePressed(() => setWeather('rain'));
    let snowBtn = select('#weather-snow');
    if (snowBtn) snowBtn.mousePressed(() => setWeather('snow'));
    let stormBtn = select('#weather-storm');
    if (stormBtn) stormBtn.mousePressed(() => setWeather('storm'));

    updateParameters(); // Initialize
    setupGauges(); // Initialize instrument panel
    
    // Load material textures
    loadMaterialTextures();
    
    // Initialize flow particles
    initializeFlowParticles();
    
    console.log('Setup completed');
  }, 100);
}

function updateParameters() {
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

function updateGraphicsQuality() {
  if (bloomSlider) {
    bloomIntensity = bloomSlider.value() / 100;
    select('#bloom-value').html(Math.round(bloomSlider.value()) + '%');
  }
  
  if (dofSlider) {
    dofStrength = dofSlider.value() / 100;
    select('#dof-value').html(Math.round(dofSlider.value()) + '%');
  }
  
  if (motionBlurSlider) {
    motionBlurStrength = motionBlurSlider.value() / 100;
    select('#motion-blur-value').html(Math.round(motionBlurSlider.value()) + '%');
  }
  
  if (lodSlider) {
    lodDistanceThreshold = lodSlider.value();
    select('#lod-value').html(lodSlider.value() + 'px');
  }
  
  console.log('Graphics quality updated:', {
    bloom: bloomIntensity,
    dof: dofStrength,
    motionBlur: motionBlurStrength,
    lod: lodDistanceThreshold
  });
}

async function fetchAirplaneImageFromAPI(modelName) {
  try {
    console.log(`Fetching image for ${modelName}...`);
    
    // For demo purposes, using public aviation images
    // In production, you would use an aviation API like Aviation Stack
    const imageUrls = {
      'Boeing 737-800': 'https://images.unsplash.com/photo-1556388158-158ea5cc549b?w=400',
    };
    
    const imageUrl = imageUrls[modelName] || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400';
    
    // Load image using p5.js
    const img = loadImage(imageUrl, 
      () => {
        console.log(`Image loaded for ${modelName}`);
        airplaneImages[modelName] = img;
        // Image loaded successfully
      },
      () => {
        console.error(`Failed to load image for ${modelName}`);
        // Fallback to default
        airplaneImages[modelName] = null;
      }
    );
    
    return true;
  } catch (error) {
    console.error('Failed to fetch airplane image:', error);
    return false;
  }
}

function updateAirplaneDisplay() {
  // Always update the airplane info
  select('#airplane-info').html(`
    ${currentAirplaneModel.airline} - ${currentAirplaneModel.name}<br>
    Matrícula: ${currentAirplaneModel.registration}<br>
    Envergadura: ${currentAirplaneModel.wingspan}m | Longitud: ${currentAirplaneModel.length}m
  `);
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

function applyTextureToAirplane() {
  if (fuselageTexture && wingTexture && engineTexture) {
    // In WebGL mode, you would apply these textures to 3D models
    // For now, we'll use them as background patterns in 2D mode
    console.log('Textures loaded and ready for application');
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

  // Background con gradiente de cielo realista
  if (bgImage) {
    image(bgImage, 0, 0, width, height);
  } else {
    // Gradiente de cielo (azul claro arriba → azul más oscuro abajo)
    for (let y = 0; y < height; y++) {
      let inter = map(y, 0, height, 0, 1);
      let c = lerpColor(color(135, 206, 250), color(100, 180, 220), inter);
      stroke(c);
      line(0, y, width, y);
    }

    // Horizonte sutil
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

  // Nubes volumétricas con profundidad, sombreado y animación
  let cloudOffset = frameCount * 0.02; // Movimiento lento de nubes

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

  // Apply depth of field effect to background elements
  applyDepthOfField();

  // Horizonte visible con tierra/montañas sutiles
  fill(100, 150, 100, 150); // Verde tierra
  noStroke();
  beginShape();
  vertex(0, height);
  vertex(0, height * 0.75);
  // Montañas onduladas
  for (let x = 0; x <= width; x += 20) {
    let y = height * 0.75 + sin(x * 0.01 + cloudOffset * 0.1) * 10;
    vertex(x, y);
  }
  vertex(width, height * 0.75);
  vertex(width, height);
  endShape(CLOSE);

  // Efectos atmosféricos: Niebla y partículas en la distancia
  // Niebla gradiente en el horizonte
  for (let y = height * 0.6; y < height * 0.8; y++) {
    let alpha = map(y, height * 0.6, height * 0.8, 0, 60);
    let fogColor = color(200, 220, 230, alpha);
    stroke(fogColor);
    strokeWeight(1);
    line(0, y, width, y);
  }

  // Partículas flotantes en la distancia (simulando polvo o humedad)
  for (let i = 0; i < 50; i++) {
    let x = (frameCount * 0.5 + i * 23) % (width + 100) - 50;
    let y = height * 0.65 + sin(frameCount * 0.01 + i) * 20 + random(-5, 5);
    let size = random(1, 3);
    let alpha = map(y, height * 0.6, height * 0.8, 20, 80);
    fill(255, 255, 255, alpha);
    noStroke();
    ellipse(x, y, size, size);
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

  // Variables para efectos visuales mejorados
  let lightDirection = createVector(0.5, -0.8, 0.3).normalize(); // Dirección de la luz
  let wingNormal = createVector(0, 0, 1); // Normal del ala (hacia arriba)

  // Calcular intensidad de luz para efectos 3D
  let lightIntensity = max(0, lightDirection.dot(wingNormal));

  // ===== TEXTURA METÁLICA CON GRADIENTES =====
  // Base metálica con gradiente
  for (let layer = 0; layer < 3; layer++) {
    let alpha = map(layer, 0, 2, 255, 180);
    let metallicColor = color(
      map(layer, 0, 2, 80, 120),  // Más claro en capas superiores
      map(layer, 0, 2, 85, 125),
      map(layer, 0, 2, 95, 135)
    );

    fill(red(metallicColor), green(metallicColor), blue(metallicColor), alpha);
    stroke(red(metallicColor) * 0.8, green(metallicColor) * 0.8, blue(metallicColor) * 0.8, alpha * 0.8);
    strokeWeight(1);

    // Dibujar perfil con gradiente metálico
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

  // ===== BRILLOS METÁLICOS =====
  // Brillos especulares en la superficie
  stroke(255, 255, 255, 150);
  strokeWeight(1);
  noFill();

  // Brillo principal (highlight)
  beginShape();
  vertex(leadingEdgeX + 10, leadingEdgeY - 5);
  bezierVertex(-80, -15, -20, -25, 20, -30);
  bezierVertex(80, -30, 140, -20, 170, -10);
  endShape();

  // Brillos secundarios
  stroke(255, 255, 255, 80);
  beginShape();
  vertex(leadingEdgeX + 20, leadingEdgeY - 2);
  bezierVertex(-60, -8, 0, -12, 40, -15);
  bezierVertex(100, -15, 150, -8, 180, -3);
  endShape();

  // ===== SOMBRAS 3D =====
  // Sombras volumétricas basadas en dirección de luz
  push();
  translate(3, 3); // Offset para sombra
  fill(0, 0, 0, 40 * (1 - lightIntensity));
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
  let arrowLength = 15;
  line(leadingEdgeX - arrowLength, leadingEdgeY, leadingEdgeX - 5, leadingEdgeY);
  line(leadingEdgeX - 8, leadingEdgeY - 3, leadingEdgeX - 5, leadingEdgeY);
  line(leadingEdgeX - 8, leadingEdgeY + 3, leadingEdgeX - 5, leadingEdgeY);

  pop();

  // HUD (Head-Up Display) - Información superpuesta en el avión
  push();
  translate(width / 2 - 280, height / 2);
  scale(1.3);

  // Horizonte artificial (línea de vuelo)
  stroke(0, 255, 0, 180);
  strokeWeight(2);
  line(-50, 0, 50, 0); // Línea horizontal del horizonte

  // Marcas de ángulo de ataque
  stroke(0, 255, 0, 120);
  strokeWeight(1);
  for (let i = -30; i <= 30; i += 10) {
    let y = i * 0.5;
    line(-20, y, -10, y);
    line(10, y, 20, y);
  }

  // Indicador de velocidad (vector de velocidad)
  let speedVectorLength = map(windSpeed, 0, 100, 20, 60);
  stroke(255, 255, 0, 200); // Amarillo para velocidad
  strokeWeight(3);
  line(0, 0, speedVectorLength, 0);
  // Punta de flecha
  fill(255, 255, 0, 200);
  noStroke();
  triangle(speedVectorLength, 0, speedVectorLength - 8, -3, speedVectorLength - 8, 3);

  // Indicador de altitud (escala vertical)
  stroke(0, 255, 255, 150); // Cyan para altitud
  strokeWeight(2);
  line(-60, -30, -60, 30);
  // Marcas de altitud
  for (let i = -20; i <= 20; i += 10) {
    line(-65, i, -55, i);
  }
  // Indicador actual
  let altIndicatorY = map(altitude, 0, 10000, 20, -20);
  fill(0, 255, 255, 200);
  noStroke();
  ellipse(-60, altIndicatorY, 6, 6);

  // Indicador de sustentación (barra lateral)
  let liftBarHeight = map(liftMagnitude, 0, 200, 0, 40);
  stroke(255, 0, 255, 180); // Magenta para sustentación
  strokeWeight(4);
  line(70, 20, 70, 20 - liftBarHeight);
  // Base de la barra
  fill(255, 0, 255, 100);
  noStroke();
  rect(65, 15, 10, 10);

  // Texto HUD
  fill(0, 255, 0, 220);
  textAlign(CENTER);
  textSize(8);
  text(Math.round(windSpeed) + ' m/s', 40, -25);
  text(Math.round(altitude) + ' m', -40, -25);
  text(Math.round(liftMagnitude) + ' N', 40, 35);

  pop();

  // Update and draw aerodynamic flow particles
  updateFlowParticles();
  drawFlowParticles();

  // Enhanced aerodynamic flow visualization following NACA 2412 profile
  noFill();

  // Upper surface flow (fast air, low pressure) - accelerated flow with NACA contour following
  for (let i = 0; i < 8; i++) {
    // Position flows around the transformed wing (centered at width/2, height/2, scaled by 1.4)
    let wingCenterX = width / 2;
    let wingCenterY = height / 2;
    let wingScale = 1.4;

    // Local coordinates relative to wing center, then scale
    let localX = (-100 + i * 25) * wingScale; // Spread around wing horizontally - reduced spread
    let localY = (-60 - i * 6) * wingScale;  // Above wing vertically - moderate separation

    let baseX = wingCenterX + localX;
    let baseY = wingCenterY + localY;

    let speed = 4.5 + sin(angleAttack) * 1.0; // Higher speed variation
    let curveOffset = angleAttack * 45; // More pronounced curve
    let turbulence = sin(frameCount * 0.15 + i) * 3; // More turbulence

    // Enhanced color gradient (green/white for upper surface - high speed, better contrast with blue sky)
    let velocityRatio = map(speed, 3.5, 5.5, 0, 1);
    let flowColor = lerpColor(color(100, 255, 100), color(200, 255, 200), velocityRatio);
    stroke(red(flowColor), green(flowColor), blue(flowColor), 180);
    strokeWeight(2.5);

    // Smooth aerodynamic flow lines following NACA 2412 upper surface
    beginShape();
    noFill();
    // Start far upstream
    vertex(baseX - 120 * wingScale, baseY + turbulence);

    // Smooth approach to leading edge
    bezierVertex(baseX - 80 * wingScale, baseY - 5 * wingScale + turbulence,
                 baseX - 40 * wingScale, baseY - 12 * wingScale + turbulence,
                 baseX - 10 * wingScale, baseY - 20 * wingScale + turbulence);

    // Follow upper surface curvature more accurately
    bezierVertex(baseX + 15 * wingScale, baseY - 32 * wingScale - curveOffset * 0.6 + turbulence,
                 baseX + 45 * wingScale, baseY - 38 * wingScale - curveOffset * 0.8 + turbulence,
                 baseX + 75 * wingScale, baseY - 35 * wingScale - curveOffset + turbulence);

    // Continue along the wing with proper NACA curvature
    bezierVertex(baseX + 105 * wingScale, baseY - 30 * wingScale - curveOffset * 0.9 + turbulence,
                 baseX + 135 * wingScale, baseY - 22 * wingScale - curveOffset * 0.7 + turbulence,
                 baseX + 165 * wingScale, baseY - 15 * wingScale - curveOffset * 0.5 + turbulence);

    // Trailing edge departure
    bezierVertex(baseX + 195 * wingScale, baseY - 8 * wingScale - curveOffset * 0.3 + turbulence,
                 baseX + 225 * wingScale, baseY + 2 * wingScale + turbulence,
                 baseX + 255 * wingScale, baseY + 12 * wingScale + turbulence);
    endShape();
    bezierVertex(baseX + 270 * wingScale, baseY - 5 * wingScale - curveOffset * 0.3 + turbulence,
                 baseX + 310 * wingScale, baseY + 5 * wingScale + turbulence,
                 baseX + 350 * wingScale, baseY + 15 * wingScale + turbulence);
    endShape();

    // Multiple velocity vectors with faster animation for upper surface
    let arrowPositions = [
      {t: 0.15, size: 5.0},
      {t: 0.35, size: 6.0},
      {t: 0.55, size: 6.5},
      {t: 0.75, size: 5.5},
      {t: 0.9, size: 5.0}
    ];

    for (let arrow of arrowPositions) {
      // Calculate position along the complex Bézier curve (simplified for upper surface)
      let t = arrow.t;
      let wingCenterX = width/2;
      let wingCenterY = height/2;

      // Approximate position along the new smooth upper surface streamline
      let arrowX, arrowY;
      if (t < 0.25) {
        // Leading edge approach - follow the smooth curve
        let localT = t / 0.25;
        arrowX = baseX - 120 * wingScale + 110 * wingScale * localT;
        arrowY = baseY + turbulence - 20 * wingScale * localT;
      } else if (t < 0.6) {
        // Along wing surface - follow curvature
        let localT = (t - 0.25) / 0.35;
        arrowX = baseX - 10 * wingScale + 85 * wingScale * localT;
        arrowY = baseY - 20 * wingScale - curveOffset * 0.8 + turbulence - 18 * wingScale * localT;
      } else {
        // Trailing edge exit - smooth departure
        let localT = (t - 0.6) / 0.4;
        arrowX = baseX + 75 * wingScale + 180 * wingScale * localT;
        arrowY = baseY - 35 * wingScale + 47 * wingScale * localT + turbulence;
      }

      // Calculate tangent direction
      let tangentX = 1; // Simplified - mostly horizontal flow
      let tangentY = t < 0.5 ? -0.4 : 0.3; // Curve down then up

      let tangentLength = sqrt(tangentX*tangentX + tangentY*tangentY);
      tangentX /= tangentLength;
      tangentY /= tangentLength;

      let arrowLength = 28 * wingScale;
      let arrowEndX = arrowX + tangentX * arrowLength;
      let arrowEndY = arrowY + tangentY * arrowLength;

      drawArrowOnCurve(arrowX, arrowY, arrowEndX, arrowEndY, flowColor, arrow.size * 1.2);
    }

    // Enhanced particles with faster movement for upper surface - follow smooth flow
    for (let p = 0; p < 15; p++) {
      let t = (frameCount * 0.035 + p * 0.15 + i * 0.06) % (TWO_PI * 3);
      let particleX = baseX - 120 * wingScale + t * 25 * wingScale + sin(t * 3.5 + i) * 8 * wingScale;
      let particleY = baseY + turbulence - 20 * wingScale + sin(t * 4.5 + i) * 6 * wingScale + cos(t * 2.8 + i) * 5 * wingScale;
      let particleSize = map(speed, 3.5, 5.5, 2.5, 6.0);
      let particleAlpha = map(sin(t * 6), -1, 1, 120, 255);

      fill(red(flowColor), green(flowColor), blue(flowColor), particleAlpha);
      noStroke();
      ellipse(particleX, particleY, particleSize, particleSize);
    }
  }

  // Lower surface flow (slow air, high pressure) - decelerated flow with NACA contour following
  for (let i = 0; i < 8; i++) {
    // Position flows around the transformed wing (centered at width/2, height/2, scaled by 1.4)
    let wingCenterX = width / 2;
    let wingCenterY = height / 2;
    let wingScale = 1.4;

    // Local coordinates relative to wing center, then scale
    let localX = (-100 + i * 25) * wingScale; // Spread around wing horizontally - reduced spread
    let localY = (40 + i * 6) * wingScale;   // Below wing vertically - moderate separation

    let baseX = wingCenterX + localX;
    let baseY = wingCenterY + localY;

    let speed = 2.0 + sin(angleAttack) * 0.5; // Slower speed variation
    let curveOffset = angleAttack * 35; // More pronounced curve
    let turbulence = sin(frameCount * 0.08 + i) * 2; // Less turbulence

    // Enhanced color gradient (orange/red for lower surface - high pressure)
    let velocityRatio = map(speed, 1.5, 2.5, 0, 1);
    let flowColor = lerpColor(color(255, 120, 0), color(255, 80, 0), velocityRatio);
    stroke(red(flowColor), green(flowColor), blue(flowColor), 180);
    strokeWeight(2.5);

    // Smooth aerodynamic flow lines following NACA 2412 lower surface
    beginShape();
    noFill();
    // Start far upstream
    vertex(baseX - 120 * wingScale, baseY + turbulence);

    // Smooth approach to leading edge
    bezierVertex(baseX - 80 * wingScale, baseY + 8 * wingScale + turbulence,
                 baseX - 40 * wingScale, baseY + 18 * wingScale + turbulence,
                 baseX - 10 * wingScale, baseY + 28 * wingScale + turbulence);

    // Follow lower surface curvature more accurately
    bezierVertex(baseX + 15 * wingScale, baseY + 38 * wingScale + curveOffset * 0.6 + turbulence,
                 baseX + 45 * wingScale, baseY + 42 * wingScale + curveOffset * 0.8 + turbulence,
                 baseX + 75 * wingScale, baseY + 38 * wingScale + curveOffset + turbulence);

    // Continue along the wing with proper NACA curvature
    bezierVertex(baseX + 105 * wingScale, baseY + 30 * wingScale + curveOffset * 0.9 + turbulence,
                 baseX + 135 * wingScale, baseY + 22 * wingScale + curveOffset * 0.7 + turbulence,
                 baseX + 165 * wingScale, baseY + 15 * wingScale + curveOffset * 0.5 + turbulence);

    // Trailing edge departure
    bezierVertex(baseX + 195 * wingScale, baseY + 8 * wingScale + curveOffset * 0.3 + turbulence,
                 baseX + 225 * wingScale, baseY - 2 * wingScale + turbulence,
                 baseX + 255 * wingScale, baseY - 12 * wingScale + turbulence);
    endShape();

    // Multiple velocity vectors with slower animation for lower surface
    let arrowPositions = [
      {t: 0.15, size: 4.8},
      {t: 0.35, size: 5.5},
      {t: 0.55, size: 6.0},
      {t: 0.75, size: 5.2},
      {t: 0.9, size: 4.8}
    ];

    for (let arrow of arrowPositions) {
      // Calculate position along the complex Bézier curve (simplified for lower surface)
      let t = arrow.t;

      // Approximate position along the new smooth lower surface streamline
      let arrowX, arrowY;
      if (t < 0.25) {
        // Leading edge approach - follow the smooth curve
        let localT = t / 0.25;
        arrowX = baseX - 120 * wingScale + 110 * wingScale * localT;
        arrowY = baseY + turbulence + 28 * wingScale * localT;
      } else if (t < 0.6) {
        // Along wing surface - follow curvature
        let localT = (t - 0.25) / 0.35;
        arrowX = baseX - 10 * wingScale + 85 * wingScale * localT;
        arrowY = baseY + 28 * wingScale + curveOffset * 0.8 + turbulence + 10 * wingScale * localT;
      } else {
        // Trailing edge exit - smooth departure
        let localT = (t - 0.6) / 0.4;
        arrowX = baseX + 75 * wingScale + 180 * wingScale * localT;
        arrowY = baseY + 38 * wingScale - 50 * wingScale * localT + turbulence;
      }

      // Calculate tangent direction
      let tangentX = 1; // Simplified - mostly horizontal flow
      let tangentY = t < 0.5 ? 0.4 : -0.3; // Curve up then down

      let tangentLength = sqrt(tangentX*tangentX + tangentY*tangentY);
      tangentX /= tangentLength;
      tangentY /= tangentLength;

      let arrowLength = 24 * wingScale; // Better sized arrows for lower surface
      let arrowEndX = arrowX + tangentX * arrowLength;
      let arrowEndY = arrowY + tangentY * arrowLength;

      drawArrowOnCurve(arrowX, arrowY, arrowEndX, arrowEndY, flowColor, arrow.size * 1.2);
    }

    // Enhanced particles with slower movement for lower surface - follow smooth flow
    for (let p = 0; p < 12; p++) {
      let t = (frameCount * 0.018 + p * 0.18 + i * 0.07) % (TWO_PI * 3);
      let particleX = baseX - 120 * wingScale + t * 22 * wingScale + sin(t * 2.2 + i) * 6 * wingScale;
      let particleY = baseY + turbulence + 28 * wingScale + sin(t * 3.2 + i) * 5 * wingScale + cos(t * 2.1 + i) * 4 * wingScale;
      let particleSize = map(speed, 1.5, 2.5, 2.2, 5.5);
      let particleAlpha = map(sin(t * 4), -1, 1, 100, 240);

      fill(red(flowColor), green(flowColor), blue(flowColor), particleAlpha);
      noStroke();
      ellipse(particleX, particleY, particleSize, particleSize);
    }
  }

  // Flow separation effects during stall (high angle of attack)
  let alpha_deg = degrees(angleAttack);
  if (alpha_deg > 12) {
    let separationIntensity = map(alpha_deg, 12, 25, 0, 1);
    separationIntensity = constrain(separationIntensity, 0, 1);

    // Separated flow region behind the wing
    fill(150, 150, 150, 80 * separationIntensity);
    noStroke();
    beginShape();
    vertex(width/2 + 100, height/2 - 30);
    bezierVertex(width/2 + 150, height/2 - 20, width/2 + 200, height/2 + 10, width/2 + 250, height/2 + 20);
    bezierVertex(width/2 + 200, height/2 + 40, width/2 + 150, height/2 + 50, width/2 + 100, height/2 + 30);
    endShape(CLOSE);

    // Turbulent recirculation particles
    for (let i = 0; i < 20 * separationIntensity; i++) {
      let x = width/2 + 120 + random(-30, 80);
      let y = height/2 + random(-20, 40);
      let size = random(1, 3);
      let alpha = random(50, 150) * separationIntensity;

      fill(100, 100, 100, alpha);
      noStroke();
      ellipse(x + sin(frameCount * 0.3 + i) * 5, y + cos(frameCount * 0.2 + i) * 3, size, size);
    }

    // Separated flow lines showing recirculation
    stroke(100, 100, 100, 120 * separationIntensity);
    strokeWeight(1);
    noFill();
    for (let i = 0; i < 5; i++) {
      let startX = width/2 + 100 + i * 10;
      let startY = height/2 - 25 + i * 5;
      beginShape();
      for (let t = 0; t < 20; t++) {
        let x = startX + t * 8 + sin(t * 0.5 + frameCount * 0.1 + i) * 15;
        let y = startY + t * 2 + cos(t * 0.3 + frameCount * 0.15 + i) * 10;
        vertex(x, y);
      }
      endShape();
    }
  }

  // Wingtip vortices - swirling motion at wing tips
  let vortexStrength = map(alpha_deg, 0, 20, 0.3, 1);
  vortexStrength = constrain(vortexStrength, 0.3, 1);

  // Left wingtip vortex
  let leftTipX = width/2 - 280 * 1.3 - 50;
  let leftTipY = height/2 - 20;
  drawVortex(leftTipX, leftTipY, vortexStrength, -1); // Counter-clockwise

  // Right wingtip vortex
  let rightTipX = width/2 - 280 * 1.3 + 450;
  let rightTipY = height/2 - 20;
  drawVortex(rightTipX, rightTipY, vortexStrength, 1); // Clockwise

  stroke(255, 255, 100, 150); // Yellow boundary layer
  strokeWeight(1);
  noFill();
  // Upper boundary layer
  beginShape();
  for (let x = width/2 - 150; x <= width/2 + 150; x += 5) {
    let localX = x - (width/2 - 150);
    let yt = 0.12 * (0.2969 * sqrt(localX/300) - 0.126 * (localX/300) - 0.3516 * pow(localX/300, 2) + 0.2843 * pow(localX/300, 3) - 0.1015 * pow(localX/300, 4)) * 80;
    let boundaryY = height/2 - yt - 2 + sin(frameCount * 0.2 + localX * 0.01) * 1;
    vertex(x, boundaryY);
  }
  endShape();
  // Lower boundary layer
  beginShape();
  for (let x = width/2 + 150; x >= width/2 - 150; x -= 5) {
    let localX = x - (width/2 - 150);
    let yb = -0.12 * (0.2969 * sqrt(localX/300) - 0.126 * (localX/300) - 0.3516 * pow(localX/300, 2) + 0.2843 * pow(localX/300, 3) - 0.1015 * pow(localX/300, 4)) * 80;
    let boundaryY = height/2 - yb + 2 + sin(frameCount * 0.2 + localX * 0.01) * 1;
    vertex(x, boundaryY);
  }
  endShape();

  // Enhanced pressure visualization with dynamic colors and contours
  // Calculate pressure difference for color intensity
  let pressureDiff = P1 - P2; // P1 is upper (low), P2 is lower (high)
  let pressureIntensity = map(abs(pressureDiff), 0, 2000, 0.3, 1);
  pressureIntensity = constrain(pressureIntensity, 0.3, 1);

  // High pressure region (red gradient) below the wing
  for (let layer = 0; layer < 5; layer++) {
    let alpha = map(layer, 0, 4, 40, 10) * pressureIntensity;
    let redIntensity = map(layer, 0, 4, 255, 200);
    fill(redIntensity, 100, 100, alpha);
    noStroke();
    beginShape();
    for (let x = width/2 - 140; x <= width/2 + 140; x += 5) {
      let localX = x - (width/2 - 150);
      let yb = -0.12 * (0.2969 * sqrt(localX/300) - 0.126 * (localX/300) - 0.3516 * pow(localX/300, 2) + 0.2843 * pow(localX/300, 3) - 0.1015 * pow(localX/300, 4)) * 80;
      let pressureY = height/2 - yb + 5 + layer * 2;
      vertex(x, pressureY);
    }
    vertex(width/2 + 140, height/2 + 60 + layer * 2);
    vertex(width/2 - 140, height/2 + 60 + layer * 2);
    endShape(CLOSE);
  }

  // Low pressure region (blue gradient) above the wing
  for (let layer = 0; layer < 5; layer++) {
    let alpha = map(layer, 0, 4, 30, 8) * pressureIntensity;
    let blueIntensity = map(layer, 0, 4, 255, 200);
    fill(100, 150, blueIntensity, alpha);
    noStroke();
    beginShape();
    for (let x = width/2 - 140; x <= width/2 + 140; x += 5) {
      let localX = x - (width/2 - 150);
      let yt = 0.12 * (0.2969 * sqrt(localX/300) - 0.126 * (localX/300) - 0.3516 * pow(localX/300, 2) + 0.2843 * pow(localX/300, 3) - 0.1015 * pow(localX/300, 4)) * 80;
      let pressureY = height/2 - yt - 5 - layer * 2;
      vertex(x, pressureY);
    }
    vertex(width/2 + 140, height/2 - 60 - layer * 2);
    vertex(width/2 - 140, height/2 - 60 - layer * 2);
    endShape(CLOSE);
  }

  // Pressure contour lines (isobars)
  stroke(255, 255, 255, 100);
  strokeWeight(1);
  noFill();
  // High pressure contours
  for (let i = 0; i < 3; i++) {
    beginShape();
    for (let x = width/2 - 120; x <= width/2 + 120; x += 3) {
      let localX = x - (width/2 - 150);
      let yb = -0.12 * (0.2969 * sqrt(localX/300) - 0.126 * (localX/300) - 0.3516 * pow(localX/300, 2) + 0.2843 * pow(localX/300, 3) - 0.1015 * pow(localX/300, 4)) * 80;
      let contourY = height/2 - yb + 10 + i * 8 + sin(x * 0.02 + frameCount * 0.05) * 2;
      vertex(x, contourY);
    }
    endShape();
  }

  // Low pressure contours
  stroke(200, 220, 255, 100);
  for (let i = 0; i < 3; i++) {
    beginShape();
    for (let x = width/2 - 120; x <= width/2 + 120; x += 3) {
      let localX = x - (width/2 - 150);
      let yt = 0.12 * (0.2969 * sqrt(localX/300) - 0.126 * (localX/300) - 0.3516 * pow(localX/300, 2) + 0.2843 * pow(localX/300, 3) - 0.1015 * pow(localX/300, 4)) * 80;
      let contourY = height/2 - yt - 10 - i * 8 + sin(x * 0.02 + frameCount * 0.05) * 2;
      vertex(x, contourY);
    }
    endShape();
  }

  // Flecha de Sustentación (azul, oscilante y dinámica) - emerge del borde de ataque
  let liftLength = liftMagnitude / 5;
  let oscillation = sin(frameCount * 0.1) * 5; // Oscilación ligera
  let leadingEdgeWorldX = width / 2 - 180 * 1.4; // Posición del borde de ataque en coordenadas del mundo
  let leadingEdgeWorldY = height / 2; // Centro vertical

  drawArrow(leadingEdgeWorldX, leadingEdgeWorldY + oscillation,
           leadingEdgeWorldX, leadingEdgeWorldY - liftLength + oscillation, 'blue', 6);
  fill(0, 100, 255);
  textSize(16);
  text('Sustentación', leadingEdgeWorldX + 20, leadingEdgeWorldY - liftLength / 2 + oscillation);

  // Flecha de Peso (rojo, emerge del borde de ataque hacia abajo)
  drawArrow(leadingEdgeWorldX, leadingEdgeWorldY,
           leadingEdgeWorldX, leadingEdgeWorldY + 80, 'red', 6);
  fill(255, 0, 0);
  text('Peso', leadingEdgeWorldX + 20, leadingEdgeWorldY + 90);

  // Etiquetas de flujo
  textAlign(LEFT);
  fill(173, 216, 230);
  textSize(14);
  text('Aire Rápido (Baja P)', 50, height / 2 - 80);
  fill(255, 160, 122);
  text('Aire Lento (Alta P)', 50, height / 2 + 100);

  // Update instrument panel gauges
  updateGauges();

  // Update weather effects
  updateWeather();

  // Close camera transformation
  pop();

}

function resetSimulation() {
  angleSlider.value(5);
  windSlider.value(70);
  altitudeSlider.value(0);
  massSlider.value(80);
  updateParameters();
}

function showTutorial() {
  select('#tutorial-modal').style('display', 'block');
}

function hideTutorial() {
  select('#tutorial-modal').style('display', 'none');
}

function exportData() {
  let data = {
    angle: angleSlider.value(),
    windSpeed: windSlider.value(),
    altitude: altitudeSlider.value(),
    mass: massSlider.value(),
    lift: liftMagnitude,
    weight: weight,
    rho: rho,
    v1: windSpeed + 10 * sin(angleAttack),
    v2: windSpeed - 10 * sin(angleAttack),
    P1: 101325 - 0.5 * rho * ((windSpeed + 10 * sin(angleAttack))**2 - windSpeed**2),
    P2: 101325 - 0.5 * rho * ((windSpeed - 10 * sin(angleAttack))**2 - windSpeed**2)
  };
  saveJSON(data, 'aerodynamics_data.json');
}

function saveConfiguration() {
  let config = {
    angle: angleSlider.value(),
    wind: windSlider.value(),
    altitude: altitudeSlider.value(),
    mass: massSlider.value()
  };
  localStorage.setItem('aerodynamicsConfig', JSON.stringify(config));
  alert('Configuración guardada');
}

function loadConfiguration() {
  let config = localStorage.getItem('aerodynamicsConfig');
  if (config) {
    config = JSON.parse(config);
    angleSlider.value(config.angle);
    windSlider.value(config.wind);
    altitudeSlider.value(config.altitude);
    massSlider.value(config.mass);
    updateParameters();
    alert('Configuración cargada');
  } else {
    alert('No hay configuración guardada');
  }
}

function drawArrow(x1, y1, x2, y2, color, weight = 4) {
  stroke(color);
  strokeWeight(weight);
  line(x1, y1, x2, y2);
  let angle = atan2(y2 - y1, x2 - x1);
  push();
  translate(x2, y2);
  rotate(angle);
  fill(color);
  triangle(0, 0, -15, -7, -15, 7);
  pop();
}

function drawArrowOnCurve(x1, y1, x2, y2, color, weight = 4) {
  // Draw the arrow shaft with gradient
  let shaftLength = dist(x1, y1, x2, y2);
  let steps = 10;

  for (let i = 0; i < steps; i++) {
    let t1 = i / steps;
    let t2 = (i + 1) / steps;
    let alpha1 = map(t1, 0, 1, 50, 200);
    let alpha2 = map(t2, 0, 1, 50, 200);

    let px1 = lerp(x1, x2, t1);
    let py1 = lerp(y1, y2, t1);
    let px2 = lerp(x1, x2, t2);
    let py2 = lerp(y1, y2, t2);

    stroke(red(color), green(color), blue(color), alpha1);
    strokeWeight(weight * (1 - t1 * 0.3)); // Shaft tapers
    line(px1, py1, px2, py2);
  }

  // Draw aerodynamic arrowhead
  let angle = atan2(y2 - y1, x2 - x1);
  push();
  translate(x2, y2);
  rotate(angle);

  // Main arrowhead triangle
  fill(red(color), green(color), blue(color), 220);
  stroke(red(color), green(color), blue(color), 180);
  strokeWeight(2);
  triangle(0, 0, -18, -7, -18, 7);

  // Arrowhead details for more aerodynamic look
  fill(red(color), green(color), blue(color), 150);
  triangle(0, 0, -12, -4, -12, 4);

  pop();
}

function drawVortex(centerX, centerY, strength, direction) {
  // Draw swirling vortex with particles
  let radius = 30 * strength;
  let particleCount = Math.floor(15 * strength);

  // Vortex core
  fill(100, 150, 200, 100 * strength);
  noStroke();
  ellipse(centerX, centerY, radius * 0.3, radius * 0.3);

  // Swirling particles
  for (let i = 0; i < particleCount; i++) {
    let angle = (frameCount * 0.1 * direction + i * TWO_PI / particleCount) % TWO_PI;
    let distance = map(i, 0, particleCount - 1, radius * 0.4, radius);
    let x = centerX + cos(angle) * distance;
    let y = centerY + sin(angle) * distance;

    // Add some turbulence
    x += sin(frameCount * 0.2 + i) * 3;
    y += cos(frameCount * 0.15 + i) * 3;

    let alpha = map(distance, 0, radius, 150, 50) * strength;
    fill(150, 200, 255, alpha);
    noStroke();
    ellipse(x, y, 2, 2);
  }

  // Vortex flow lines
  stroke(100, 150, 200, 80 * strength);
  strokeWeight(1);
  noFill();
  for (let i = 0; i < 3; i++) {
    beginShape();
    for (let t = 0; t < TWO_PI; t += 0.1) {
      let r = radius * 0.5 + i * 8;
      let angle = t + frameCount * 0.05 * direction + i * 0.5;
      let x = centerX + cos(angle) * r;
      let y = centerY + sin(angle) * r;
      vertex(x, y);
    }
    endShape();
  }
}

// Instrument Panel Gauges
let airspeedGauge, altitudeGauge, angleGauge, liftGauge;

function setupGauges() {
  // Create gauge canvases
  airspeedGauge = createGraphics(120, 120);
  altitudeGauge = createGraphics(120, 120);
  angleGauge = createGraphics(120, 120);
  liftGauge = createGraphics(120, 120);

  // Position them in the gauge divs
  airspeedGauge.parent('airspeed-gauge');
  altitudeGauge.parent('altitude-gauge');
  angleGauge.parent('angle-gauge');
  liftGauge.parent('lift-gauge');
}

function drawGauge(g, value, minVal, maxVal, label, unit, color = '#00ff00') {
  g.clear();
  g.background(0);

  let centerX = g.width / 2;
  let centerY = g.height / 2;
  let radius = 45;

  // Draw gauge background
  g.stroke(100);
  g.strokeWeight(2);
  g.noFill();
  g.ellipse(centerX, centerY, radius * 2);

  // Draw scale marks
  g.stroke(150);
  g.strokeWeight(1);
  for (let i = 0; i <= 10; i++) {
    let angle = map(i, 0, 10, -PI * 0.75, PI * 0.75);
    let x1 = centerX + cos(angle) * (radius - 5);
    let y1 = centerY + sin(angle) * (radius - 5);
    let x2 = centerX + cos(angle) * radius;
    let y2 = centerY + sin(angle) * radius;
    g.line(x1, y1, x2, y2);

    // Draw numbers
    if (i % 2 === 0) {
      let numVal = map(i, 0, 10, minVal, maxVal);
      let textX = centerX + cos(angle) * (radius - 15);
      let textY = centerY + sin(angle) * (radius - 15);
      g.fill(200);
      g.noStroke();
      g.textAlign(CENTER, CENTER);
      g.textSize(8);
      g.text(Math.round(numVal), textX, textY);
    }
  }

  // Draw needle
  let needleAngle = map(value, minVal, maxVal, -PI * 0.75, PI * 0.75);
  g.stroke(color);
  g.strokeWeight(3);
  let needleX = centerX + cos(needleAngle) * (radius - 10);
  let needleY = centerY + sin(needleAngle) * (radius - 10);
  g.line(centerX, centerY, needleX, needleY);

  // Draw center dot
  g.fill(color);
  g.noStroke();
  g.ellipse(centerX, centerY, 6);

  // Draw label
  g.fill(255);
  g.textAlign(CENTER, CENTER);
  g.textSize(10);
  g.text(label, centerX, centerY + radius + 10);
}

function updateGauges() {
  if (airspeedGauge && altitudeGauge && angleGauge && liftGauge) {
    drawGauge(airspeedGauge, windSpeed, 0, 100, 'AIRSPEED', 'm/s');
    drawGauge(altitudeGauge, altitude, 0, 10000, 'ALTITUDE', 'm');
    drawGauge(angleGauge, degrees(angleAttack), -10, 20, 'ANGLE', '°');
    drawGauge(liftGauge, liftMagnitude, 0, 200, 'LIFT', 'N');

    // Update gauge values in HTML
    select('#airspeed-value').html(Math.round(windSpeed));
    select('#altitude-gauge-value').html(Math.round(altitude));
    select('#angle-gauge-value').html(degrees(angleAttack).toFixed(1));
    select('#lift-gauge-value').html(Math.round(liftMagnitude));
  }
}

function initializeFlowParticles() {
  flowParticles = [];

  // Wing transformation parameters
  let wingCenterX = width/2;
  let wingCenterY = height/2;
  let scaleFactor = 1.4;
  let rotationAngle = angleAttack * 0.3;

  // Create particles for upper surface (faster flow)
  for (let i = 0; i < 15; i++) {
    // Start particles at random positions along the wing chord
    let chordPos = random(-160, 160); // Along chord length
    let upperOffset = random(-60, -20); // Above wing surface

    // Apply wing transformations to get screen coordinates
    let localX = chordPos;
    let localY = upperOffset;

    // Apply rotation
    let cosRot = cos(rotationAngle);
    let sinRot = sin(rotationAngle);
    let rotatedX = localX * cosRot - localY * sinRot;
    let rotatedY = localX * sinRot + localY * cosRot;

    // Apply scaling and translation
    let screenX = rotatedX * scaleFactor + wingCenterX;
    let screenY = rotatedY * scaleFactor + wingCenterY;

    flowParticles.push({
      x: screenX,
      y: screenY,
      vx: 2 + random(1),
      vy: 0,
      surface: 'upper',
      age: random(100),
      maxAge: 200 + random(100),
      size: 1.5 + random(1),
      trail: []
    });
  }

  // Create particles for lower surface (slower flow)
  for (let i = 0; i < 12; i++) {
    // Start particles at random positions along the wing chord
    let chordPos = random(-160, 160); // Along chord length
    let lowerOffset = random(15, 45); // Below wing surface

    // Apply wing transformations to get screen coordinates
    let localX = chordPos;
    let localY = lowerOffset;

    // Apply rotation
    let cosRot = cos(rotationAngle);
    let sinRot = sin(rotationAngle);
    let rotatedX = localX * cosRot - localY * sinRot;
    let rotatedY = localX * sinRot + localY * cosRot;

    // Apply scaling and translation
    let screenX = rotatedX * scaleFactor + wingCenterX;
    let screenY = rotatedY * scaleFactor + wingCenterY;

    flowParticles.push({
      x: screenX,
      y: screenY,
      vx: 1 + random(0.5),
      vy: 0,
      surface: 'lower',
      age: random(100),
      maxAge: 250 + random(100),
      size: 1.2 + random(0.8),
      trail: []
    });
  }
}

function updateFlowParticles() {
  for (let i = flowParticles.length - 1; i >= 0; i--) {
    let p = flowParticles[i];

    // Update trail
    p.trail.push({x: p.x, y: p.y});
    if (p.trail.length > 8) {
      p.trail.shift();
    }

    // Calculate wing-relative position
    let wingCenterX = width/2;
    let wingCenterY = height/2;
    let scaleFactor = 1.4;
    let rotationAngle = angleAttack * 0.3;

    // Transform particle position to wing coordinate system
    let localX = (p.x - wingCenterX) / scaleFactor;
    let localY = (p.y - wingCenterY) / scaleFactor;

    // Apply inverse rotation to get position relative to unrotated wing
    let cosRot = cos(-rotationAngle);
    let sinRot = sin(-rotationAngle);
    let wingLocalX = localX * cosRot - localY * sinRot;
    let wingLocalY = localX * sinRot + localY * cosRot;

    // Wing geometry parameters (NACA 2412 profile approximation)
    let chordLength = 360; // From leadingEdgeX -180 to trailing edge ~180
    let maxThickness = 55; // Maximum thickness of airfoil

    if (p.surface === 'upper') {
      // Upper surface: faster flow following NACA 2412 upper curve
      let t = map(wingLocalX, -180, 180, 0, 1); // Parameter along chord

      // NACA 2412 upper surface approximation using Bézier-like curve
      let upperY;
      if (t < 0.5) {
        // Leading edge region - more curved
        let curveFactor = sin(t * PI);
        upperY = -maxThickness * 0.5 * curveFactor * (1 - t*2);
      } else {
        // Trailing edge region - straighter
        let trailT = (t - 0.5) * 2;
        upperY = -maxThickness * 0.3 * (1 - trailT*trailT);
      }

      // Calculate desired Y position on upper surface
      let targetY = upperY;

      // Velocity based on position along chord (Bernoulli principle)
      let baseSpeed = map(t, 0, 1, 2.8, 2.2); // Faster at leading edge
      p.vx = baseSpeed + sin(wingLocalX * 0.008 + frameCount * 0.03) * 0.3;

      // Curve toward upper surface
      let surfaceOffset = wingLocalY - targetY;
      if (abs(surfaceOffset) > 5) {
        p.vy = -abs(surfaceOffset) * 0.1 - 0.05; // Curve toward surface
      } else {
        p.vy = sin(wingLocalX * 0.012 + frameCount * 0.025) * 0.15;
      }

      // Leading edge special handling
      if (wingLocalX > -180 && wingLocalX < -100) {
        let leadingFactor = map(wingLocalX, -180, -100, 1, 0);
        p.vy -= leadingFactor * 0.4; // Strong curve around leading edge
      }

    } else {
      // Lower surface: slower flow following NACA 2412 lower curve
      let t = map(wingLocalX, -180, 180, 0, 1);

      // NACA 2412 lower surface approximation
      let lowerY;
      if (t < 0.4) {
        // Leading edge region
        let curveFactor = sin(t * PI * 0.8);
        lowerY = maxThickness * 0.3 * curveFactor;
      } else {
        // Trailing edge region - cambered
        let trailT = (t - 0.4) / 0.6;
        lowerY = maxThickness * 0.15 * (1 - trailT);
      }

      // Calculate desired Y position on lower surface
      let targetY = lowerY;

      // Slower velocity on lower surface
      let baseSpeed = map(t, 0, 1, 1.4, 1.0);
      p.vx = baseSpeed + sin(wingLocalX * 0.005 + frameCount * 0.02) * 0.2;

      // Curve toward lower surface
      let surfaceOffset = wingLocalY - targetY;
      if (abs(surfaceOffset) > 5) {
        p.vy = surfaceOffset * 0.08 + 0.02; // Curve toward surface
      } else {
        p.vy = sin(wingLocalX * 0.008 + frameCount * 0.018) * 0.1;
      }

      // Leading edge special handling
      if (wingLocalX > -180 && wingLocalX < -120) {
        let leadingFactor = map(wingLocalX, -180, -120, 1, 0);
        p.vy += leadingFactor * 0.3; // Gentle curve around leading edge
      }
    }

    // Apply angle of attack effect
    let aoaEffect = sin(angleAttack) * 0.3;
    if (p.surface === 'upper') {
      p.vx += aoaEffect * 0.4;
      p.vy -= abs(aoaEffect) * 0.3;
    } else {
      p.vx -= aoaEffect * 0.2;
      p.vy += abs(aoaEffect) * 0.2;
    }

    // Update position
    p.x += p.vx;
    p.y += p.vy;

    // Age particle
    p.age++;

    // Reset particle if it goes off screen or gets too old
    if (p.x > width + 100 || p.age > p.maxAge) {
      if (p.surface === 'upper') {
        p.x = -50;
        p.y = height/2 - 80 - random(40); // Start above wing
      } else {
        p.x = -50;
        p.y = height/2 + 20 + random(40); // Start below wing
      }
      p.age = 0;
      p.trail = [];
    }
  }
}

function drawFlowParticles() {
  noStroke();
  
  for (let p of flowParticles) {
    // Draw trail
    for (let i = 0; i < p.trail.length - 1; i++) {
      let alpha = map(i, 0, p.trail.length - 1, 20, 80);
      let size = map(i, 0, p.trail.length - 1, p.size * 0.3, p.size * 0.8);
      
      if (p.surface === 'upper') {
        fill(0, 150, 255, alpha); // Blue for upper surface
      } else {
        fill(255, 150, 0, alpha); // Orange for lower surface
      }
      
      ellipse(p.trail[i].x, p.trail[i].y, size, size);
    }
    
    // Draw main particle
    if (p.surface === 'upper') {
      fill(0, 200, 255, 120);
    } else {
      fill(255, 200, 0, 100);
    }
    
    ellipse(p.x, p.y, p.size, p.size);
  }
}

function setWeather(weather) {
  currentWeather = weather;

  // Update button states
  select('#weather-clear').removeClass('active');
  select('#weather-rain').removeClass('active');
  select('#weather-snow').removeClass('active');
  select('#weather-storm').removeClass('active');

  select('#weather-' + weather).addClass('active');

  // Reset weather effects
  rainDrops = [];
  snowFlakes = [];
  lightningFlash = 0;
}

function updateWeather() {
  if (currentWeather === 'rain') {
    // Add new raindrops
    if (frameCount % 3 === 0) {
      rainDrops.push({
        x: random(width),
        y: 0,
        speed: random(8, 15),
        length: random(10, 20)
      });
    }

    // Update and draw raindrops
    for (let i = rainDrops.length - 1; i >= 0; i--) {
      let drop = rainDrops[i];
      drop.y += drop.speed;
      drop.x += windSpeed * 0.1; // Wind affects rain direction

      if (drop.y > height) {
        rainDrops.splice(i, 1);
      } else {
        stroke(150, 200, 255, 150);
        strokeWeight(2);
        line(drop.x, drop.y, drop.x + windSpeed * 0.05, drop.y + drop.length);
      }
    }

    // Limit raindrops for performance
    if (rainDrops.length > 200) {
      rainDrops.splice(0, rainDrops.length - 200);
    }

  } else if (currentWeather === 'snow') {
    // Add new snowflakes
    if (frameCount % 5 === 0) {
      snowFlakes.push({
        x: random(width),
        y: 0,
        speed: random(1, 3),
        size: random(2, 5),
        drift: random(-0.5, 0.5)
      });
    }

    // Update and draw snowflakes
    for (let i = snowFlakes.length - 1; i >= 0; i--) {
      let flake = snowFlakes[i];
      flake.y += flake.speed;
      flake.x += flake.drift + windSpeed * 0.02;

      if (flake.y > height) {
        snowFlakes.splice(i, 1);
      } else {
        fill(255, 255, 255, 200);
        noStroke();
        ellipse(flake.x, flake.y, flake.size, flake.size);
      }
    }

    // Limit snowflakes for performance
    if (snowFlakes.length > 150) {
      snowFlakes.splice(0, snowFlakes.length - 150);
    }

  } else if (currentWeather === 'storm') {
    // Rain effect
    if (frameCount % 2 === 0) {
      rainDrops.push({
        x: random(width),
        y: 0,
        speed: random(12, 20),
        length: random(15, 25)
      });
    }

    // Update rain
    for (let i = rainDrops.length - 1; i >= 0; i--) {
      let drop = rainDrops[i];
      drop.y += drop.speed;
      drop.x += windSpeed * 0.15; // Stronger wind effect

      if (drop.y > height) {
        rainDrops.splice(i, 1);
      } else {
        stroke(100, 150, 255, 180);
        strokeWeight(3);
        line(drop.x, drop.y, drop.x + windSpeed * 0.08, drop.y + drop.length);
      }
    }

    if (rainDrops.length > 300) {
      rainDrops.splice(0, rainDrops.length - 300);
    }

    // Lightning effect
    if (random() < 0.005) { // Random lightning
      lightningFlash = 255;
    }

    if (lightningFlash > 0) {
      fill(255, 255, 255, lightningFlash);
      rect(0, 0, width, height);
      lightningFlash -= 15;
    }

    // Darker sky during storm
    fill(50, 50, 80, 100);
    rect(0, 0, width, height);
  }
}

// API Integration Functions
async function fetchWeather() {
  try {
    // Using a free weather API (no key required for basic data)
    // For demonstration, we'll simulate weather data
    // In a real implementation, you would use something like:
    // const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current_weather=true');

    // Simulate API response with realistic weather data
    const mockWeatherData = {
      temperature: 15 + random(-5, 10), // 10-25°C
      windSpeed: 5 + random(0, 15), // 5-20 m/s
      windDirection: random(0, 360),
      humidity: 40 + random(0, 60), // 40-100%
      pressure: 1013 + random(-20, 20), // 993-1033 hPa
      visibility: 5 + random(0, 10), // 5-15 km
      conditions: ['clear', 'rain', 'snow', 'storm'][floor(random(4))]
    };

    // Update simulation parameters based on weather data
    windSpeed = constrain(mockWeatherData.windSpeed, 10, 100);
    windSlider.value(windSpeed);

    // Set weather conditions
    setWeather(mockWeatherData.conditions);

    // Update air density based on temperature and pressure
    let temperature = mockWeatherData.temperature + 273.15; // Convert to Kelvin
    rho = (mockWeatherData.pressure * 100) / (287.05 * temperature); // Ideal gas law

    console.log('Weather data updated:', mockWeatherData);
    alert('Datos meteorológicos actualizados desde API simulada');

  } catch (error) {
    console.error('Error fetching weather data:', error);
    alert('Error al obtener datos meteorológicos');
  }
}

async function fetchRandomAirplaneImage() {
  try {
    // Simulate fetching airplane data
    // In a real implementation, you would use FlightAware API or similar
    const mockAirplaneData = {
      model: ['Boeing 737', 'Airbus A320', 'Boeing 787', 'Airbus A350'][floor(random(4))],
      airline: ['Aerolineas Argentinas', 'LATAM', 'Iberia', 'American Airlines'][floor(random(4))],
      registration: 'LV-' + ['ABC', 'DEF', 'GHI', 'JKL'][floor(random(4))],
      imageUrl: null // Would be a real image URL from API
    };

    // Update airplane display info
    select('#airplane-info').html(
      `${mockAirplaneData.airline} - ${mockAirplaneData.model}<br>` +
      `Matrícula: ${mockAirplaneData.registration}`
    );

    console.log('Airplane data loaded:', mockAirplaneData);
    alert(`Avión cargado: ${mockAirplaneData.model} de ${mockAirplaneData.airline}`);

  } catch (error) {
    console.error('Error fetching airplane data:', error);
    alert('Error al cargar datos del avión');
  }
}