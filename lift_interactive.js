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
  let P1 = 101325 - 0.5 * rho * (v1**2 - windSpeed**2);
  let P2 = 101325 - 0.5 * rho * (v2**2 - windSpeed**2);

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
    
    // Load different material textures for airplane parts
    const textureUrls = {
      fuselage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300', // Metallic surface
      wings: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300', // Aircraft aluminum
      engine: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300' // Engine material
    };
    
    // Load fuselage texture
    fuselageTexture = loadImage(textureUrls.fuselage, 
      () => console.log('Fuselage texture loaded'),
      () => console.error('Failed to load fuselage texture')
    );
    
    // Load wing texture
    wingTexture = loadImage(textureUrls.wings, 
      () => console.log('Wing texture loaded'),
      () => console.error('Failed to load wing texture')
    );
    
    // Load engine texture
    engineTexture = loadImage(textureUrls.engine, 
      () => console.log('Engine texture loaded'),
      () => console.error('Failed to load engine texture')
    );
    
    return true;
  } catch (error) {
    console.error('Failed to load material textures:', error);
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

  // Dibujar ala aerodinámica sólida y profesional (perfil NACA 2412 mejorado)
  push();
  translate(width / 2, height / 2); // Centrar el ala en el canvas
  scale(1.4); // Hacer el ala más grande para mejor visibilidad
  rotate(angleAttack * 0.3); // Rotación sutil

  // Perfil aerodinámico NACA 2412 mejorado - sólido y grueso
  fill(40, 40, 50); // Gris oscuro sólido
  stroke(20, 20, 30); // Borde negro
  strokeWeight(4);

  // Dibujar el perfil del ala usando curvas de Bezier para bordes suaves
  beginShape();

  // Borde de ataque (punto más grueso del perfil)
  let leadingEdgeX = -180;
  let leadingEdgeY = 0;

  // Curva superior (extrados) - usando Bezier para suavidad
  vertex(leadingEdgeX, leadingEdgeY);

  // Primera sección superior
  bezierVertex(-120, -25, -60, -45, 0, -55);
  // Segunda sección superior
  bezierVertex(60, -55, 120, -45, 180, -25);

  // Punta del ala (trailing edge superior)
  vertex(200, 0);

  // Curva inferior (intrados) - simétrica pero más plana
  vertex(200, 0);
  bezierVertex(180, 15, 120, 25, 60, 30);
  bezierVertex(0, 30, -60, 25, -120, 15);
  bezierVertex(-150, 8, leadingEdgeX, leadingEdgeY);

  endShape(CLOSE);

  // Añadir grosor adicional al perfil con un borde interior
  stroke(60, 60, 70);
  strokeWeight(2);
  noFill();
  beginShape();
  vertex(leadingEdgeX + 5, leadingEdgeY);
  bezierVertex(-115, -20, -55, -38, 5, -48);
  bezierVertex(65, -48, 125, -38, 185, -20);
  vertex(195, 0);
  bezierVertex(185, 10, 125, 18, 65, 23);
  bezierVertex(5, 23, -55, 18, -115, 10);
  bezierVertex(-145, 6, leadingEdgeX + 5, leadingEdgeY);
  endShape();

  // Borde de ataque reforzado (zona más gruesa)
  fill(20, 20, 30);
  noStroke();
  ellipse(leadingEdgeX, leadingEdgeY, 16, 12);

  // Detalles del ala
  // Flaps cuando ángulo > 15° - más prominentes
  if (angleAttack > radians(15)) {
    fill(100, 149, 237);
    stroke(80, 129, 217);
    strokeWeight(3);
    // Flaps superiores
    beginShape();
    vertex(120, -50);
    vertex(170, -45);
    vertex(175, -35);
    vertex(125, -40);
    endShape(CLOSE);

    // Flaps inferiores
    beginShape();
    vertex(120, 25);
    vertex(170, 20);
    vertex(175, 30);
    vertex(125, 35);
    endShape(CLOSE);
  }

  // Luz de navegación en la punta del ala - más visible
  fill(0, 255, 0);
  stroke(0, 150, 0);
  strokeWeight(2);
  ellipse(195, -8, 10, 10);
  fill(100, 255, 100, 150);
  noStroke();
  ellipse(195, -8, 20, 20);

  // Número de serie del ala - más visible
  fill(255);
  stroke(0);
  strokeWeight(1);
  textSize(10);
  textAlign(CENTER);
  text('NACA 2412', 0, 45);

  // Etiqueta del borde de ataque
  fill(255, 255, 0);
  textSize(8);
  text('Borde de Ataque', leadingEdgeX - 20, leadingEdgeY - 15);

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

  // Dynamic flow animation with improved realism
  flowOffset += 0.05;

  // Upper surface flow (fast air, low pressure) - accelerated flow
  stroke(135, 206, 235, 200); // Sky blue with transparency
  strokeWeight(2);
  noFill();
  for (let i = 0; i < 15; i++) {
    let baseY = height / 2 - 50 - i * 6;
    let speed = 4 + sin(angleAttack) * 0.8; // More dynamic speed variation
    let xOffset = (flowOffset * speed + i * 20) % (width + 300) - 150;
    let curveOffset = angleAttack * 25; // More pronounced curve
    let turbulence = sin(frameCount * 0.1 + i) * 3; // Add turbulence

    // Color gradient based on velocity (blue slow → red fast)
    let velocityRatio = map(speed, 3, 5, 0, 1);
    let flowColor = lerpColor(color(0, 100, 255), color(255, 100, 0), velocityRatio);
    stroke(red(flowColor), green(flowColor), blue(flowColor), 200);

    // Streamline that follows wing contour more realistically
    beginShape();
    vertex(xOffset, baseY + turbulence);
    bezierVertex(xOffset + 80, baseY - 15 - curveOffset + turbulence, xOffset + 180, baseY - 25 - curveOffset + turbulence, xOffset + 280, baseY - 8 - curveOffset + turbulence);
    endShape();

    // Velocity vectors (arrows) with varying sizes and colors
    let arrowSize = map(speed, 3, 5, 3, 5);
    drawArrowOnCurve(xOffset + 130, baseY - 20 - curveOffset + turbulence, xOffset + 150, baseY - 15 - curveOffset + turbulence, flowColor, arrowSize);

    // Enhanced particle system following streamlines
    for (let p = 0; p < 8; p++) {
      let t = (frameCount * 0.02 + p * 0.3 + i * 0.1) % (TWO_PI * 2);
      let particleX = xOffset + 50 + t * 60 + sin(t * 2 + i) * 5;
      let particleY = baseY - 20 - curveOffset + turbulence + sin(t * 3 + i) * 3 + cos(t * 1.5 + i) * 2;
      let particleSize = map(speed, 3, 5, 1, 2.5);
      let particleAlpha = map(sin(t * 4), -1, 1, 50, 150);

      fill(red(flowColor), green(flowColor), blue(flowColor), particleAlpha);
      noStroke();
      ellipse(particleX, particleY, particleSize, particleSize);
    }
  }

  // Lower surface flow (slow air, high pressure) - decelerated flow with particles
  stroke(255, 140, 100, 200); // Coral with transparency
  strokeWeight(2);
  for (let i = 0; i < 15; i++) {
    let baseY = height / 2 + 50 + i * 6;
    let speed = 1.5 + sin(angleAttack) * 0.3; // Slower variation
    let xOffset = (flowOffset * speed + i * 20) % (width + 300) - 150;
    let curveOffset = angleAttack * 18; // Less pronounced curve
    let turbulence = sin(frameCount * 0.08 + i) * 2; // Less turbulence

    // Color gradient based on velocity (blue slow → red fast)
    let velocityRatio = map(speed, 1, 2, 0, 1);
    let flowColor = lerpColor(color(0, 100, 255), color(255, 100, 0), velocityRatio);
    stroke(red(flowColor), green(flowColor), blue(flowColor), 200);

    // Streamline that curves below the wing
    beginShape();
    vertex(xOffset, baseY + turbulence);
    bezierVertex(xOffset + 80, baseY + 15 + curveOffset + turbulence, xOffset + 180, baseY + 25 + curveOffset + turbulence, xOffset + 280, baseY + 8 + curveOffset + turbulence);
    endShape();

    // Velocity vectors with smaller arrows and colors
    let arrowSize = map(speed, 1, 2, 2, 4);
    drawArrowOnCurve(xOffset + 130, baseY + 20 + curveOffset + turbulence, xOffset + 150, baseY + 15 + curveOffset + turbulence, flowColor, arrowSize);

    // Enhanced particle system following streamlines
    for (let p = 0; p < 6; p++) {
      let t = (frameCount * 0.015 + p * 0.4 + i * 0.1) % (TWO_PI * 2);
      let particleX = xOffset + 50 + t * 45 + sin(t * 1.5 + i) * 3;
      let particleY = baseY + 20 + curveOffset + turbulence + sin(t * 2 + i) * 2 + cos(t * 1.2 + i) * 1.5;
      let particleSize = map(speed, 1, 2, 1, 2);
      let particleAlpha = map(sin(t * 3), -1, 1, 40, 120);

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

  // Flecha de Sustentación (verde, oscilante y dinámica) - emerge del borde de ataque
  let liftLength = liftMagnitude / 5;
  let oscillation = sin(frameCount * 0.1) * 5; // Oscilación ligera
  let leadingEdgeWorldX = width / 2 - 180 * 1.4; // Posición del borde de ataque en coordenadas del mundo
  let leadingEdgeWorldY = height / 2; // Centro vertical

  drawArrow(leadingEdgeWorldX, leadingEdgeWorldY + oscillation,
           leadingEdgeWorldX, leadingEdgeWorldY - liftLength + oscillation, 'green', 6);
  fill(0, 255, 0);
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
  stroke(color);
  strokeWeight(weight);
  line(x1, y1, x2, y2);
  let angle = atan2(y2 - y1, x2 - x1);
  push();
  translate(x2, y2);
  rotate(angle);
  fill(color);
  triangle(0, 0, -10, -5, -10, 5);
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