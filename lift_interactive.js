let angleSlider, windSlider, altitudeSlider, massSlider;

// ===== ANIMACIÓN SUAVE DE SLIDERS =====
let angleTarget = 0, angleCurrent = 0;
let windTarget = 70, windCurrent = 70;
let altitudeTarget = 0, altitudeCurrent = 0;
let massTarget = 80, massCurrent = 80;
let sliderAnimationSpeed = 0.1; // Velocidad de interpolación (0-1)

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
let vortices = []; // Array of vortex effects at wing tips

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

// ===== CONTROLES EDUCATIVOS =====
let educationalLegendsCheckbox, pressureDiagramCheckbox, velocityDiagramCheckbox, forceDiagramCheckbox;
let tutorialModeBtn, comparisonModeBtn;

// ===== VARIABLES PARA CARACTERÍSTICAS EDUCATIVAS =====
// Leyendas interactivas
let showEducationalLegends = false;
let legendFontSize = 14;
let legendBoxWidth = 200;
let legendBoxHeight = 80;

// Diagramas superpuestos
let showPressureDiagram = false;
let showVelocityDiagram = false;
let showForceDiagram = false;

// ===== CONFIGURACIONES DE ACCESIBILIDAD =====
let highContrastMode = false;
let reducedMotion = false;
let accessibilityFontScale = 1.0; // Factor de escala para fuentes (1.0 = normal, 1.2 = 20% más grande, etc.)
let minFontSize = 12; // Tamaño mínimo de fuente para legibilidad

// Modo tutorial paso a paso
let tutorialMode = false;
let tutorialStep = 0;
let tutorialSteps = [
  "🎓 Bienvenido al Tutorial Interactivo de Aerodinámica\n\nDescubre los principios que permiten volar a los aviones",
  "✈️ El Ala y la Sustentación\n\nEl ala genera una fuerza hacia arriba llamada 'sustentación' que contrarresta el peso del avión",
  "🌪️ Principio de Bernoulli\n\nLa superficie superior del ala es más curva, por lo que el aire viaja más rápido y crea menor presión",
  "⚖️ Diferencia de Presiones\n\nLa presión inferior es mayor que la superior, creando una fuerza neta hacia arriba",
  "📐 Ángulo de Ataque\n\nCambia el ángulo del ala para ver cómo afecta la sustentación. ¡Prueba valores entre 0° y 15°!",
  "💨 Velocidad del Viento\n\nMayor velocidad del aire = mayor sustentación. Observa cómo cambian los vectores de velocidad",
  "🏔️ Efecto de la Altitud\n\nA mayor altitud, el aire es menos denso. ¿Cómo afecta esto a la sustentación?",
  "⚠️ El Peligro del Stall\n\nSi el ángulo supera los 15°, la sustentación disminuye drásticamente. ¡Esto es el 'stall'!",
  "🔄 Fuerzas en Equilibrio\n\nSustentación = Peso y Empuje = Resistencia. El avión vuela cuando estas fuerzas se equilibran",
  "🎯 ¡Tutorial Completado!\n\nAhora eres un experto en aerodinámica. ¡Experimenta con todos los controles!"
];

// Comparaciones visuales
let comparisonMode = false;
let comparisonConfigs = [
  {angle: 0, name: "Sin ángulo de ataque"},
  {angle: 5, name: "Ángulo óptimo (5°)"},
  {angle: 15, name: "Ángulo alto (15°)"},
  {angle: 20, name: "Cerca del stall (20°)"}
];
let currentComparisonIndex = 0;

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

// ===== FUNCIONES DE ACCESIBILIDAD =====

// Función para obtener el tamaño de fuente escalado según accesibilidad
function getAccessibleFontSize(baseSize) {
  let scaledSize = baseSize * accessibilityFontScale;
  return Math.max(scaledSize, minFontSize);
}

// Función para obtener colores con alto contraste
function getAccessibleColor(r, g, b, a = 255) {
  if (highContrastMode) {
    // Convertir a blanco/negro de alto contraste
    let brightness = (r + g + b) / 3;
    if (brightness > 128) {
      return [255, 255, 255, a]; // Blanco para colores claros
    } else {
      return [0, 0, 0, a]; // Negro para colores oscuros
    }
  }
  return [r, g, b, a];
}

// Función para alternar modo de alto contraste
function toggleHighContrastMode() {
  highContrastMode = !highContrastMode;
  console.log("Modo de alto contraste:", highContrastMode ? "Activado" : "Desactivado");
}

// Función para alternar reducción de movimiento
function toggleReducedMotion() {
  reducedMotion = !reducedMotion;
  console.log("Reducción de movimiento:", reducedMotion ? "Activada" : "Desactivada");
}

// Función para ajustar escala de fuente
function setFontScale(scale) {
  accessibilityFontScale = Math.max(0.8, Math.min(2.0, scale)); // Limitar entre 0.8x y 2.0x
  console.log("Escala de fuente:", accessibilityFontScale);
}

// ===== SISTEMA DE TOOLTIPS =====
let currentTooltip = null;
let tooltipElement = null;

