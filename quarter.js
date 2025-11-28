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