function createTooltipElement() {
  if (tooltipElement) return;
  
  tooltipElement = document.createElement('div');
  tooltipElement.id = 'tooltip';
  tooltipElement.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-family: Arial, sans-serif;
    pointer-events: none;
    z-index: 1000;
    max-width: 250px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    display: none;
    transition: opacity 0.2s ease;
  `;
  document.body.appendChild(tooltipElement);
}

function showTooltip(text, x, y) {
  if (!tooltipElement) createTooltipElement();
  
  tooltipElement.textContent = text;
  tooltipElement.style.left = x + 'px';
  tooltipElement.style.top = (y - 40) + 'px';
  tooltipElement.style.display = 'block';
  tooltipElement.style.opacity = '1';
  currentTooltip = text;
}

function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.style.opacity = '0';
    setTimeout(() => {
      if (tooltipElement) tooltipElement.style.display = 'none';
    }, 200);
  }
  currentTooltip = null;
}

function addTooltipToElement(element, text) {
  if (!element) return;
  
  element.addEventListener('mouseenter', (e) => {
    showTooltip(text, e.clientX, e.clientY);
  });
  
  element.addEventListener('mousemove', (e) => {
    if (currentTooltip === text) {
      showTooltip(text, e.clientX, e.clientY);
    }
  });
  
  element.addEventListener('mouseleave', () => {
    if (currentTooltip === text) {
      hideTooltip();
    }
  });
}

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

  // Initialize slider target values
  if (angleSlider) angleTarget = angleCurrent = angleSlider.value();
  if (windSlider) windTarget = windCurrent = windSlider.value();
  if (altitudeSlider) altitudeTarget = altitudeCurrent = altitudeSlider.value();
  if (massSlider) massTarget = massCurrent = massSlider.value();

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
    angleSlider.input(() => {
      angleTarget = angleSlider.value();
    });
    console.log('Angle slider initialized');
  }
  if (windSlider) windSlider.input(() => {
    windTarget = windSlider.value();
  });
  if (altitudeSlider) altitudeSlider.input(() => {
    altitudeTarget = altitudeSlider.value();
  });
  if (massSlider) massSlider.input(() => {
    massTarget = massSlider.value();
  });

  // Add tooltips to sliders
  addTooltipToElement(document.getElementById('angle-slider'), 'Ángulo de ataque del ala (grados). Afecta la sustentación y resistencia.');
  addTooltipToElement(document.getElementById('wind-slider'), 'Velocidad del viento (m/s). Mayor velocidad aumenta la sustentación.');
  addTooltipToElement(document.getElementById('altitude-slider'), 'Altitud (metros). La densidad del aire disminuye con la altura.');
  addTooltipToElement(document.getElementById('mass-slider'), 'Masa del avión (kg). Afecta el peso y la fuerza necesaria para volar.');

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

  // Add tooltips to buttons
  addTooltipToElement(document.getElementById('reset-btn'), 'Reiniciar simulación con valores por defecto');
  addTooltipToElement(document.getElementById('tutorial-btn'), 'Mostrar tutorial interactivo paso a paso');
  addTooltipToElement(document.getElementById('export-btn'), 'Exportar datos de la simulación');
  addTooltipToElement(document.getElementById('save-btn'), 'Guardar configuración actual');
  addTooltipToElement(document.getElementById('load-btn'), 'Cargar configuración guardada');
  addTooltipToElement(document.getElementById('weather-clear'), 'Clima despejado - condiciones normales');
  addTooltipToElement(document.getElementById('weather-rain'), 'Lluvia - reduce visibilidad y afecta aerodinámica');
  addTooltipToElement(document.getElementById('weather-snow'), 'Nieve - baja temperatura y acumulación');
  addTooltipToElement(document.getElementById('weather-storm'), 'Tormenta - vientos fuertes y turbulencia');

  // Add tooltips to accessibility controls
  addTooltipToElement(document.getElementById('high-contrast'), 'Alternar modo alto contraste para mejor visibilidad');
  addTooltipToElement(document.getElementById('reduced-motion'), 'Reducir animaciones para evitar mareos');
  addTooltipToElement(document.getElementById('font-scale'), 'Ajustar tamaño de fuente (80%-200%)');

  // ===== SISTEMA DE GAUGES CIRCULARES =====
  function drawCircularGauge(x, y, radius, value, maxValue, minValue = 0, label = '', unit = '', color = [52, 152, 219], tooltip = '') {
    // Fondo del gauge
    fill(30, 30, 30, 150);
    stroke(60, 60, 60);
    strokeWeight(2);
    circle(x, y, radius * 2);
    
    // Arco del progreso
    let angle = map(value, minValue, maxValue, -PI/2, PI/2 * 3); // De -90° a 270°
    stroke(color[0], color[1], color[2]);
    strokeWeight(6);
    noFill();
    arc(x, y, radius * 1.8, radius * 1.8, -PI/2, angle);
    
    // Valor numérico
    fill(255);
    noStroke();
    textAlign(CENTER);
    textSize(getAccessibleFontSize(12));
    text(Math.round(value * 10) / 10 + (unit ? ' ' + unit : ''), x, y + 4);
    
    // Etiqueta
    if (label) {
      textSize(getAccessibleFontSize(10));
      fill(200);
      text(label, x, y + radius + 15);
    }
    
    // Marcas de referencia
    stroke(100);
    strokeWeight(1);
    for (let i = 0; i <= 10; i++) {
      let markAngle = map(i, 0, 10, -PI/2, PI/2 * 3);
      let markX = x + cos(markAngle) * (radius * 1.6);
      let markY = y + sin(markAngle) * (radius * 1.6);
      let markX2 = x + cos(markAngle) * (radius * 1.4);
      let markY2 = y + sin(markAngle) * (radius * 1.4);
      line(markX, markY, markX2, markY2);
    }

    // Tooltip si se proporciona
    if (tooltip && mouseX > x - radius && mouseX < x + radius && mouseY > y - radius && mouseY < y + radius) {
      showTooltip(tooltip, mouseX, mouseY);
    }
  }

  // ===== CONTROLES EDUCATIVOS =====
  // Get educational control elements
  educationalLegendsCheckbox = select('#educational-legends');
  pressureDiagramCheckbox = select('#pressure-diagram');
  velocityDiagramCheckbox = select('#velocity-diagram');
  forceDiagramCheckbox = select('#force-diagram');
  tutorialModeBtn = select('#tutorial-mode');
  comparisonModeBtn = select('#comparison-mode');

  // Educational control listeners
  if (educationalLegendsCheckbox) {
    educationalLegendsCheckbox.changed(() => {
      showEducationalLegends = educationalLegendsCheckbox.checked();
    });
  }
  if (pressureDiagramCheckbox) {
    pressureDiagramCheckbox.changed(() => {
      showPressureDiagram = pressureDiagramCheckbox.checked();
    });
  }
  if (velocityDiagramCheckbox) {
    velocityDiagramCheckbox.changed(() => {
      showVelocityDiagram = velocityDiagramCheckbox.checked();
    });
  }
  if (forceDiagramCheckbox) {
    forceDiagramCheckbox.changed(() => {
      showForceDiagram = forceDiagramCheckbox.checked();
    });
  }
  if (tutorialModeBtn) {
    tutorialModeBtn.mousePressed(toggleTutorialMode);
  }
  if (comparisonModeBtn) {
    comparisonModeBtn.mousePressed(toggleComparisonMode);
  }

  // ===== CONTROLES DE ACCESIBILIDAD =====
  // Get accessibility control elements
  let highContrastCheckbox = document.getElementById('high-contrast');
  let reducedMotionCheckbox = document.getElementById('reduced-motion');
  let fontScaleSlider = document.getElementById('font-scale');
  let fontScaleValue = document.getElementById('font-scale-value');

  console.log('Accessibility elements found:', {
    highContrastCheckbox: !!highContrastCheckbox,
    reducedMotionCheckbox: !!reducedMotionCheckbox,
    fontScaleSlider: !!fontScaleSlider,
    fontScaleValue: !!fontScaleValue
  });

  // Accessibility control listeners
  if (highContrastCheckbox) {
    highContrastCheckbox.addEventListener('change', () => {
      toggleHighContrastMode();
    });
  }
  if (reducedMotionCheckbox) {
    reducedMotionCheckbox.addEventListener('change', () => {
      toggleReducedMotion();
    });
  }
  if (fontScaleSlider) {
    fontScaleSlider.addEventListener('input', () => {
      let scale = parseFloat(fontScaleSlider.value);
      setFontScale(scale);
      if (fontScaleValue) {
        fontScaleValue.textContent = Math.round(scale * 100) + '%';
      }
    });
  }

  // Initialize parameters after all DOM elements are set up
  updateParameters();

  console.log('DOM elements initialized');
}

// ===== ANIMACIÓN SUAVE DE SLIDERS =====
function updateSliderAnimations() {
  // Interpolar suavemente hacia los valores objetivo
  angleCurrent = lerp(angleCurrent, angleTarget, sliderAnimationSpeed);
  windCurrent = lerp(windCurrent, windTarget, sliderAnimationSpeed);
  altitudeCurrent = lerp(altitudeCurrent, altitudeTarget, sliderAnimationSpeed);
  massCurrent = lerp(massCurrent, massTarget, sliderAnimationSpeed);
}

function updateParameters() {
  // Check if sliders are initialized before using them
  if (!angleSlider || !windSlider || !altitudeSlider || !massSlider) {
    console.log('Sliders not yet initialized, skipping updateParameters');
    return;
  }

  // Update variables from interpolated slider values (animación suave)
  angleAttack = radians(angleCurrent);
  windSpeed = windCurrent;
  altitude = altitudeCurrent;
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

  // Update slider animations
  updateSliderAnimations();

  // Camera effects for flight sensation
  let cameraShake = 0;
  let cameraRoll = 0;
  let cameraPitch = 0;

  // Subtle camera shake based on speed and turbulence
  cameraShake = sin(frameCount * 0.1) * map(windSpeed, 0, 100, 0, 2);
  cameraRoll = sin(frameCount * 0.05) * map(degrees(angleAttack), -10, 20, -0.5, 0.5);
  cameraPitch = cos(frameCount * 0.08) * map(altitude, 0, 10000, 0, 1);

  // Variables para efectos visuales mejorados con iluminación dinámica
  let timeOfDay = (frameCount * 0.01) % (2 * PI); // Ciclo de día completo
  let sunAngle = sin(timeOfDay) * PI/3; // Ángulo del sol (-60° a +60°)

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
    textSize(getAccessibleFontSize(24));
    textAlign(CENTER);
    let [r, g, b, a] = getAccessibleColor(255, 255, 255, 255);
    fill(r, g, b, a);
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
  textSize(getAccessibleFontSize(28));
  textAlign(CENTER);
  let [fillR, fillG, fillB, fillA] = getAccessibleColor(255, 255, 255, 255);
  fill(fillR, fillG, fillB, fillA);
  let [strokeR, strokeG, strokeB, strokeA] = getAccessibleColor(0, 0, 0, 255);
  stroke(strokeR, strokeG, strokeB, strokeA);
  strokeWeight(2);
  text('Simulador Interactivo de Sustentación', width / 2, 50);

  // Etiqueta del slider
  textSize(getAccessibleFontSize(16));
  textAlign(LEFT);
  let [sliderR, sliderG, sliderB, sliderA] = getAccessibleColor(255, 255, 255, 255);
  fill(sliderR, sliderG, sliderB, sliderA);
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

  // ===== TEXTURA METÁLICA AVANZADA CON GRADIENTES RADIALES =====
  // Gradientes metálicos más realistas con efectos de profundidad
  for (let layer = 0; layer < 6; layer++) { // Más capas para mayor profundidad
    let layerLight = totalLight + layer * 0.08;
    let layerDepth = layer * 0.15; // Profundidad para efecto 3D

    // Gradiente radial desde el centro hacia los bordes
    let centerX = 0; // Centro del ala
    let centerY = -15; // Centro vertical del ala

    // Color base metálico con variación radial
    for (let r = 0; r < 180; r += 15) { // Dibujar en anillos radiales
      let radialFactor = map(r, 0, 180, 1.0, 0.6); // Más brillante en el centro
      let alpha = map(layer, 0, 5, 255, 120) * layerLight * radialFactor;

      // Color metálico con variaciones cromáticas
      let metallicR = map(layer + r * 0.01, 0, 6, 70, 160) * layerLight * radialFactor;
      let metallicG = map(layer + r * 0.008, 0, 6, 75, 170) * layerLight * radialFactor;
      let metallicB = map(layer + r * 0.012, 0, 6, 85, 180) * layerLight * radialFactor;

      // Aplicar tinte del sol con mayor intensidad
      let finalColor = color(
        constrain(metallicR + red(sunColor) * 0.15, 0, 255),
        constrain(metallicG + green(sunColor) * 0.15, 0, 255),
        constrain(metallicB + blue(sunColor) * 0.15, 0, 255)
      );

      fill(red(finalColor), green(finalColor), blue(finalColor), alpha);
      stroke(red(finalColor) * 0.8, green(finalColor) * 0.8, blue(finalColor) * 0.8, alpha * 0.8);
      strokeWeight(0.5);

      // Dibujar sección radial del perfil
      beginShape();
      // Calcular puntos en el perfil para esta capa radial
      let innerRadius = r;
      let outerRadius = r + 15;

      // Parte superior del ala
      for (let angle = -PI/2; angle <= PI/2; angle += PI/24) {
        let x = centerX + cos(angle) * outerRadius;
        let y = centerY + sin(angle) * outerRadius * 0.3; // Ala más delgada
        vertex(x, y - layerDepth);
      }

      // Parte inferior del ala
      for (let angle = PI/2; angle <= 3*PI/2; angle += PI/24) {
        let x = centerX + cos(angle) * outerRadius;
        let y = centerY + sin(angle) * outerRadius * 0.2; // Ala inferior más curva
        vertex(x, y - layerDepth);
      }
      endShape(CLOSE);
    }
  }

  // ===== TEXTURAS SUPERFICIALES =====
  // Texturas sutiles de rugosidad superficial para mayor realismo
  push();
  noFill();
  stroke(255, 255, 255, 8); // Blanco muy sutil
  strokeWeight(0.5);

  // Patrón de rugosidad aleatoria pero consistente
  randomSeed(42); // Semilla para consistencia
  for (let i = 0; i < 50; i++) {
    let x = random(-150, 200);
    let y = random(-60, 40);
    let size = random(1, 3);

    // Solo dibujar si el punto está dentro del perfil del ala
    if (isPointInWing(x, y)) {
      point(x, y);
    }
  }

  // Líneas de tensión superficial sutiles
  stroke(255, 255, 255, 5);
  strokeWeight(0.3);
  for (let i = 0; i < 8; i++) {
    let startX = -120 + i * 40;
    let startY = -30 + sin(i * 0.5) * 5;
    let endX = startX + 30;
    let endY = startY + cos(i * 0.3) * 8;

    if (isPointInWing(startX, startY) && isPointInWing(endX, endY)) {
      line(startX, startY, endX, endY);
    }
  }
  pop();

  // ===== EFECTOS DE REFLEJO ESPECULAR AVANZADOS =====
  // Reflejos especulares que responden dinámicamente al ángulo de luz
  let specularIntensity = pow(max(0, lightDirection.dot(wingNormal)), 16) * 1.2; // Más sensible

  if (specularIntensity > 0.05) {
    // Reflejo principal - más realista con forma elíptica
    push();
    translate(lightDirection.x * 20, lightDirection.y * 20); // Offset basado en dirección de luz

    // Elipse de reflejo principal
    fill(red(sunColor), green(sunColor), blue(sunColor), specularIntensity * 180);
    noStroke();
    ellipse(20, -25, 40 * specularIntensity, 15 * specularIntensity);

    // Reflejos secundarios con blur progresivo
    for (let i = 1; i <= 3; i++) {
      let secondaryIntensity = specularIntensity * (1 - i * 0.2);
      fill(red(sunColor), green(sunColor), blue(sunColor), secondaryIntensity * 120);
      ellipse(20 + i * 15, -25 + i * 5, 25 * secondaryIntensity, 10 * secondaryIntensity);
    }
    pop();

    // Reflejos lineales en bordes
    stroke(red(sunColor), green(sunColor), blue(sunColor), specularIntensity * 200);
    strokeWeight(3);
    noFill();

    // Arco de reflejo en borde de ataque
    beginShape();
    for (let t = 0; t <= 1; t += 0.1) {
      let x = leadingEdgeX + t * 60;
      let y = leadingEdgeY - 8 + sin(t * PI) * 4;
      vertex(x, y);
    }
    endShape();

    // Reflejos puntuales en áreas curvas
    strokeWeight(2);
    let highlightPoints = [
      {x: 40, y: -35}, {x: 80, y: -40}, {x: 120, y: -35},
      {x: -20, y: -30}, {x: -60, y: -25}
    ];

    for (let point of highlightPoints) {
      let pointIntensity = specularIntensity * random(0.7, 1.3);
      stroke(red(sunColor), green(sunColor), blue(sunColor), pointIntensity * 150);
      point(point.x, point.y);
    }
  }

  // ===== SOMBRAS 3D DINÁMICAS MULTICAPA =====
  // Sombras volumétricas con múltiples capas y blur variable
  for (let shadowLayer = 0; shadowLayer < 3; shadowLayer++) {
    push();

    // Offset progresivo para efecto de profundidad
    let shadowOffsetX = lightDirection.x * (8 + shadowLayer * 4);
    let shadowOffsetY = lightDirection.y * (8 + shadowLayer * 4);
    translate(shadowOffsetX, shadowOffsetY);

    // Blur variable basado en distancia e intensidad de luz
    let blurAmount = shadowLayer * 2;
    let shadowAlpha = (1 - totalLight) * (60 - shadowLayer * 15) + 15;

    // Color de sombra con tinte azulado para mayor realismo
    let shadowColor = color(
      20 + shadowLayer * 10, // Más rojo en capas lejanas
      20 + shadowLayer * 10, // Más verde en capas lejanas
      40 + shadowLayer * 15  // Más azul en capas lejanas
    );

    fill(red(shadowColor), green(shadowColor), blue(shadowColor), shadowAlpha);
    noStroke();

    // Sombra escalada para efecto de profundidad
    scale(1 + shadowLayer * 0.1);

    // Sombra del perfil principal con deformación sutil
    beginShape();
    vertex(leadingEdgeX, leadingEdgeY);
    bezierVertex(-120 + blurAmount, -25 + blurAmount, -60 + blurAmount, -45 + blurAmount, 0, -55 + blurAmount);
    bezierVertex(60 - blurAmount, -55 + blurAmount, 120 - blurAmount, -45 + blurAmount, 180 - blurAmount, -25 + blurAmount);
    vertex(200 - blurAmount, blurAmount);
    bezierVertex(180 - blurAmount, 15 - blurAmount, 120 - blurAmount, 25 - blurAmount, 60 - blurAmount, 30 - blurAmount);
    bezierVertex(0, 30 - blurAmount, -60 + blurAmount, 25 - blurAmount, -120 + blurAmount, 15 - blurAmount);
    bezierVertex(-150 + blurAmount, 8 - blurAmount, -120 + blurAmount, 10 - blurAmount, -90 + blurAmount, 12 - blurAmount, leadingEdgeX, leadingEdgeY);
    endShape(CLOSE);
    pop();
  }

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
  textSize(getAccessibleFontSize(10));
  textAlign(CENTER);
  text('NACA 2412', 1, 46);

  // Texto principal
  fill(255);
  stroke(0);
  strokeWeight(1);
  text('NACA 2412', 0, 45);

  // Etiqueta del borde de ataque con mejor diseño
  fill(255, 165, 0);
  stroke(0);
  strokeWeight(2);
  textSize(getAccessibleFontSize(8));
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
  stroke(255, 165, 0, 200); // Naranja para velocidad
  strokeWeight(3);
  line(0, 0, speedVectorLength, 0);
  // Punta de flecha
  fill(255, 165, 0, 200);
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
  textSize(getAccessibleFontSize(8));
  text(Math.round(windSpeed) + ' m/s', 40, -25);
  text(Math.round(altitude) + ' m', -40, -25);
  text(Math.round(liftMagnitude) + ' N', 40, 35);

  pop();

  // Update and draw aerodynamic flow particles (solo cuando no está en modo tutorial y no reducedMotion)
  if (!tutorialMode && !reducedMotion) {
    updateFlowParticles();
    updateVortices();
    drawFlowParticles();
    drawVortices();
  }

  // ===== CARACTERÍSTICAS EDUCATIVAS =====
  // No dibujar diagramas y elementos gráficos cuando está en modo tutorial
  if (!tutorialMode) {
    drawEducationalLegends();
    drawPressureDiagram();
    drawVelocityDiagram();
    drawForceDiagram();
    drawActiveDiagramIndicators();
  }
  drawTutorialOverlay();
  drawComparisonMode();

  // Enhanced aerodynamic flow visualization following NACA 2412 profile (solo cuando no está en modo tutorial)
  if (!tutorialMode) {
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
  let oscillation = reducedMotion ? 0 : sin(frameCount * 0.1) * 5; // Oscilación ligera, reducida si reducedMotion
  let leadingEdgeWorldX = width / 2 - 180 * 1.4; // Posición del borde de ataque en coordenadas del mundo
  let leadingEdgeWorldY = height / 2; // Centro vertical

  drawArrow(leadingEdgeWorldX, leadingEdgeWorldY + oscillation,
           leadingEdgeWorldX, leadingEdgeWorldY - liftLength + oscillation, 'blue', 6);
  let [liftR, liftG, liftB, liftA] = getAccessibleColor(0, 100, 255, 255);
  fill(liftR, liftG, liftB, liftA);
  textSize(getAccessibleFontSize(16));
  text('Sustentación', leadingEdgeWorldX + 20, leadingEdgeWorldY - liftLength / 2 + oscillation);

  // Flecha de Peso (rojo, emerge del borde de ataque hacia abajo)
  drawArrow(leadingEdgeWorldX, leadingEdgeWorldY,
           leadingEdgeWorldX, leadingEdgeWorldY + 80, 'red', 6);
  let [weightR, weightG, weightB, weightA] = getAccessibleColor(255, 0, 0, 255);
  fill(weightR, weightG, weightB, weightA);
  text('Peso', leadingEdgeWorldX + 20, leadingEdgeWorldY + 90);

  // Etiquetas de flujo
  textAlign(LEFT);
  let [fastAirR, fastAirG, fastAirB, fastAirA] = getAccessibleColor(173, 216, 230, 255);
  fill(fastAirR, fastAirG, fastAirB, fastAirA);
  textSize(getAccessibleFontSize(14));
  text('Aire Rápido (Baja P)', 50, height / 2 - 80);
  let [slowAirR, slowAirG, slowAirB, slowAirA] = getAccessibleColor(255, 160, 122, 255);
  fill(slowAirR, slowAirG, slowAirB, slowAirA);
  text('Aire Lento (Alta P)', 50, height / 2 + 100);



  // Update weather effects
  updateWeather();

  } // Fin de la condición !tutorialMode para visualización aerodinámica

  // Close camera transformation
  pop();

  // Close the initial camera transformation push()
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

function togglePanel() {
  document.body.classList.toggle('panel-hidden');
  // Update button text
  let isHidden = document.body.classList.contains('panel-hidden');
  if (togglePanelBtn) {
    togglePanelBtn.html(isHidden ? 'Mostrar' : 'Ocultar');
  }
  // Resize canvas after toggling panel
  setTimeout(resizeCanvasForPanel, 300); // Wait for CSS transition to complete
}

function resizeCanvasForPanel() {
  let panelHidden = document.body.classList.contains('panel-hidden');
  let canvasWidth = panelHidden ? min(1400, windowWidth - 20) : min(1000, windowWidth - 320);
  let canvasHeight = panelHidden ? min(1000, windowHeight - 20) : min(700, windowHeight - 20);
  resizeCanvas(canvasWidth, canvasHeight);
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









function initializeFlowParticles() {
  flowParticles = [];
  vortices = []; // Initialize vortices array

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

  // ===== INICIALIZAR VÓRTICES =====
  // Vórtices en los bordes de ataque y salida del ala
  let vortexPositions = [
    {x: -180, y: 0, type: 'leading'}, // Borde de ataque
    {x: 180, y: 0, type: 'trailing'}  // Borde de salida
  ];

  for (let pos of vortexPositions) {
    // Aplicar transformaciones del ala
    let localX = pos.x;
    let localY = pos.y;

    // Apply rotation
    let cosRot = cos(rotationAngle);
    let sinRot = sin(rotationAngle);
    let rotatedX = localX * cosRot - localY * sinRot;
    let rotatedY = localX * sinRot + localY * cosRot;

    // Apply scaling and translation
    let screenX = rotatedX * scaleFactor + wingCenterX;
    let screenY = rotatedY * scaleFactor + wingCenterY;

    vortices.push({
      x: screenX,
      y: screenY,
      type: pos.type,
      strength: pos.type === 'leading' ? 2.0 : 1.5,
      rotation: 0,
      particles: []
    });
  }
}

function updateVortices() {
  for (let vortex of vortices) {
    // Rotación del vórtice
    vortex.rotation += vortex.strength * 0.1;

    // Actualizar partículas del vórtice (efecto espiral)
    vortex.particles = [];
    let numParticles = 8;

    for (let i = 0; i < numParticles; i++) {
      let angle = vortex.rotation + (i * TWO_PI / numParticles);
      let radius = 5 + i * 2; // Radio creciente para efecto espiral

      let particleX = vortex.x + cos(angle) * radius;
      let particleY = vortex.y + sin(angle) * radius;

      vortex.particles.push({
        x: particleX,
        y: particleY,
        alpha: map(i, 0, numParticles - 1, 150, 30)
      });
    }
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

    // ===== TURBULENCIA REALISTA =====
    // Agregar movimiento ondulatorio para simular turbulencia real
    let turbulenceStrength = 0.8; // Intensidad de la turbulencia
    let turbulenceScale = 0.02; // Escala de las ondas de turbulencia

    // Componentes de turbulencia basados en posición y tiempo
    let turbulenceX = sin(wingLocalX * turbulenceScale + frameCount * 0.05) * turbulenceStrength;
    let turbulenceY = cos(wingLocalY * turbulenceScale * 0.7 + frameCount * 0.03) * turbulenceStrength * 0.6;

    // Turbulencia más intensa cerca del borde de ataque y salida
    let edgeFactor = 1;
    if (abs(wingLocalX) > 150) { // Cerca del borde de salida
      edgeFactor = 1.5;
    } else if (abs(wingLocalX) < 50) { // Cerca del borde de ataque
      edgeFactor = 1.3;
    }

    turbulenceX *= edgeFactor;
    turbulenceY *= edgeFactor;

    // Aplicar turbulencia a la velocidad
    p.vx += turbulenceX * 0.1;
    p.vy += turbulenceY * 0.08;

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
    // ===== COLORES DINÁMICOS BASADOS EN VELOCIDAD =====
    // Calcular velocidad total de la partícula
    let speed = sqrt(p.vx * p.vx + p.vy * p.vy);

    // Mapear velocidad a colores: azul frío (lento) → rojo cálido (rápido)
    let speedNormalized = constrain(map(speed, 0.5, 4.0, 0, 1), 0, 1);

    // Gradiente de colores: azul → cian → verde → amarillo → rojo
    let r, g, b;
    if (speedNormalized < 0.25) {
      // Azul → Cian (velocidades muy bajas)
      let t = speedNormalized / 0.25;
      r = 0;
      g = map(t, 0, 1, 100, 200);
      b = map(t, 0, 1, 255, 255);
    } else if (speedNormalized < 0.5) {
      // Cian → Verde (velocidades bajas)
      let t = (speedNormalized - 0.25) / 0.25;
      r = 0;
      g = map(t, 0, 1, 200, 255);
      b = map(t, 0, 1, 255, 100);
    } else if (speedNormalized < 0.75) {
      // Verde → Amarillo (velocidades medias)
      let t = (speedNormalized - 0.5) / 0.25;
      r = map(t, 0, 1, 0, 255);
      g = 255;
      b = map(t, 0, 1, 100, 0);
    } else {
      // Amarillo → Rojo (velocidades altas)
      let t = (speedNormalized - 0.75) / 0.25;
      r = 255;
      g = map(t, 0, 1, 255, 100);
      b = 0;
    }

    // Intensidad del color basada en la edad de la partícula
    let ageAlpha = map(p.age, 0, p.maxAge, 255, 50);

    // Draw trail with dynamic colors
    for (let i = 0; i < p.trail.length - 1; i++) {
      let trailAlpha = map(i, 0, p.trail.length - 1, ageAlpha * 0.1, ageAlpha * 0.4);
      let trailSize = map(i, 0, p.trail.length - 1, p.size * 0.2, p.size * 0.6);

      fill(r, g, b, trailAlpha);
      ellipse(p.trail[i].x, p.trail[i].y, trailSize, trailSize);
    }

    // Draw main particle with dynamic color
    fill(r, g, b, ageAlpha);
    ellipse(p.x, p.y, p.size, p.size);
  }

  // ===== TRAILS DE CONDENSACIÓN =====
  // Agregar estelas de vapor en áreas de baja presión (alta velocidad)
  for (let p of flowParticles) {
    if (p.surface === 'upper') {
      let speed = sqrt(p.vx * p.vx + p.vy * p.vy);

      // Alta velocidad = baja presión = condensación posible
      if (speed > 3.0 && random() < 0.02) { // Probabilidad baja pero visible
        // Crear partícula de condensación
        let condensationX = p.x + random(-5, 5);
        let condensationY = p.y + random(-3, 3);

        // Color blanco azulado para el vapor
        fill(220, 240, 255, 80);

        // Forma ovalada para simular gotas de condensación
        ellipse(condensationX, condensationY, 2, 4);

        // Trail sutil de la condensación
        for (let i = 0; i < 3; i++) {
          let trailX = condensationX - i * 2;
          let trailY = condensationY - i * 1;
          let trailAlpha = 80 - i * 25;

          fill(220, 240, 255, trailAlpha);
          ellipse(trailX, trailY, 1, 2);
        }
      }
    }
  }
}

function drawVortices() {
  noFill();
  strokeWeight(1.5);

  for (let vortex of vortices) {
    // Color del vórtice basado en el tipo
    if (vortex.type === 'leading') {
      stroke(100, 150, 255, 120); // Azul para borde de ataque
    } else {
      stroke(255, 100, 100, 100); // Rojo para borde de salida
    }

    // Dibujar espiral del vórtice
    beginShape();
    for (let particle of vortex.particles) {
      vertex(particle.x, particle.y);
    }
    endShape();

    // Dibujar partículas del vórtice
    noStroke();
    for (let particle of vortex.particles) {
      if (vortex.type === 'leading') {
        fill(100, 150, 255, particle.alpha);
      } else {
        fill(255, 100, 100, particle.alpha);
      }
      ellipse(particle.x, particle.y, 2, 2);
    }
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
    // ===== LLUVIA MEJORADA =====
    // Diferentes intensidades de lluvia basadas en velocidad del viento
    let rainIntensity = map(windSpeed, 10, 100, 0.05, 0.3);

    if (random() < rainIntensity) {
      rainDrops.push({
        x: random(width),
        y: random(-50, 0),
        speed: random(12, 18) + windSpeed * 0.1,
        length: random(15, 25),
        thickness: random(1, 3),
        splashTimer: 0
      });
    }

    // Actualizar y dibujar gotas de lluvia con efectos mejorados
    for (let i = rainDrops.length - 1; i >= 0; i--) {
      let drop = rainDrops[i];
      drop.y += drop.speed;
      drop.x += windSpeed * 0.08 + sin(frameCount * 0.1 + i) * 0.5; // Movimiento ondulado

      if (drop.y > height - 50) {
        // Efecto de salpicadura al tocar el suelo
        drop.splashTimer++;
        if (drop.splashTimer < 5) {
          // Dibujar salpicadura
          stroke(200, 220, 255, 150 - drop.splashTimer * 30);
          strokeWeight(drop.thickness);
          let splashSize = 8 - drop.splashTimer;
          line(drop.x, height - 45, drop.x + random(-splashSize, splashSize), height - 45 - random(2, 6));
          line(drop.x, height - 45, drop.x + random(-splashSize, splashSize), height - 45 - random(2, 6));
        } else {
          rainDrops.splice(i, 1);
          continue;
        }
      }

      // Dibujar gota de lluvia con gradiente
      stroke(150, 200, 255, 180);
      strokeWeight(drop.thickness);
      line(drop.x, drop.y, drop.x + windSpeed * 0.03, drop.y + drop.length);
    }

    // Limitar gotas para rendimiento
    if (rainDrops.length > 250) {
      rainDrops.splice(0, rainDrops.length - 250);
    }

    // Efecto de cielo nublado durante la lluvia
    fill(100, 120, 140, 80);
    rect(0, 0, width, height * 0.4);

  } else if (currentWeather === 'snow') {
    // ===== NIEVE MEJORADA =====
    if (random() < 0.08) {
      snowFlakes.push({
        x: random(width),
        y: random(-30, 0),
        speed: random(0.5, 2),
        size: random(3, 8),
        drift: random(-1, 1),
        rotation: random(TWO_PI),
        rotationSpeed: random(-0.1, 0.1),
        windInfluence: random(0.5, 1.5)
      });
    }

    // Actualizar y dibujar copos de nieve con física mejorada
    for (let i = snowFlakes.length - 1; i >= 0; i--) {
      let flake = snowFlakes[i];
      flake.y += flake.speed;
      flake.x += flake.drift + windSpeed * 0.01 * flake.windInfluence;
      flake.rotation += flake.rotationSpeed;

      // Física de copos: flotan y se derriten cerca del suelo
      if (flake.y > height - 100) {
        flake.speed *= 0.98; // Desaceleración al acercarse al suelo
        flake.size *= 0.995; // Se derriten ligeramente
      }

      if (flake.y > height || flake.size < 1) {
        snowFlakes.splice(i, 1);
        continue;
      }

      // Dibujar copo de nieve con forma hexagonal
      push();
      translate(flake.x, flake.y);
      rotate(flake.rotation);
      fill(255, 255, 255, 220);
      noStroke();

      // Copo hexagonal simple pero efectivo
      beginShape();
      for (let angle = 0; angle < TWO_PI; angle += PI/3) {
        let x = cos(angle) * flake.size * 0.5;
        let y = sin(angle) * flake.size * 0.5;
        vertex(x, y);
      }
      endShape(CLOSE);
      pop();
    }

    // Limitar copos para rendimiento
    if (snowFlakes.length > 200) {
      snowFlakes.splice(0, snowFlakes.length - 200);
    }

    // Efecto de nieve acumulada en el suelo
    if (frameCount % 60 === 0 && snowFlakes.length > 10) {
      fill(255, 255, 255, 30);
      noStroke();
      rect(0, height - 20, width, 20);
    }

  } else if (currentWeather === 'storm') {
    // ===== TORMENTA MEJORADA =====
    // Lluvia torrencial
    if (random() < 0.15) {
      rainDrops.push({
        x: random(width),
        y: random(-100, 0),
        speed: random(18, 28) + windSpeed * 0.2,
        length: random(20, 35),
        thickness: random(2, 4)
      });
    }

    // Actualizar lluvia de tormenta
    for (let i = rainDrops.length - 1; i >= 0; i--) {
      let drop = rainDrops[i];
      drop.y += drop.speed;
      drop.x += windSpeed * 0.2 + sin(frameCount * 0.2 + i) * 2; // Movimiento caótico

      if (drop.y > height) {
        rainDrops.splice(i, 1);
      } else {
        stroke(80, 120, 200, 200);
        strokeWeight(drop.thickness);
        line(drop.x, drop.y, drop.x + windSpeed * 0.1, drop.y + drop.length);
      }
    }

    if (rainDrops.length > 400) {
      rainDrops.splice(0, rainDrops.length - 400);
    }

    // Relámpagos mejorados
    if (random() < 0.008) {
      lightningFlash = 255;
      lightningTimer = 0;
    }

    if (lightningFlash > 0) {
      // Flash de relámpago con efecto de ramas
      fill(255, 255, 255, lightningFlash);
      rect(0, 0, width, height);

      // Dibujar rayo si es el primer frame del flash
      if (lightningTimer === 0) {
        stroke(255, 255, 255, 255);
        strokeWeight(3);
        let lightningX = random(width * 0.2, width * 0.8);
        let lightningY = 0;

        // Rayo zigzagueante
        beginShape();
        vertex(lightningX, lightningY);
        for (let y = 0; y < height; y += random(20, 40)) {
          lightningX += random(-30, 30);
          vertex(lightningX, y);
        }
        endShape();
      }

      lightningFlash -= 20;
      lightningTimer++;
    }

    // Cielo muy oscuro durante tormenta
    fill(20, 20, 50, 120);
    rect(0, 0, width, height);

    // Viento fuerte que afecta las nubes
    if (frameCount % 2 === 0) {
      cloudOffset += windSpeed * 0.02;
    }
  }
}



function isPointInWing(x, y) {
  // Función auxiliar para determinar si un punto está dentro del perfil del ala
  // Usando una aproximación simplificada del perfil NACA
  let chord = 320; // Longitud de la cuerda
  let thickness = 0.12; // Espesor relativo

  // Coordenadas normalizadas
  let xn = (x + 150) / chord; // Centrar en el borde de ataque

  if (xn < 0 || xn > 1) return false;

  // Perfil NACA simétrico simplificado
  let yt = thickness * chord * (0.2969 * sqrt(xn) - 0.1260 * xn - 0.3516 * pow(xn, 2) + 0.2843 * pow(xn, 3) - 0.1015 * pow(xn, 4));

  // Verificar si el punto está dentro del espesor del perfil
  return abs(y) <= yt;
}

function toggleTutorialMode() {
  tutorialMode = !tutorialMode;
  if (tutorialMode) {
    tutorialStep = 0;
    tutorialModeBtn.html('🎓 Salir Tutorial');
    tutorialModeBtn.style('background', 'linear-gradient(145deg, #ff6b6b, #ee5a52)');
  } else {
    tutorialModeBtn.html('🎓 Modo Tutorial');
    tutorialModeBtn.style('background', 'linear-gradient(145deg, #667eea, #764ba2)');
  }
}

function toggleComparisonMode() {
  comparisonMode = !comparisonMode;
  if (comparisonMode) {
    currentComparisonIndex = 0;
    comparisonModeBtn.html('📊 Salir Comparación');
    comparisonModeBtn.style('background', 'linear-gradient(145deg, #ff9a9e, #fecfef)');
  } else {
    // Restaurar configuración original
    angleSlider.value(5);
    updateParameters();
    comparisonModeBtn.html('📊 Comparaciones');
    comparisonModeBtn.style('background', 'linear-gradient(145deg, #f093fb, #f5576c)');
  }
}

function drawEducationalLegends() {
  if (!showEducationalLegends) return;

  textAlign(CENTER);
  let mainFontSize = getAccessibleFontSize(12);
  let smallFontSize = getAccessibleFontSize(10);
  textSize(mainFontSize);
  
  // Aplicar colores accesibles
  let [textR, textG, textB, textA] = getAccessibleColor(255, 255, 255, 220);
  fill(textR, textG, textB, textA);
  let [strokeR, strokeG, strokeB, strokeA] = getAccessibleColor(0, 0, 0, 150);
  stroke(strokeR, strokeG, strokeB, strokeA);
  strokeWeight(1);

  // Distribuir leyendas horizontalmente en la parte inferior
  let legendY = height - 80; // Más arriba para evitar cortes
  let spacing = width / 4; // Dividir el ancho en 4 secciones

  // ===== LEYENDA 1: SUSTENTACIÓN =====
  let legend1X = spacing * 0.5;
  // Caja de fondo con gradiente
  fill(0, 100, 0, 180); // Verde para sustentación
  noStroke();
  rect(legend1X - 60, legendY - 35, 120, 50, 8);

  // Icono de flecha hacia arriba
  stroke(255, 255, 255, 255);
  strokeWeight(3);
  line(legend1X, legendY - 25, legend1X, legendY - 15);
  line(legend1X, legendY - 25, legend1X - 3, legendY - 20);
  line(legend1X, legendY - 25, legend1X + 3, legendY - 20);

  // Texto
  fill(255, 255, 255, 255);
  noStroke();
  text("SUSTENTACIÓN", legend1X, legendY - 5);
  textSize(smallFontSize);
  text("Fuerza ↑", legend1X, legendY + 8);

  // ===== LEYENDA 2: ARRASTRE =====
  let legend2X = spacing * 1.5;
  // Caja de fondo con gradiente
  fill(100, 0, 0, 180); // Rojo para arrastre
  noStroke();
  rect(legend2X - 60, legendY - 35, 120, 50, 8);

  // Icono de flecha hacia la derecha
  stroke(255, 255, 255, 255);
  strokeWeight(3);
  line(legend2X - 10, legendY - 20, legend2X + 10, legendY - 20);
  line(legend2X + 10, legendY - 20, legend2X + 5, legendY - 23);
  line(legend2X + 10, legendY - 20, legend2X + 5, legendY - 17);

  // Texto
  fill(255, 255, 255, 255);
  noStroke();
  textSize(mainFontSize);
  text("ARRASTRE", legend2X, legendY - 5);
  textSize(smallFontSize);
  text("Resistencia →", legend2X, legendY + 8);

  // ===== LEYENDA 3: PARTÍCULAS =====
  let legend3X = spacing * 2.5;
  // Caja de fondo con gradiente
  fill(0, 0, 100, 180); // Azul para partículas
  noStroke();
  rect(legend3X - 70, legendY - 35, 140, 50, 8);

  // Iconos de partículas (círculos pequeños)
  fill(0, 150, 255, 255); // Azul superior
  noStroke();
  ellipse(legend3X - 25, legendY - 20, 6, 6);
  fill(255, 100, 0, 255); // Rojo inferior
  ellipse(legend3X - 10, legendY - 15, 6, 6);
  fill(0, 200, 255, 255); // Azul superior
  ellipse(legend3X + 5, legendY - 18, 4, 4);

  // Texto
  fill(255, 255, 255, 255);
  textSize(mainFontSize);
  text("PARTÍCULAS", legend3X, legendY - 5);
  textSize(smallFontSize);
  text("Azul: superior | Rojo: inferior", legend3X, legendY + 8);

  // ===== LEYENDA 4: PRESIÓN =====
  let legend4X = spacing * 3.5;
  // Caja de fondo con gradiente
  fill(100, 0, 100, 180); // Púrpura para presión
  noStroke();
  rect(legend4X - 60, legendY - 35, 120, 50, 8);

  // Icono de presión (ondas)
  stroke(255, 255, 255, 255);
  strokeWeight(2);
  noFill();
  arc(legend4X - 15, legendY - 20, 8, 8, PI, TWO_PI);
  arc(legend4X - 5, legendY - 18, 6, 6, PI, TWO_PI);
  arc(legend4X + 5, legendY - 22, 10, 10, PI, TWO_PI);

  // Texto
  fill(255, 255, 255, 255);
  noStroke();
  textSize(mainFontSize);
  text("PRESIÓN", legend4X, legendY - 5);
  textSize(smallFontSize);
  text("Baja ↑ | Alta ↓", legend4X, legendY + 8);
}

function drawActiveDiagramIndicators() {
  // Indicadores en la esquina superior derecha para mostrar qué diagramas están activos
  let indicatorX = width - 120;
  let indicatorY = 30;
  let indicatorSpacing = 25;

  textAlign(LEFT);
  textSize(getAccessibleFontSize(10));

  if (showPressureDiagram) {
    fill(255, 0, 0, 200);
    noStroke();
    rect(indicatorX - 15, indicatorY - 8, 12, 12, 2);
    fill(255, 255, 255, 255);
    text("Presión", indicatorX, indicatorY + 2);
    indicatorY += indicatorSpacing;
  }

  if (showVelocityDiagram) {
    fill(255, 165, 0, 200);
    noStroke();
    rect(indicatorX - 15, indicatorY - 8, 12, 12, 2);
    fill(255, 255, 255, 255);
    text("Velocidad", indicatorX, indicatorY + 2);
    indicatorY += indicatorSpacing;
  }

  if (showForceDiagram) {
    fill(0, 255, 0, 200);
    noStroke();
    rect(indicatorX - 15, indicatorY - 8, 12, 12, 2);
    fill(255, 255, 255, 255);
    text("Fuerzas", indicatorX, indicatorY + 2);
  }
}

function drawPressureDiagram() {
  if (!showPressureDiagram) return;

  // Diagrama de presiones sobre el ala - más sutil
  push();
  translate(width/2, height/2);

  // Área de baja presión (superior) - más transparente
  fill(255, 0, 0, 60);
  noStroke();
  beginShape();
  vertex(-180, -55);
  bezierVertex(-120, -45, -60, -35, 0, -30);
  bezierVertex(60, -35, 120, -45, 180, -55);
  vertex(200, -20);
  bezierVertex(180, -10, 120, 0, 60, 5);
  bezierVertex(0, 5, -60, 0, -120, -10);
  bezierVertex(-150, -15, -180, -20, -180, -55);
  endShape();

  // Área de alta presión (inferior) - más transparente
  fill(0, 0, 255, 60);
  beginShape();
  vertex(-180, 15);
  bezierVertex(-120, 25, -60, 30, 0, 30);
  bezierVertex(60, 30, 120, 25, 180, 15);
  vertex(200, 40);
  bezierVertex(180, 50, 120, 55, 60, 50);
  bezierVertex(0, 50, -60, 55, -120, 50);
  bezierVertex(-150, 45, -180, 40, -180, 15);
  endShape();

  // Etiquetas más pequeñas y mejor posicionadas
  fill(255, 255, 255, 200);
  textAlign(CENTER);
  textSize(getAccessibleFontSize(10));
  text("BAJA PRESIÓN", 0, -80);
  text("ALTA PRESIÓN", 0, 80);
  pop();
}

function drawVelocityDiagram() {
  if (!showVelocityDiagram) return;

  // Diagrama de velocidades - más sutil
  push();
  translate(width/2, height/2);

  stroke(255, 165, 0, 120); // Más transparente
  strokeWeight(2);
  noFill();

  // Vectores de velocidad en superficie superior (más rápidos) - menos vectores
  for (let x = -100; x <= 100; x += 100) {
    let y = -40;
    let speed = map(abs(x), 0, 150, 3.5, 2.0);
    let vectorLength = speed * 10; // Más cortos

    line(x, y, x + vectorLength, y);
    // Punta de flecha más pequeña
    line(x + vectorLength, y, x + vectorLength - 3, y - 2);
    line(x + vectorLength, y, x + vectorLength - 3, y + 2);
  }

  // Vectores de velocidad en superficie inferior (más lentos)
  for (let x = -100; x <= 100; x += 100) {
    let y = 40;
    let speed = map(abs(x), 0, 150, 1.5, 1.0);
    let vectorLength = speed * 10;

    line(x, y, x + vectorLength, y);
    line(x + vectorLength, y, x + vectorLength - 3, y - 2);
    line(x + vectorLength, y, x + vectorLength - 3, y + 2);
  }

  // Etiqueta más pequeña
  fill(255, 165, 0);
  stroke(0);
  strokeWeight(2);
  textAlign(CENTER);
  textSize(getAccessibleFontSize(10));
  text("VELOCIDAD DEL AIRE", 0, -110);
  pop();
}

function drawForceDiagram() {
  if (!showForceDiagram) return;

  // Diagrama de fuerzas - más sutil
  push();
  translate(width/2, height/2);

  // Fuerza de sustentación - más sutil
  stroke(0, 255, 0, 150);
  strokeWeight(3);
  let liftForce = 60; // Más corto
  line(0, 0, 0, -liftForce);

  // Punta de flecha
  fill(0, 255, 0, 150);
  noStroke();
  triangle(-4, -liftForce, 4, -liftForce, 0, -liftForce - 8);

  // Fuerza de arrastre - más sutil
  stroke(255, 0, 0, 150);
  strokeWeight(3);
  let dragForce = 40;
  line(0, 0, dragForce, 0);

  fill(255, 0, 0, 150);
  triangle(dragForce, -4, dragForce, 4, dragForce + 8, 0);

  // Fuerza de peso - más sutil
  stroke(255, 165, 0, 150);
  strokeWeight(3);
  let weightForce = 50;
  line(0, 0, 0, weightForce);

  fill(255, 165, 0, 150);
  triangle(-4, weightForce, 4, weightForce, 0, weightForce + 8);

  // Etiquetas más pequeñas
  fill(255, 255, 255, 200);
  textAlign(CENTER);
  textSize(getAccessibleFontSize(10));
  text("SUSTENTACIÓN", 0, -liftForce - 15);
  text("ARRASTRE", dragForce + 25, 0);
  text("PESO", 0, weightForce + 20);
  pop();
}

function drawTutorialOverlay() {
  if (!tutorialMode) return;

  // Overlay semi-transparente con blur effect
  fill(0, 0, 0, 150);
  noStroke();
  rect(0, 0, width, height);

  // Caja principal del tutorial con gradiente
  let boxWidth = min(600, width * 0.9); // Aumentado de 500 a 600
  let boxHeight = min(400, height * 0.7); // Aumentado de 350 a 400
  let boxX = width/2 - boxWidth/2;
  let boxY = height/2 - boxHeight/2;

  // Sombra de la caja
  fill(0, 0, 0, 80);
  noStroke();
  rect(boxX + 8, boxY + 8, boxWidth, boxHeight, 20);

  // Caja principal con gradiente
  for (let i = 0; i < boxHeight; i++) {
    let alpha = map(i, 0, boxHeight, 255, 220);
    let r = map(i, 0, boxHeight, 255, 248);
    let g = map(i, 0, boxHeight, 255, 249);
    let b = map(i, 0, boxHeight, 255, 250);
    stroke(r, g, b, alpha);
    strokeWeight(1);
    line(boxX, boxY + i, boxX + boxWidth, boxY + i);
  }

  // Borde de la caja
  stroke(52, 152, 219, 200);
  strokeWeight(3);
  fill(255, 255, 255, 250);
  rect(boxX, boxY, boxWidth, boxHeight, 20);

  // Barra de progreso
  let progressWidth = map(tutorialStep, 0, tutorialSteps.length - 1, 0, boxWidth - 40);
  fill(52, 152, 219, 180);
  noStroke();
  rect(boxX + 20, boxY + boxHeight - 25, progressWidth, 6, 3);

  // Indicador de paso
  let [stepColorR, stepColorG, stepColorB, stepColorA] = getAccessibleColor(52, 152, 219, 255);
  fill(stepColorR, stepColorG, stepColorB, stepColorA);
  textAlign(CENTER);
  textSize(getAccessibleFontSize(12));
  text(`Paso ${tutorialStep + 1} de ${tutorialSteps.length}`, width/2, boxY + boxHeight - 35);

  // Título
  let [titleColorR, titleColorG, titleColorB, titleColorA] = getAccessibleColor(44, 62, 80, 255);
  fill(titleColorR, titleColorG, titleColorB, titleColorA);
  textAlign(CENTER);
  textSize(getAccessibleFontSize(20));
  text("Tutorial Interactivo", width/2, boxY + 40);

  // Línea decorativa
  stroke(52, 152, 219, 150);
  strokeWeight(2);
  line(width/2 - 50, boxY + 55, width/2 + 50, boxY + 55);

  // Contenido del tutorial
  let contentY = boxY + 80;
  let maxTextWidth = boxWidth - 60; // Ancho máximo para el texto (con márgenes)
  let lines = tutorialSteps[tutorialStep].split('\n');

  // Función auxiliar para dividir texto largo en líneas que quepan
  function wrapText(text, maxWidth) {
    let words = text.split(' ');
    let lines = [];
    let currentLine = '';

    for (let word of words) {
      let testLine = currentLine + (currentLine ? ' ' : '') + word;
      let testWidth = textWidth(testLine);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;

    let isTitle = lines[i].includes('🎓') || lines[i].includes('✈️') || lines[i].includes('🌪️') ||
                  lines[i].includes('⚖️') || lines[i].includes('📐') || lines[i].includes('💨') ||
                  lines[i].includes('🏔️') || lines[i].includes('⚠️') || lines[i].includes('🔄') ||
                  lines[i].includes('🎯');

    if (isTitle) {
      // Título con emoji - dividir en líneas si es necesario
      let [titleTextR, titleTextG, titleTextB, titleTextA] = getAccessibleColor(52, 152, 219, 255);
      fill(titleTextR, titleTextG, titleTextB, titleTextA);
      textSize(getAccessibleFontSize(18));
      let wrappedLines = wrapText(lines[i], maxTextWidth);
      for (let wrappedLine of wrappedLines) {
        text(wrappedLine, width/2, contentY);
        contentY += 35;
      }
    } else {
      // Texto normal - dividir en líneas si es necesario
      let [normalTextR, normalTextG, normalTextB, normalTextA] = getAccessibleColor(52, 73, 94, 255);
      fill(normalTextR, normalTextG, normalTextB, normalTextA);
      textSize(getAccessibleFontSize(14));
      let wrappedLines = wrapText(lines[i], maxTextWidth);
      for (let wrappedLine of wrappedLines) {
        text(wrappedLine, width/2, contentY);
        contentY += 25;
      }
    }
  }

  // Botones de navegación mejorados
  let buttonY = boxY + boxHeight - 60;
  let buttonWidth = 100;
  let buttonHeight = 35;

  // Botón anterior
  if (tutorialStep > 0) {
    // Sombra del botón
    fill(0, 0, 0, 50);
    noStroke();
    rect(boxX + 30 + 2, buttonY + 2, buttonWidth, buttonHeight, 8);

    // Botón principal
    fill(100, 100, 255, 220);
    stroke(100, 100, 255, 255);
    strokeWeight(2);
    rect(boxX + 30, buttonY, buttonWidth, buttonHeight, 8);

    // Texto del botón
    fill(255, 255, 255, 255);
    textAlign(CENTER);
    textSize(getAccessibleFontSize(14));
    text("⬅️ Anterior", boxX + 30 + buttonWidth/2, buttonY + buttonHeight/2 + 5);
  }

  // Botón siguiente/finalizar
  let rightButtonX = boxX + boxWidth - 30 - buttonWidth;

  // Sombra del botón
  fill(0, 0, 0, 50);
  noStroke();
  rect(rightButtonX + 2, buttonY + 2, buttonWidth, buttonHeight, 8);

  // Botón principal
  if (tutorialStep < tutorialSteps.length - 1) {
    fill(100, 255, 100, 220);
    stroke(100, 255, 100, 255);
    strokeWeight(2);
    rect(rightButtonX, buttonY, buttonWidth, buttonHeight, 8);

    fill(255, 255, 255, 255);
    textAlign(CENTER);
    textSize(getAccessibleFontSize(14));
    text("Siguiente ➡️", rightButtonX + buttonWidth/2, buttonY + buttonHeight/2 + 5);
  } else {
    fill(255, 100, 100, 220);
    stroke(255, 100, 100, 255);
    strokeWeight(2);
    rect(rightButtonX, buttonY, buttonWidth, buttonHeight, 8);

    fill(255, 255, 255, 255);
    textAlign(CENTER);
    textSize(getAccessibleFontSize(14));
    text("🎉 Finalizar", rightButtonX + buttonWidth/2, buttonY + buttonHeight/2 + 5);
  }

  // Indicador visual de progreso (círculos)
  let dotsY = boxY + boxHeight - 45;
  let dotsSpacing = 20;
  let totalDots = tutorialSteps.length;
  let dotsStartX = width/2 - (totalDots * dotsSpacing) / 2;

  for (let i = 0; i < totalDots; i++) {
    if (i === tutorialStep) {
      fill(52, 152, 219, 255);
      stroke(52, 152, 219, 255);
      strokeWeight(2);
      ellipse(dotsStartX + i * dotsSpacing, dotsY, 12, 12);
    } else if (i < tutorialStep) {
      fill(100, 255, 100, 200);
      stroke(100, 255, 100, 255);
      strokeWeight(1);
      ellipse(dotsStartX + i * dotsSpacing, dotsY, 8, 8);
    } else {
      fill(200, 200, 200, 150);
      noStroke();
      ellipse(dotsStartX + i * dotsSpacing, dotsY, 6, 6);
    }
  }
}

function drawComparisonMode() {
  if (!comparisonMode) return;

  // Aplicar configuración de comparación actual
  let config = comparisonConfigs[currentComparisonIndex];
  angleSlider.value(config.angle);
  updateParameters();

  // Overlay de comparación
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, 60);

  fill(255, 255, 255, 255);
  textAlign(CENTER);
  textSize(18);
  text(config.name, width/2, 30);

  textSize(14);
  text(`Configuración ${currentComparisonIndex + 1} de ${comparisonConfigs.length}`, width/2, 50);

  // Controles de navegación
  fill(100, 100, 255, 255);
  rect(20, 10, 60, 30, 5);
  fill(255, 255, 255, 255);
  textSize(12);
  text("◀", 50, 28);

  fill(100, 255, 100, 255);
  rect(width - 80, 10, 60, 30, 5);
  fill(255, 255, 255, 255);
  text("▶", width - 50, 28);
}

function mousePressed() {
  // Handle tutorial navigation
  if (tutorialMode) {
    let boxWidth = min(600, width * 0.9); // Actualizado para coincidir con drawTutorialOverlay
    let boxHeight = min(400, height * 0.7); // Actualizado para coincidir con drawTutorialOverlay
    let boxX = width/2 - boxWidth/2;
    let boxY = height/2 - boxHeight/2;
    let buttonY = boxY + boxHeight - 60;
    let buttonWidth = 100;
    let buttonHeight = 35;

    // Botón anterior
    if (tutorialStep > 0 &&
        mouseX > boxX + 30 && mouseX < boxX + 30 + buttonWidth &&
        mouseY > buttonY && mouseY < buttonY + buttonHeight) {
      tutorialStep--;
    }

    // Botón siguiente/finalizar
    let rightButtonX = boxX + boxWidth - 30 - buttonWidth;
    if (mouseX > rightButtonX && mouseX < rightButtonX + buttonWidth &&
        mouseY > buttonY && mouseY < buttonY + buttonHeight) {
      if (tutorialStep < tutorialSteps.length - 1) {
        tutorialStep++;
      } else {
        // Finalizar tutorial
        toggleTutorialMode();
      }
    }
  }

  // Handle comparison navigation
  if (comparisonMode) {
    // Botón anterior
    if (mouseX > 20 && mouseX < 80 && mouseY > 10 && mouseY < 40) {
      currentComparisonIndex = max(0, currentComparisonIndex - 1);
    }

    // Botón siguiente
    if (mouseX > width - 80 && mouseX < width - 20 && mouseY > 10 && mouseY < 40) {
      currentComparisonIndex = min(comparisonConfigs.length - 1, currentComparisonIndex + 1);
    }
  }

  // ===== DIBUJAR GAUGES CIRCULARES =====
  // Solo dibujar si no estamos en modo tutorial o comparación
  if (!tutorialMode && !comparisonMode) {
    // Calcular valores para los gauges
    let liftDragRatio = liftForce / max(dragForce, 0.1); // Evitar división por cero
    let airspeed = windSpeed;
    let angleOfAttack = degrees(angleAttack);
    let currentAltitude = altitude;

    // Gauge 1: Lift/Drag Ratio (esquina superior izquierda)
    drawCircularGauge(80, 80, 40, liftDragRatio, 10, 0, 'L/D Ratio', '', [52, 152, 219], 
      'Relación Lift/Drag: ' + Math.round(liftDragRatio * 10) / 10 + '. Mayor valor = mejor eficiencia aerodinámica');

    // Gauge 2: Airspeed (esquina superior derecha)
    drawCircularGauge(width - 80, 80, 40, airspeed, 100, 0, 'Velocidad', 'km/h', [46, 204, 113],
      'Velocidad del viento: ' + Math.round(airspeed) + ' km/h. Afecta la fuerza de sustentación y resistencia');

    // Gauge 3: Angle of Attack (esquina inferior izquierda)
    drawCircularGauge(80, height - 80, 40, angleOfAttack, 20, -10, 'Ángulo', '°', [230, 126, 34],
      'Ángulo de ataque: ' + Math.round(angleOfAttack * 10) / 10 + '°. Óptimo entre 8-12° para máxima sustentación');

    // Gauge 4: Altitude (esquina inferior derecha)
    drawCircularGauge(width - 80, height - 80, 40, currentAltitude, 10000, 0, 'Altitud', 'm', [155, 89, 182],
      'Altitud: ' + Math.round(currentAltitude) + ' m. Afecta la densidad del aire y las fuerzas aerodinámicas');
  }
}