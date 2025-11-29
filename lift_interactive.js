let angleSlider, windSlider, altitudeSlider, massSlider;
let angleAttack = 0;
let liftMagnitude = 0;
let liftCoefficient = 0; // Current CL value for charts
let flowOffset = 0;
let windSpeed = 70; // m/s
let altitude = 0; // m
let mass = 80; // kg
let wingArea = 0.1; // m²
let cd = 0.05; // drag coefficient
let rho = 1.225; // kg/m³
let weight = mass * 9.81; // N
let bgImage;
let P1 = 101325; // Upper surface pressure
let P2 = 101325; // Lower surface pressure

// Advanced aerodynamic parameters
let pressureCoefficient = 0; // Cp
let reynoldsNumber = 0; // Re
let machNumber = 0; // M
let dynamicViscosity = 1.81e-5; // μ (kg/m·s) at standard conditions
let speedOfSound = 343; // a (m/s) at sea level
let flowParticles = []; // Array of flow particles following aerodynamic paths

// Accessibility variables
let fontScale = 1.0;
let canvasFontScale = 1.0; // Scale factor for canvas text only

// Color scheme
let colors = {
  background: [135, 206, 250], // Sky blue
  skyGradient: [[135, 206, 250], [100, 180, 220]], // Blue gradient
  wing: [255, 255, 255], // White wing
  wingOutline: [100, 150, 200], // Blue outline
  liftForce: [0, 200, 0], // Green
  weightForce: [200, 0, 0], // Red
  text: [0, 0, 0], // Black text
  stallWarning: [255, 0, 0], // Red flash
  maxLiftSuccess: [0, 255, 0], // Green flash
  velocityHigh: [100, 150, 255], // Light blue for high velocity
  velocityLow: [150, 200, 255], // Lighter blue for low velocity
  flowFast: [173, 216, 230], // Light blue for fast flow
  flowSlow: [255, 182, 193] // Light pink for slow flow
};

// Educational features variables
let showEducationalLegends = false;
let showPressureDiagram = false;
let showVelocityDiagram = false;
let showForceDiagram = false;

// Animation and interpolation variables
let targetAngleAttack = 0;
let targetWindSpeed = 70;
let targetAltitude = 0;
let targetMass = 80;
let currentAngleAttack = 0;
let currentWindSpeed = 70;
let currentAltitude = 0;
let currentMass = 80;
let animationSpeed = 0.05; // Easing factor (0-1, lower = smoother)

// Critical value tracking for impact effects
let stallWarning = false;
let maxLiftWarning = false;
let previousLiftMagnitude = 0;

// Flash effect variables for impact feedback
let stallFlashIntensity = 0;
let maxLiftFlashIntensity = 0;

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

// Mobile optimization variables
var isLowEndDevice = false;
var canvasScaleFactor = 1.0;
var reducedQualityMode = false;

// Pinch-to-zoom variables
let initialDistance = 0;
let initialScale = 1.0;
let currentScale = 1.0;
let zoomCenterX = 0;
let zoomCenterY = 0;
let isPinching = false;

// Material textures variables
let materialTextures = {};
let fuselageTexture = null;
let wingTexture = null;
let engineTexture = null;

// Throttling utility function for performance optimization
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// Throttled version of updateParameters for better performance
const throttledUpdateParameters = throttle(updateParameters, 16); // ~60fps

// Function to detect low-end devices and adjust quality settings
function detectLowEndDevice() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) {
    isLowEndDevice = false;
    canvasScaleFactor = 1.0;
    reducedQualityMode = false;
    return;
  }

  // Check for various low-end indicators
  const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4; // Less than 4GB RAM
  const hasSlowHardwareConcurrency = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
  const hasSmallScreen = window.innerWidth * window.innerHeight < 300000; // Less than ~550x550 pixels
  const isOldAndroid = /Android [2-6]/.test(navigator.userAgent);
  const isOldiOS = /iPhone OS [1-9]|iPad.*OS [1-9]/.test(navigator.userAgent);

  // Performance test - measure time to create a canvas and draw
  const perfTestStart = performance.now();
  const testCanvas = document.createElement('canvas');
  testCanvas.width = testCanvas.height = 100;
  const ctx = testCanvas.getContext('2d');
  ctx.fillRect(0, 0, 100, 100);
  const perfTestTime = performance.now() - perfTestStart;

  // Consider device low-end if multiple conditions are met
  const lowEndIndicators = [
    hasLowMemory,
    hasSlowHardwareConcurrency,
    hasSmallScreen,
    isOldAndroid,
    isOldiOS,
    perfTestTime > 5 // Canvas operations take more than 5ms
  ].filter(Boolean).length;

  isLowEndDevice = lowEndIndicators >= 2;
  
  if (isLowEndDevice) {
    canvasScaleFactor = 0.75; // Reduce canvas size by 25%
    reducedQualityMode = true;
    console.log('Low-end device detected, enabling reduced quality mode');
  } else {
    canvasScaleFactor = 1.0;
    reducedQualityMode = false;
  }
}

// Function to calculate distance between two touch points
function getTouchDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Function to get center point between two touches
function getTouchCenter(touch1, touch2) {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  };
}

// Function to handle pinch-to-zoom gestures
function handlePinchZoom(event) {
  if (event.touches.length === 2) {
    event.preventDefault();
    
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const distance = getTouchDistance(touch1, touch2);
    const center = getTouchCenter(touch1, touch2);
    
    if (!isPinching) {
      // Start of pinch gesture
      isPinching = true;
      initialDistance = distance;
      initialScale = currentScale;
      zoomCenterX = center.x;
      zoomCenterY = center.y;
    } else {
      // Continue pinch gesture
      const scale = distance / initialDistance;
      currentScale = Math.max(0.5, Math.min(3.0, initialScale * scale)); // Limit zoom between 0.5x and 3.0x
      
      // Apply zoom to canvas
      applyZoom(currentScale, center.x, center.y);
    }
  }
}

// Function to apply zoom transformation
function applyZoom(scale, centerX, centerY) {
  // This would require modifying the drawing functions to use scale
  // For now, we'll implement a basic zoom that affects the entire canvas
  push();
  translate(centerX, centerY);
  scale(scale);
  translate(-centerX, -centerY);
  // The drawing functions would need to be called here with the transformation
  pop();
}

// Function to handle pinch end
function handlePinchEnd(event) {
  if (event.touches.length < 2) {
    if (isPinching) {
      hapticFeedback('light'); // Feedback when pinch gesture ends
    }
    isPinching = false;
  }
}

// Function to provide haptic feedback on mobile devices
function hapticFeedback(intensity = 'light') {
  if (!navigator.vibrate) return; // Check if vibration is supported
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobile) return; // Only vibrate on mobile devices
  
  let pattern;
  switch (intensity) {
    case 'light':
      pattern = 50; // 50ms vibration
      break;
    case 'medium':
      pattern = [50, 50, 50]; // 50ms on, 50ms off, 50ms on
      break;
    case 'heavy':
      pattern = [100, 50, 100]; // Stronger vibration
      break;
    default:
      pattern = 50;
  }
  
  navigator.vibrate(pattern);
}

function preload() {
  // No sounds to load
}

function setup() {
  console.log('Setup called');

  // Detect low-end devices and adjust quality settings
  detectLowEndDevice();

  // Create canvas with responsive sizing and quality adjustment
  let canvasWidth = min(1000, windowWidth - 350) * canvasScaleFactor; // Leave space for data panel
  let canvasHeight = min(700, windowHeight - 20) * canvasScaleFactor;
  createCanvas(canvasWidth, canvasHeight);
  
  // Adjust graphics quality for low-end devices
  if (reducedQualityMode) {
    noSmooth(); // Disable anti-aliasing for better performance
    bloomEnabled = false; // Disable bloom effect
    dofEnabled = false; // Disable depth of field
    motionBlurEnabled = false; // Disable motion blur
    lodEnabled = true; // Keep LOD for performance
    console.log('Reduced quality mode enabled for low-end device');
  } else {
    smooth(); // Enable anti-aliasing for smoother edges
  }
  
  console.log('Canvas created with size:', canvasWidth, canvasHeight, 'scale factor:', canvasScaleFactor);

  // Initialize DOM elements immediately
  initializeDOMElements();

  // Load material textures
  loadMaterialTextures();

  // Initialize flow particles
  initializeFlowParticles();

  // Set default values immediately
  angleAttack = (window.defaultValues ? window.defaultValues.angleAttack : 5) * Math.PI / 180;
  windSpeed = window.defaultValues ? window.defaultValues.windSpeed : 70;
  altitude = window.defaultValues ? window.defaultValues.altitude : 0;
  mass = window.defaultValues ? window.defaultValues.mass : 80;
  rho = 1.225 * exp(-altitude / 8000);
  weight = mass * 9.81;

  console.log('Setup completed with default values');
}

function initializeDOMElements() {
  console.log('=== Initializing DOM elements ===');

  // Get slider elements using p5.js select() for consistency
  angleSlider = select('#angle-slider');
  windSlider = select('#wind-slider');
  altitudeSlider = select('#altitude-slider');
  massSlider = select('#mass-slider');

  console.log('Sliders found:', {
    angleSlider: !!angleSlider,
    windSlider: !!windSlider,
    altitudeSlider: !!altitudeSlider,
    massSlider: !!massSlider
  });

  // Get buttons
  let resetBtn = select('#reset-btn');
  let tutorialBtn = select('#tutorial-btn');
  let tutorialModeBtn = document.getElementById('tutorial-btn');
  let exportBtn = select('#export-btn');
  let closeTutorialBtn = select('#close-tutorial');
  let saveBtn = select('#save-btn');
  let loadBtn = select('#load-btn');
  let togglePanelBtn = select('#toggle-panel-btn');
  let showPanelBtn = select('#show-panel-btn');

  console.log('Tutorial mode button found:', !!tutorialModeBtn);
  console.log('Tutorial mode button element:', tutorialModeBtn);

  // Get accessibility checkboxes
  let fontScaleInput = document.getElementById('font-scale');

  // Get educational feature checkboxes
  let educationalLegendsCheckbox = document.getElementById('educational-legends');
  let pressureDiagramCheckbox = document.getElementById('pressure-diagram');
  let velocityDiagramCheckbox = document.getElementById('velocity-diagram');
  let forceDiagramCheckbox = document.getElementById('force-diagram');

  console.log('Accessibility checkboxes found:', {
  });

  // Synchronize initial state of accessibility features with checkboxes
  if (fontScaleInput) {
    fontScaleInput.value = fontScale;
    canvasFontScale = fontScale; // Initialize canvas font scale
    let fontScaleValue = document.getElementById('font-scale-value');
    if (fontScaleValue) {
      fontScaleValue.textContent = Math.round(fontScale * 100) + '%';
    }
  }

  console.log('Accessibility features initial state:', {
    fontScale
  });

  console.log('Educational checkboxes found:', {
    educationalLegendsCheckbox: !!educationalLegendsCheckbox,
    pressureDiagramCheckbox: !!pressureDiagramCheckbox,
    velocityDiagramCheckbox: !!velocityDiagramCheckbox,
    forceDiagramCheckbox: !!forceDiagramCheckbox
  });

  // Synchronize initial state of educational features with checkboxes
  if (educationalLegendsCheckbox) showEducationalLegends = educationalLegendsCheckbox.checked;
  if (pressureDiagramCheckbox) showPressureDiagram = pressureDiagramCheckbox.checked;
  if (velocityDiagramCheckbox) showVelocityDiagram = velocityDiagramCheckbox.checked;
  if (forceDiagramCheckbox) showForceDiagram = forceDiagramCheckbox.checked;

  console.log('Educational features initial state:', {
    showEducationalLegends,
    showPressureDiagram,
    showVelocityDiagram,
    showForceDiagram
  });

  // Add event listeners with throttling for better performance
  if (angleSlider) {
    angleSlider.input(throttledUpdateParameters);
    // Add touch events for mobile devices
    angleSlider.elt.addEventListener('touchstart', throttledUpdateParameters, { passive: true });
    angleSlider.elt.addEventListener('touchmove', throttledUpdateParameters, { passive: true });
    angleSlider.elt.addEventListener('touchend', throttledUpdateParameters, { passive: true });
    console.log('Angle slider initialized with throttling');
  }
  if (windSlider) {
    windSlider.input(throttledUpdateParameters);
    windSlider.elt.addEventListener('touchstart', throttledUpdateParameters, { passive: true });
    windSlider.elt.addEventListener('touchmove', throttledUpdateParameters, { passive: true });
    windSlider.elt.addEventListener('touchend', throttledUpdateParameters, { passive: true });
  }
  if (altitudeSlider) {
    altitudeSlider.input(throttledUpdateParameters);
    altitudeSlider.elt.addEventListener('touchstart', throttledUpdateParameters, { passive: true });
    altitudeSlider.elt.addEventListener('touchmove', throttledUpdateParameters, { passive: true });
    altitudeSlider.elt.addEventListener('touchend', throttledUpdateParameters, { passive: true });
  }
  if (massSlider) {
    massSlider.input(throttledUpdateParameters);
    massSlider.elt.addEventListener('touchstart', throttledUpdateParameters, { passive: true });
    massSlider.elt.addEventListener('touchmove', throttledUpdateParameters, { passive: true });
    massSlider.elt.addEventListener('touchend', throttledUpdateParameters, { passive: true });
  }

  // Button listeners
  if (resetBtn) resetBtn.mousePressed(resetSimulation);
  if (tutorialBtn) tutorialBtn.mousePressed(showTutorial);
  if (tutorialModeBtn) {
    tutorialModeBtn.addEventListener('click', showTutorial);
    console.log('Tutorial mode button event listener added');
  } else {
    console.error('Tutorial mode button not found for event listener');
  }
  if (exportBtn) exportBtn.mousePressed(exportData);
  if (closeTutorialBtn) closeTutorialBtn.mousePressed(hideTutorial);
  if (saveBtn) saveBtn.mousePressed(saveConfiguration);
  if (loadBtn) loadBtn.mousePressed(loadConfiguration);
  
  // Educational preset buttons
  let presetOptimalBtn = select('#preset-optimal');
  let presetStallBtn = select('#preset-stall');
  let presetAltitudeBtn = select('#preset-altitude');
  let presetSupersonicBtn = select('#preset-supersonic');
  
  console.log('Preset buttons found:', {
    presetOptimalBtn: !!presetOptimalBtn,
    presetStallBtn: !!presetStallBtn,
    presetAltitudeBtn: !!presetAltitudeBtn,
    presetSupersonicBtn: !!presetSupersonicBtn
  });
  
  if (presetOptimalBtn) {
    presetOptimalBtn.mousePressed(() => {
      console.log('Optimal preset button clicked');
      applyEducationalPreset('optimal');
    });
    console.log('Optimal preset event listener added');
  } else {
    console.log('ERROR: Optimal preset button not found');
  }
  
  if (presetStallBtn) {
    presetStallBtn.mousePressed(() => {
      console.log('Stall preset button clicked');
      applyEducationalPreset('stall');
    });
    console.log('Stall preset event listener added');
  } else {
    console.log('ERROR: Stall preset button not found');
  }
  
  if (presetAltitudeBtn) {
    presetAltitudeBtn.mousePressed(() => {
      console.log('Altitude preset button clicked');
      applyEducationalPreset('altitude');
    });
    console.log('Altitude preset event listener added');
  } else {
    console.log('ERROR: Altitude preset button not found');
  }
  
  if (presetSupersonicBtn) {
    presetSupersonicBtn.mousePressed(() => {
      console.log('Supersonic preset button clicked');
      applyEducationalPreset('supersonic');
    });
    console.log('Supersonic preset event listener added');
  } else {
    console.log('ERROR: Supersonic preset button not found');
  }
  
  if (togglePanelBtn) togglePanelBtn.mousePressed(togglePanel);
  if (showPanelBtn) showPanelBtn.mousePressed(togglePanel);

  // Accessibility checkbox listeners
  if (fontScaleInput) fontScaleInput.addEventListener('input', updateFontScale);

  // Educational feature checkbox listeners
  if (educationalLegendsCheckbox) educationalLegendsCheckbox.addEventListener('change', toggleEducationalLegends);
  if (pressureDiagramCheckbox) pressureDiagramCheckbox.addEventListener('change', togglePressureDiagram);
  if (velocityDiagramCheckbox) velocityDiagramCheckbox.addEventListener('change', toggleVelocityDiagram);
  if (forceDiagramCheckbox) forceDiagramCheckbox.addEventListener('change', toggleForceDiagram);

  // Add pinch-to-zoom event listeners for mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    document.addEventListener('touchmove', handlePinchZoom, { passive: false });
    document.addEventListener('touchend', handlePinchEnd, { passive: true });
    document.addEventListener('touchcancel', handlePinchEnd, { passive: true });
  }

  // Initialize parameters after all DOM elements are set up
  updateParameters();

  // Add micro-interactions to UI elements
  addMicroInteractions();

  console.log('DOM elements initialized');
}

function updateParameters() {
  // Define easing for smooth transitions
  let easing = animationSpeed;

  // Check if sliders are initialized before using them
  if (!angleSlider || !windSlider || !altitudeSlider || !massSlider) {
    console.log('Sliders not yet initialized, skipping updateParameters');
    return;
  }

  // Update target values from sliders (smooth transitions will happen in draw())
  targetAngleAttack = angleSlider.value() * Math.PI / 180;
  targetWindSpeed = windSlider.value();
  targetAltitude = altitudeSlider.value();
  targetMass = massSlider.value();

  // Update UI values immediately for responsive feel
  select('#angle-value').html(angleSlider.value() + '°');
  select('#wind-value').html(targetWindSpeed + ' m/s');
  select('#altitude-value').html(targetAltitude + ' m');
  select('#mass-value').html(targetMass + ' kg');
}

// Smooth interpolation function for animations
function interpolateParameters() {
  // Define easing for smooth transitions
  let easing = animationSpeed;

  // Normal interpolation
  currentAngleAttack = lerp(currentAngleAttack, targetAngleAttack, easing);
  currentWindSpeed = lerp(currentWindSpeed, targetWindSpeed, easing);
  currentAltitude = lerp(currentAltitude, targetAltitude, easing);
  currentMass = lerp(currentMass, targetMass, easing);

  // Update actual physics variables
  angleAttack = currentAngleAttack;
  windSpeed = currentWindSpeed;
  altitude = currentAltitude;
  mass = currentMass;

  // Calculate air density based on altitude (ISA - International Standard Atmosphere)
  // rho = rho0 * exp(-altitude / H) where H ≈ 8500m for troposphere
  rho = 1.225 * exp(-altitude / 8500);

  // Calculate atmospheric pressure at altitude (simplified)
  let P_atm = 101325 * exp(-altitude / 8500); // Pa

  // Calculate weight
  weight = mass * 9.81;

  // Update physics UI values
  select('#weight-value').html(weight.toFixed(0) + ' N');
  select('#rho-value').html(rho.toFixed(3) + ' kg/m³');
  
  // Update advanced aerodynamic parameters display
  select('#cp-value').html(pressureCoefficient.toFixed(2));
  select('#re-value').html(reynoldsNumber.toExponential(1));
  select('#mach-value').html(machNumber.toFixed(3));

  let alpha_deg = degrees(angleAttack);
  // More realistic lift coefficient (thin airfoil theory approximation)
  // cl = 2π * sin(α) for small angles, but we use radians correctly
  let cl = 2 * PI * sin(angleAttack);
  // Simulate stall: reduction when α > 15°
  if (alpha_deg > 15) {
    cl *= max(0, 1 - (alpha_deg - 15) / 10);
  }
  
  // Store current CL for chart display
  liftCoefficient = cl;

  // Wing area (assuming a small model airplane wing)
  let wingArea = 0.1; // m²

  // Dynamic pressure
  let q = 0.5 * rho * windSpeed * windSpeed;

  // Lift magnitude using standard aerodynamic formula: L = cl * q * A
  let newLiftMagnitude = max(0, cl * q * wingArea);

  // Smooth lift changes for educational animation
  liftMagnitude = lerp(liftMagnitude, newLiftMagnitude, easing * 0.5); // Slower lift changes

  select('#lift-value').html(liftMagnitude.toFixed(0) + ' N');

  // Calculate velocities above and below wing using potential flow theory
  // For a thin airfoil, the velocity above is higher than below
  // Using simplified approximation: v_upper = v∞ * (1 + k*sin(α)), v_lower = v∞ * (1 - k*sin(α))
  let k = 0.1; // Circulation factor (simplified)
  let v1 = windSpeed * (1 + k * sin(angleAttack)); // Above wing (faster)
  let v2 = windSpeed * (1 - k * sin(angleAttack)); // Below wing (slower)

  // Ensure minimum velocity (no negative or zero velocities)
  v1 = max(v1, windSpeed * 0.1);
  v2 = max(v2, windSpeed * 0.1);

  // Pressures using Bernoulli equation: P + ½ρv² = constant
  // Using atmospheric pressure at altitude as reference
  P1 = P_atm + 0.5 * rho * (windSpeed**2 - v1**2); // Above (lower pressure)
  P2 = P_atm + 0.5 * rho * (windSpeed**2 - v2**2); // Below (higher pressure)

  select('#p1').html(P1.toFixed(0));
  select('#p2').html(P2.toFixed(0));
  select('#v1').html(v1.toFixed(1));
  select('#v2').html(v2.toFixed(1));

  // Update dynamic lift formula
  select('#cl-dynamic').html(cl.toFixed(2));
  select('#rho-dynamic').html(rho.toFixed(3));
  select('#v-dynamic').html(windSpeed.toFixed(0));
  select('#area-dynamic').html(wingArea.toFixed(1));

  // Calculate advanced aerodynamic parameters
  let dynamicPressure = 0.5 * rho * windSpeed * windSpeed; // Dynamic pressure
  
  // Pressure coefficient (Cp) - using upper surface as example
  pressureCoefficient = (P1 - P_atm) / dynamicPressure;
  
  // Reynolds number - using wing chord length approximation (0.3m)
  let chordLength = 0.3; // meters
  reynoldsNumber = (rho * windSpeed * chordLength) / dynamicViscosity;
  
  // Mach number
  machNumber = windSpeed / speedOfSound;

  // Check for critical values and trigger impact effects
  checkCriticalValues(alpha_deg, liftMagnitude);
}

// Check for critical aerodynamic values and trigger visual feedback
function checkCriticalValues(alpha_deg, currentLift) {
  let newStallWarning = alpha_deg > 12; // Warning before stall
  let newMaxLiftWarning = currentLift > previousLiftMagnitude * 1.2; // Sudden lift increase

  // Stall warning
  if (newStallWarning && !stallWarning) {
    stallWarning = true;
    triggerStallWarning();
  } else if (!newStallWarning && stallWarning) {
    stallWarning = false;
  }

  // Max lift achievement
  if (newMaxLiftWarning && !maxLiftWarning) {
    maxLiftWarning = true;
    triggerMaxLiftEffect();
  } else if (!newMaxLiftWarning && maxLiftWarning) {
    maxLiftWarning = false;
  }

  previousLiftMagnitude = currentLift;
}

// Visual impact effects for critical aerodynamic values
function triggerStallWarning() {
  stallFlashIntensity = 1.0; // Full intensity red flash
  console.log('🚨 Stall warning triggered!');
}

function triggerMaxLiftEffect() {
  maxLiftFlashIntensity = 1.0; // Full intensity green flash
  console.log('✨ Maximum lift achieved!');
}

// Micro-interactions for UI elements
function addMicroInteractions() {
  // Add hover effects to buttons
  let buttons = document.querySelectorAll('#data-panel button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '';
    });

    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.95)';
    });

    button.addEventListener('mouseup', () => {
      button.style.transform = 'scale(1.05)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 150);
    });
  });

  // Add focus effects to sliders
  let sliders = document.querySelectorAll('#data-panel input[type="range"]');
  sliders.forEach(slider => {
    slider.addEventListener('focus', () => {
      slider.style.boxShadow = '0 0 0 2px rgba(52, 152, 219, 0.5)';
    });

    slider.addEventListener('blur', () => {
      slider.style.boxShadow = '';
    });
  });
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
  clear(); // Clear for P2D

  // Apply zoom transformation if pinching
  if (isPinching || currentScale !== 1.0) {
    push();
    translate(width/2, height/2);
    scale(currentScale);
    translate(-width/2, -height/2);
  }

  // Smooth parameter interpolation for animations
  interpolateParameters();

  // Update flash effects (less frequent on low-end devices)
  const flashUpdateFrequency = reducedQualityMode ? 3 : 1; // Update every 3rd frame on low-end
  if (frameCount % flashUpdateFrequency === 0) {
    if (stallFlashIntensity > 0) {
      stallFlashIntensity *= 0.95; // Fade out
    }
    if (maxLiftFlashIntensity > 0) {
      maxLiftFlashIntensity *= 0.95; // Fade out
    }
  }

  // Variables para efectos visuales mejorados con iluminación dinámica
  let timeOfDay = (frameCount * 0.01) % (2 * PI); // Ciclo de día completo
  let sunAngle = sin(timeOfDay) * PI/3; // Ángulo del sol (-60° a +60°)

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
    // Gradiente de cielo usando esquema de colores actual
    let topColor = color(colors.skyGradient[0][0], colors.skyGradient[0][1], colors.skyGradient[0][2]);
    let bottomColor = color(colors.skyGradient[1][0], colors.skyGradient[1][1], colors.skyGradient[1][2]);

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
    stroke(colors.wingOutline[0], colors.wingOutline[1], colors.wingOutline[2], 100);
    strokeWeight(1);
    line(0, height * 0.7, width, height * 0.7);
  }

  // Initialize with default values
  if (!angleSlider) {
    angleAttack = 5 * Math.PI / 180;
  } else {
    angleAttack = angleSlider.value() * Math.PI / 180;
  }

  if (!windSlider) {
    windSpeed = 70;
  } else {
    windSpeed = windSlider.value();
  }

  if (!altitudeSlider) {
    altitude = 0;
  } else {
    altitude = altitudeSlider.value();
  }

  if (!massSlider) {
    mass = 80;
  } else {
    mass = massSlider.value();
  }

  // Update parameters with current values
  rho = 1.225 * exp(-altitude / 8000);
  weight = mass * 9.81;

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
  textSize(28 * canvasFontScale);
  textAlign(CENTER);
  fill(255);
  stroke(colors.text[0], colors.text[1], colors.text[2]);
  strokeWeight(2);
  text('Simulador Interactivo de Sustentación', width / 2, 50);

  // Etiqueta del slider
  textSize(16 * canvasFontScale);
  textAlign(LEFT);
  fill(colors.text[0], colors.text[1], colors.text[2]);
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

  // ===== EFECTOS DE IMPACTO VISUAL =====
  // Stall warning flash (red)
  if (stallFlashIntensity > 0.01) {
    fill(colors.stallWarning[0], colors.stallWarning[1], colors.stallWarning[2], stallFlashIntensity * 100); // Red flash
    noStroke();
    beginShape();
    vertex(leadingEdgeX, leadingEdgeY);
    bezierVertex(-120, -25, -60, -45, 0, -55);
    bezierVertex(60, -55, 120, -45, 180, -25);
    vertex(200, 0);
    bezierVertex(180, 15, 120, 25, 60, 30);
    bezierVertex(0, 30, -60, 25, -120, 15);
    bezierVertex(-150, 8, -120, 10, -90, 12);
    endShape(CLOSE);
  }

  // Max lift success flash (green)
  if (maxLiftFlashIntensity > 0.01) {
    fill(colors.maxLiftSuccess[0], colors.maxLiftSuccess[1], colors.maxLiftSuccess[2], maxLiftFlashIntensity * 100); // Green flash
    noStroke();
    beginShape();
    vertex(leadingEdgeX, leadingEdgeY);
    bezierVertex(-120, -25, -60, -45, 0, -55);
    bezierVertex(60, -55, 120, -45, 180, -25);
    vertex(200, 0);
    bezierVertex(180, 15, 120, 25, 60, 30);
    bezierVertex(0, 30, -60, 25, -120, 15);
    bezierVertex(-150, 8, -120, 10, -90, 12);
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
  if (angleAttack > 10 * Math.PI / 180) { // Solo mostrar en ángulos altos
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
  if (angleAttack > 15 * Math.PI / 180) {
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
    if (angleAttack > 20 * Math.PI / 180) {
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
  fill(colors.text[0] * 0.4, colors.text[1] * 0.4, colors.text[2] * 0.4, 100);
  textSize(10 * canvasFontScale);
  textAlign(CENTER);
  text('NACA 2412', 1, 46);

  // Texto principal
  fill(colors.text[0], colors.text[1], colors.text[2]);
  stroke(colors.text[0] * 0.5, colors.text[1] * 0.5, colors.text[2] * 0.5);
  strokeWeight(1);
  text('NACA 2412', 0, 45);

  // Etiqueta del borde de ataque con mejor diseño - movida más arriba
  fill(colors.text[0], colors.text[1], colors.text[2]);
  stroke(colors.text[0] * 0.6, colors.text[1] * 0.6, colors.text[2] * 0.6);
  strokeWeight(1);
  textSize(8 * canvasFontScale);
  text('Borde de Ataque', leadingEdgeX - 30, leadingEdgeY - 35);

  // Indicador de dirección de vuelo
  stroke(colors.text[0], colors.text[1], colors.text[2], 150);
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
  stroke(colors.velocityHigh[0], colors.velocityHigh[1], colors.velocityHigh[2], 200);
  strokeWeight(3);
  line(0, 0, speedVectorLength, 0);
  // Punta de flecha
  fill(colors.velocityHigh[0], colors.velocityHigh[1], colors.velocityHigh[2], 200);
  noStroke();
  triangle(speedVectorLength, 0, speedVectorLength - 8, -3, speedVectorLength - 8, 3);

  // Indicador de altitud (escala vertical)
  stroke(colors.velocityLow[0], colors.velocityLow[1], colors.velocityLow[2], 150);
  strokeWeight(2);
  line(-60, -30, -60, 30);
  // Marcas de altitud
  for (let i = -20; i <= 20; i += 10) {
    line(-65, i, -55, i);
  }
  // Indicador actual
  let altIndicatorY = map(altitude, 0, 10000, 20, -20);
  fill(colors.velocityLow[0], colors.velocityLow[1], colors.velocityLow[2], 200);
  noStroke();
  ellipse(-60, altIndicatorY, 6, 6);

  // Indicador de sustentación (barra lateral)
  let liftBarHeight = map(liftMagnitude, 0, 200, 0, 40);
  stroke(colors.liftForce[0], colors.liftForce[1], colors.liftForce[2], 180);
  strokeWeight(4);
  line(70, 20, 70, 20 - liftBarHeight);
  // Base de la barra
  fill(colors.liftForce[0], colors.liftForce[1], colors.liftForce[2], 100);
  noStroke();
  rect(65, 15, 10, 10);

  // Texto HUD
  fill(colors.text[0], colors.text[1], colors.text[2], 220);
  textAlign(CENTER);
  textSize(8 * canvasFontScale);
  text(Math.round(windSpeed) + ' m/s', 40, -25);
  text(Math.round(altitude) + ' m', -40, -25);
  text(Math.round(liftMagnitude) + ' N', 40, 35);

  pop();

  // Update and draw aerodynamic flow particles (with same transformations as wing)
  push();
  translate(width / 2, height / 2);
  scale(1.4);
  rotate(angleAttack * 0.3);
  updateFlowParticles();
  drawFlowParticles();
  pop();

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

  // Flecha de Sustentación (azul, estable) - emerge del borde de ataque
  let liftLength = liftMagnitude / 5;
  let leadingEdgeWorldX = width / 2 - 180 * 1.4; // Posición del borde de ataque en coordenadas del mundo
  let leadingEdgeWorldY = height / 2; // Centro vertical

  drawArrow(leadingEdgeWorldX, leadingEdgeWorldY,
           leadingEdgeWorldX, leadingEdgeWorldY - liftLength, colors.liftForce, 6);
  
  // Texto de Sustentación con mejor legibilidad - movido más arriba y a la derecha
  fill(0, 0, 0); // Negro para mejor contraste
  stroke(255, 255, 255); // Borde blanco
  strokeWeight(3);
  textSize(18 * canvasFontScale);
  text('Sustentación', leadingEdgeWorldX + 40, leadingEdgeWorldY - liftLength - 20);
  noStroke();

  // Flecha de Peso (rojo, emerge del borde de ataque hacia abajo)
  drawArrow(leadingEdgeWorldX, leadingEdgeWorldY,
           leadingEdgeWorldX, leadingEdgeWorldY + 80, colors.weightForce, 6);
  
  // Texto de Peso con mejor legibilidad - movido más abajo y a la derecha
  fill(0, 0, 0); // Negro para mejor contraste
  stroke(255, 255, 255); // Borde blanco
  strokeWeight(3);
  textSize(18 * canvasFontScale);
  text('Peso', leadingEdgeWorldX + 40, leadingEdgeWorldY + 110);
  noStroke();

  // Etiquetas de flujo
  textAlign(LEFT);
  fill(colors.flowFast[0], colors.flowFast[1], colors.flowFast[2]);
  textSize(14 * canvasFontScale);
  text('Aire Rápido (Baja P)', 50, height / 2 - 80);
  fill(colors.flowSlow[0], colors.flowSlow[1], colors.flowSlow[2]);
  text('Aire Lento (Alta P)', 50, height / 2 + 100);



  // Close camera transformation
  pop();

  // Close camera transformation
  pop();

  // Close the initial zoom/pinch transformation
  pop();

}

function resetSimulation() {
  hapticFeedback('medium'); // Haptic feedback for reset action
  angleSlider.value(5);
  windSlider.value(70);
  altitudeSlider.value(0);
  massSlider.value(80);
  updateParameters();
}

function applyEducationalPreset(presetType) {
  console.log('=== Applying preset:', presetType, '===');
  
  // Store old values for comparison
  let oldAngle = degrees(angleAttack);
  let oldWind = windSpeed;
  let oldAlt = altitude;
  let oldMass = mass;
  
  switch(presetType) {
    case 'optimal':
      angleAttack = radians(10);
      windSpeed = 80;
      altitude = 0;
      mass = 80;
      console.log('Set to optimal: angle=10°, wind=80, alt=0, mass=80');
      break;
      
    case 'stall':
      angleAttack = radians(18);
      windSpeed = 60;
      altitude = 0;
      mass = 100;
      console.log('Set to stall: angle=18°, wind=60, alt=0, mass=100');
      break;
      
    case 'altitude':
      angleAttack = radians(8);
      windSpeed = 90;
      altitude = 3000;
      mass = 80;
      console.log('Set to altitude: angle=8°, wind=90, alt=3000, mass=80');
      break;
      
    case 'supersonic':
      angleAttack = radians(5);
      windSpeed = 320;
      altitude = 11000;
      mass = 60;
      console.log('Set to supersonic: angle=5°, wind=320, alt=11000, mass=60');
      break;
  }
  
  console.log('Values changed from:', {oldAngle, oldWind, oldAlt, oldMass}, 'to:', {angle: degrees(angleAttack), wind: windSpeed, alt: altitude, mass: mass});
  
  // Update sliders - use the DOM element's value property
  if (angleSlider) {
    let sliderElement = angleSlider.elt; // Get the actual DOM element
    sliderElement.value = degrees(angleAttack);
    console.log('Updated angle slider to:', degrees(angleAttack));
  } else {
    console.log('ERROR: angleSlider not found');
  }
  
  if (windSlider) {
    let sliderElement = windSlider.elt;
    sliderElement.value = windSpeed;
    console.log('Updated wind slider to:', windSpeed);
  } else {
    console.log('ERROR: windSlider not found');
  }
  
  if (altitudeSlider) {
    let sliderElement = altitudeSlider.elt;
    sliderElement.value = altitude;
    console.log('Updated altitude slider to:', altitude);
  } else {
    console.log('ERROR: altitudeSlider not found');
  }
  
  if (massSlider) {
    let sliderElement = massSlider.elt;
    sliderElement.value = mass;
    console.log('Updated mass slider to:', mass);
  } else {
    console.log('ERROR: massSlider not found');
  }
  
  // Update target values for smooth interpolation
  targetAngleAttack = angleAttack;
  targetWindSpeed = windSpeed;
  targetAltitude = altitude;
  targetMass = mass;
  
  // Update current values immediately (no smooth transition for presets)
  currentAngleAttack = angleAttack;
  currentWindSpeed = windSpeed;
  currentAltitude = altitude;
  currentMass = mass;
  
  // Force immediate UI update
  select('#angle-value').html(degrees(angleAttack).toFixed(1) + '°');
  select('#wind-value').html(windSpeed + ' m/s');
  select('#altitude-value').html(altitude + ' m');
  select('#mass-value').html(mass + ' kg');
  
  // Show explanation
  showPresetExplanation(presetType);
  
  console.log('UI updated, preset applied successfully');
}

function showPresetExplanation(presetType) {
  let explanationDiv = select('#preset-explanation');
  let contentDiv = select('#explanation-content');
  
  if (!explanationDiv || !contentDiv) {
    console.error('Explanation divs not found');
    return;
  }
  
  let title, explanation;
  
  switch(presetType) {
    case 'optimal':
      title = 'Óptimo CL - Configuración Óptima';
      explanation = 'Esta configuración demuestra las condiciones ideales para maximizar el coeficiente de sustentación (CL). ' +
                   'Con un ángulo de ataque de 10° y velocidad de 80 m/s, se obtiene el mejor equilibrio entre sustentación y resistencia. ' +
                   'Observa cómo la sustentación es máxima sin riesgo de stall.';
      break;
      
    case 'stall':
      title = 'Stall - Pérdida de Sustentación';
      explanation = 'El stall ocurre cuando el ángulo de ataque es demasiado alto (18° aquí). ' +
                   'La capa límite se separa del ala, causando una brusca pérdida de sustentación. ' +
                   'Nota cómo la sustentación disminuye drásticamente y aparecen turbulencias.';
      break;
      
    case 'altitude':
      title = 'Altitud - Efectos de la Altitud';
      explanation = 'A mayor altitud (3000m), la densidad del aire disminuye, reduciendo la sustentación. ' +
                   'Para compensar, se necesita mayor velocidad (90 m/s) y un ángulo de ataque ligeramente menor. ' +
                   'Esto demuestra por qué los aviones necesitan más pista para despegar en aeropuertos de alta montaña.';
      break;
      
    case 'supersonic':
      title = 'Supersónico - Vuelo Supersónico';
      explanation = 'En régimen supersónico (320 m/s ≈ Mach 1.0), la aerodinámica cambia completamente. ' +
                   'Se forma una onda de choque que aumenta la resistencia. ' +
                   'Los aviones supersónicos necesitan alas delgadas y formas aerodinámicas especiales para manejar estas condiciones extremas.';
      break;
      
    default:
      title = 'Preset Desconocido';
      explanation = 'No hay explicación disponible para este preset.';
  }
  
  contentDiv.html(`<strong>${title}</strong><br><br>${explanation}<br><br><button onclick="hidePresetExplanation()" style="background: linear-gradient(145deg, #95a5a6, #7f8c8d); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.2s ease;">✕ Cerrar</button>`);
  explanationDiv.style('display', 'block');
  
  // No auto-hide - let user close manually
}

function hidePresetExplanation() {
  let explanationDiv = select('#preset-explanation');
  if (explanationDiv) {
    explanationDiv.style('display', 'none');
  }
}

function showTutorial() {
  try {
    hapticFeedback('light');
    console.log('Showing tutorial modal');
    let modal = document.getElementById('tutorial-modal');
    if (modal) {
      modal.style.display = 'flex';
      console.log('Tutorial modal displayed successfully');
    } else {
      console.error('Tutorial modal element not found');
    }
  } catch (error) {
    console.error('Error showing tutorial modal:', error);
  }
}

function hideTutorial() {
  try {
    hapticFeedback('light');
    console.log('Hiding tutorial modal');
    let modal = document.getElementById('tutorial-modal');
    if (modal) {
      modal.style.display = 'none';
      console.log('Tutorial modal hidden successfully');
    } else {
      console.error('Tutorial modal element not found');
    }
  } catch (error) {
    console.error('Error hiding tutorial modal:', error);
  }
}

function togglePanel() {
  hapticFeedback('light');
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
  
  // Apply scale factor for low-end devices
  canvasWidth *= canvasScaleFactor;
  canvasHeight *= canvasScaleFactor;
  
  resizeCanvas(canvasWidth, canvasHeight);
}

function exportData() {
  // Create comprehensive data object
  let data = {
    timestamp: new Date().toISOString(),
    parameters: {
      angleAttack: degrees(angleAttack),
      windSpeed: windSpeed,
      altitude: altitude,
      mass: mass,
      wingArea: wingArea
    },
    results: {
      liftCoefficient: liftCoefficient,
      liftForce: liftMagnitude,
      weight: weight,
      pressureUpper: P1,
      pressureLower: P2,
      velocityUpper: windSpeed * (1 + 0.1 * sin(angleAttack)),
      velocityLower: windSpeed * (1 - 0.1 * sin(angleAttack)),
      airDensity: rho,
      dynamicPressure: 0.5 * rho * windSpeed * windSpeed
    },
    advanced: {
      pressureCoefficient: pressureCoefficient,
      reynoldsNumber: reynoldsNumber,
      machNumber: machNumber,
      speedOfSound: speedOfSound,
      dynamicViscosity: dynamicViscosity
    }
  };

  // Export as JSON
  saveJSON(data, 'aerodynamics_data.json');

  // Also create CSV version
  let csvContent = createCSVFromData(data);
  downloadCSV(csvContent, 'aerodynamics_data.csv');
}

function createCSVFromData(data) {
  let csv = [];
  
  // Header
  csv.push('Parameter,Value,Unit');
  
  // Parameters section
  csv.push('=== PARAMETERS ===,,');
  csv.push(`Angle of Attack,${data.parameters.angleAttack},degrees`);
  csv.push(`Wind Speed,${data.parameters.windSpeed},m/s`);
  csv.push(`Altitude,${data.parameters.altitude},m`);
  csv.push(`Mass,${data.parameters.mass},kg`);
  csv.push(`Wing Area,${data.parameters.wingArea},m²`);
  
  // Results section
  csv.push('=== RESULTS ===,,');
  csv.push(`Lift Coefficient,${data.results.liftCoefficient},-`);
  csv.push(`Lift Force,${data.results.liftForce},N`);
  csv.push(`Weight,${data.results.weight},N`);
  csv.push(`Upper Surface Pressure,${data.results.pressureUpper},Pa`);
  csv.push(`Lower Surface Pressure,${data.results.pressureLower},Pa`);
  csv.push(`Upper Surface Velocity,${data.results.velocityUpper},m/s`);
  csv.push(`Lower Surface Velocity,${data.results.velocityLower},m/s`);
  csv.push(`Air Density,${data.results.airDensity},kg/m³`);
  csv.push(`Dynamic Pressure,${data.results.dynamicPressure},Pa`);
  
  // Advanced section
  csv.push('=== ADVANCED ===,,');
  csv.push(`Pressure Coefficient,${data.advanced.pressureCoefficient},-`);
  csv.push(`Reynolds Number,${data.advanced.reynoldsNumber},-`);
  csv.push(`Mach Number,${data.advanced.machNumber},-`);
  csv.push(`Speed of Sound,${data.advanced.speedOfSound},m/s`);
  csv.push(`Dynamic Viscosity,${data.advanced.dynamicViscosity},Pa·s`);
  
  return csv.join('\n');
}

function downloadCSV(content, filename) {
  let blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  let link = document.createElement('a');
  let url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

  // Reduce particle count on low-end devices
  const upperParticleCount = reducedQualityMode ? 8 : 15;
  const lowerParticleCount = reducedQualityMode ? 5 : 10;

  // Create particles for upper surface (faster flow) - in local wing coordinates
  for (let i = 0; i < upperParticleCount; i++) {
    // Start particles at random positions along the wing chord (local coordinates)
    let chordPos = random(-160, 160); // Along chord length
    let upperOffset = random(-60, -20); // Above wing surface

    flowParticles.push({
      x: chordPos,
      y: upperOffset,
      vx: 2 + random(1),
      vy: 0,
      surface: 'upper',
      age: random(100),
      maxAge: 200 + random(100),
      trail: []
    });
  }

  // Create particles for lower surface (slower flow) - in local wing coordinates
  for (let i = 0; i < lowerParticleCount; i++) {
    let chordPos = random(-160, 160);
    let lowerOffset = random(20, 60); // Below wing surface

    flowParticles.push({
      x: chordPos,
      y: lowerOffset,
      vx: 1.5 + random(0.5),
      vy: 0,
      surface: 'lower',
      age: random(100),
      maxAge: 180 + random(80),
      trail: []
    });
  }
}

function updateFlowParticles() {
  for (let i = flowParticles.length - 1; i >= 0; i--) {
    let p = flowParticles[i];

    // Update particle position
    p.x += p.vx;
    p.y += p.vy;

    // Add slight turbulence
    p.vx += sin(frameCount * 0.02 + p.x * 0.01) * 0.05;
    p.vy += cos(frameCount * 0.015 + p.y * 0.01) * 0.03;

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
    }
  }
}

function drawFlowParticles() {
  noStroke();

  for (let p of flowParticles) {
    // Calcular velocidad real de la partícula
    let particleSpeed = sqrt(p.vx * p.vx + p.vy * p.vy);

    // Mapear velocidad a colores: azul=lento, rojo=rápido
    let speedRatio = map(particleSpeed, 0, windSpeed * 1.5, 0, 1);
    speedRatio = constrain(speedRatio, 0, 1);

    // Interpolar entre azul (velocidad baja) y rojo (velocidad alta)
    let r = map(speedRatio, 0, 1, 0, 255);    // Rojo aumenta con velocidad
    let g = map(speedRatio, 0, 1, 200, 0);    // Verde disminuye con velocidad
    let b = map(speedRatio, 0, 1, 255, 0);    // Azul disminuye con velocidad

    fill(r, g, b, 150);

    // Draw particle as small ellipse - REMOVED
    // ellipse(p.x, p.y, 3, 3);

    // Draw subtle trail with same color logic
    if (p.age > 10) {
      let trailLength = min(8, floor(p.age / 5));
      for (let i = 1; i <= trailLength; i++) {
        let trailX = p.x - p.vx * i * 0.5;
        let trailY = p.y - p.vy * i * 0.5;
        let alpha = map(i, 1, trailLength, 100, 20);

        fill(r, g, b, alpha);
        // ellipse(trailX, trailY, 2, 2); - REMOVED
      }
    }
  }
}

function drawWeather() {
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
        // Efecto de salpicadura al tocar el suelo - REMOVIDO
        // drop.splashTimer++;
        // if (drop.splashTimer < 5) {
        //   // Dibujar salpicadura
        //   stroke(200, 220, 255, 150 - drop.splashTimer * 30);
        //   strokeWeight(drop.thickness);
        //   let splashSize = 8 - drop.splashTimer;
        //   line(drop.x, height - 45, drop.x + random(-splashSize, splashSize), height - 45 - random(2, 6));
        //   line(drop.x, height - 45, drop.x + random(-splashSize, splashSize), height - 45 - random(2, 6));
        // } else {
          rainDrops.splice(i, 1);
          continue;
        // }
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

    // Efecto de nieve acumulada en el suelo - REMOVIDO
    // if (frameCount % 60 === 0 && snowFlakes.length > 10) {
    //   fill(255, 255, 255, 30);
    //   noStroke();
    //   rect(0, height - 20, width, 20);
    // }

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

  }

  // Draw educational diagrams (overlaid on wing)
  drawPressureDiagram();
  drawVelocityDiagram();
  drawForceDiagram();
  
  drawEducationalLegends();

}

// API Integration Functions
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

// Accessibility functions
function updateFontScale() {
  let fontScaleInput = document.getElementById('font-scale');
  let fontScaleValue = document.getElementById('font-scale-value');
  if (fontScaleInput) {
    fontScale = parseFloat(fontScaleInput.value);
    canvasFontScale = fontScale; // Update canvas font scale
    if (fontScaleValue) {
      fontScaleValue.textContent = Math.round(fontScale * 100) + '%';
    }
  }
}

// Educational feature toggle functions
function toggleEducationalLegends() {
  hapticFeedback('light');
  showEducationalLegends = !showEducationalLegends;
  console.log('Educational legends:', showEducationalLegends ? 'enabled' : 'disabled');
}

function togglePressureDiagram() {
  hapticFeedback('light');
  showPressureDiagram = !showPressureDiagram;
  console.log('Pressure diagram:', showPressureDiagram ? 'enabled' : 'disabled');
}

function toggleVelocityDiagram() {
  hapticFeedback('light');
  showVelocityDiagram = !showVelocityDiagram;
  console.log('Velocity diagram:', showVelocityDiagram ? 'enabled' : 'disabled');
}

function toggleForceDiagram() {
  hapticFeedback('light');
  showForceDiagram = !showForceDiagram;
  console.log('Force diagram:', showForceDiagram ? 'enabled' : 'disabled');
}

// Educational diagram drawing functions
function drawPressureDiagram() {
  if (!showPressureDiagram) return;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 900;
  const mobileScale = isMobile ? 0.8 : 1.0; // Reduce scale on mobile
  const mobileStrokeWeight = isMobile ? 2 : 3; // Thinner strokes on mobile

  push();
  translate(width / 2, height / 2);
  scale(1.4 * mobileScale);

  // Draw pressure distribution overlay
  stroke(255, 100, 100, 220);
  strokeWeight(mobileStrokeWeight);
  noFill();

  // Upper surface pressure (suction)
  beginShape();
  for (let x = -180; x <= 200; x += 10) {
    let pressure = -0.5 * sin(PI * (x + 180) / 380); // Simplified pressure distribution
    let y = pressure * 50 - 20; // Scale and offset
    vertex(x, y);
  }
  endShape();

  // Lower surface pressure (positive)
  stroke(100, 100, 255, 220);
  beginShape();
  for (let x = -180; x <= 200; x += 10) {
    let pressure = 0.3 * sin(PI * (x + 180) / 380);
    let y = pressure * 50 + 20;
    vertex(x, y);
  }
  endShape();

  // Pressure arrows
  stroke(255, 100, 100, 200);
  strokeWeight(2);
  for (let x = -150; x <= 150; x += 50) {
    let pressure = -0.5 * sin(PI * (x + 180) / 380);
    let y = pressure * 50 - 20;
    let arrowLength = Math.abs(pressure) * 30;
    line(x, y, x, y - arrowLength);
    // Arrow head
    line(x, y - arrowLength, x - 3, y - arrowLength + 5);
    line(x, y - arrowLength, x + 3, y - arrowLength + 5);
  }

  // Lower surface arrows
  stroke(100, 100, 255, 200);
  for (let x = -150; x <= 150; x += 50) {
    let pressure = 0.3 * sin(PI * (x + 180) / 380);
    let y = pressure * 50 + 20;
    let arrowLength = Math.abs(pressure) * 30;
    line(x, y, x, y + arrowLength);
    // Arrow head
    line(x, y + arrowLength, x - 3, y + arrowLength - 5);
    line(x, y + arrowLength, x + 3, y + arrowLength - 5);
  }
}

function drawVelocityDiagram() {
  if (!showVelocityDiagram) return;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 900;
  const mobileScale = isMobile ? 0.8 : 1.0;
  const mobileStrokeWeight = isMobile ? 2 : 3;

  push();
  translate(width / 2, height / 2);
  scale(1.4 * mobileScale);

  // Draw velocity vectors
  stroke(100, 255, 100, 220);
  strokeWeight(mobileStrokeWeight);

  // Streamlines around the wing
  for (let y = -60; y <= 60; y += 20) {
    beginShape();
    for (let x = -200; x <= 250; x += 10) {
      // Simplified velocity field around airfoil
      let vx = windSpeed * (1 + 0.2 * sin(PI * (x + 200) / 450));
      let vy = 0;
      if (x > -180 && x < 200 && Math.abs(y) < 50) {
        vy = -0.1 * y * sin(PI * (x + 180) / 380);
      }
      vertex(x, y + vy * 10);
    }
    endShape();
  }

  // Velocity arrows at key points
  stroke(100, 255, 100, 200);
  strokeWeight(2);
  for (let x = -150; x <= 150; x += 60) {
    for (let y = -40; y <= 40; y += 40) {
      let vx = windSpeed * (1 + 0.2 * sin(PI * (x + 180) / 380));
      let vy = 0;
      if (Math.abs(y) < 50) {
        vy = -0.1 * y * sin(PI * (x + 180) / 380);
      }
      let speed = sqrt(vx*vx + vy*vy);
      let scale = speed / windSpeed;
      line(x, y, x + vx * 0.1, y + vy * 0.1);
      // Arrow head
      let angle = atan2(vy, vx);
      let arrowX = x + vx * 0.1;
      let arrowY = y + vy * 0.1;
      line(arrowX, arrowY, arrowX - 5 * cos(angle - PI/6), arrowY - 5 * sin(angle - PI/6));
      line(arrowX, arrowY, arrowX - 5 * cos(angle + PI/6), arrowY - 5 * sin(angle + PI/6));
    }
  }

  pop();
}

function drawForceDiagram() {
  if (!showForceDiagram) return;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 900;
  const mobileScale = isMobile ? 0.8 : 1.0;
  const mobileStrokeWeight = isMobile ? 3 : 4;

  push();
  translate(width / 2, height / 2);
  scale(1.4 * mobileScale);

  // Calculate forces
  let lift = 0.5 * rho * windSpeed * windSpeed * wingArea * cl;
  let drag = 0.5 * rho * windSpeed * windSpeed * wingArea * cd;
  let weight = mass * 9.81;

  // Draw force vectors
  let centerX = 0;
  let centerY = 0;

  // Lift force (upward)
  stroke(0, 255, 0, 200);
  strokeWeight(mobileStrokeWeight);
  let liftScale = lift / 1000; // Scale for visualization
  line(centerX, centerY, centerX, centerY - liftScale * 50);
  // Arrow head
  fill(0, 255, 0, 200);
  noStroke();
  triangle(centerX, centerY - liftScale * 50, centerX - 5, centerY - liftScale * 50 + 10, centerX + 5, centerY - liftScale * 50 + 10);

  // Drag force (backward)
  stroke(255, 0, 0, 200);
  strokeWeight(4);
  let dragScale = drag / 1000;
  line(centerX, centerY, centerX - dragScale * 50, centerY);
  fill(255, 0, 0, 200);
  noStroke();
  triangle(centerX - dragScale * 50, centerY, centerX - dragScale * 50 + 10, centerY - 5, centerX - dragScale * 50 + 10, centerY + 5);

  // Weight force (downward)
  stroke(255, 255, 0, 200);
  strokeWeight(4);
  let weightScale = weight / 1000;
  line(centerX, centerY, centerX, centerY + weightScale * 50);
  fill(255, 255, 0, 200);
  noStroke();
  triangle(centerX, centerY + weightScale * 50, centerX - 5, centerY + weightScale * 50 - 10, centerX + 5, centerY + weightScale * 50 - 10);

  pop();
}

function drawEducationalLegends() {
  if (!showEducationalLegends) return;

  // Draw legend box
  fill(0, 0, 0, 150);
  stroke(255, 255, 255, 200);
  strokeWeight(2);
  rect(20, 20, 300, 200, 10);

  // Legend title
  fill(255);
  noStroke();
  textSize(16 * canvasFontScale);
  textAlign(LEFT);
  text('Leyendas Educativas', 30, 45);

  // Legend items
  textSize(12 * canvasFontScale);
  let yPos = 70;

  // Angle of attack
  fill(255, 255, 0);
  text('Ángulo de Ataque: ' + degrees(angleAttack).toFixed(1) + '°', 30, yPos);
  yPos += 20;

  // Wind speed
  fill(100, 255, 100);
  text('Velocidad del Viento: ' + windSpeed.toFixed(1) + ' m/s', 30, yPos);
  yPos += 20;

  // Altitude
  fill(100, 100, 255);
  text('Altitud: ' + altitude.toFixed(0) + ' m', 30, yPos);
  yPos += 20;

  // Lift coefficient
  fill(255, 100, 100);
  text('Coeficiente de Sustentación: ' + cl.toFixed(3), 30, yPos);
  yPos += 20;

  // Drag coefficient
  fill(255, 150, 100);
  text('Coeficiente de Resistencia: ' + cd.toFixed(3), 30, yPos);
  yPos += 20;

  // Forces
  fill(0, 255, 0);
  text('Sustentación: ' + (0.5 * rho * windSpeed * windSpeed * wingArea * cl).toFixed(0) + ' N', 30, yPos);
  yPos += 20;

  fill(255, 0, 0);
  text('Resistencia: ' + (0.5 * rho * windSpeed * windSpeed * wingArea * cd).toFixed(0) + ' N', 30, yPos);
  yPos += 20;

  fill(255, 255, 0);
  text('Peso: ' + (mass * 9.81).toFixed(0) + ' N', 30, yPos);

  // Close zoom transformation if applied
  if (isPinching || currentScale !== 1.0) {
    pop();
  }
}

function windowResized() {
  resizeCanvasForPanel();
}

// Test function for reduced motion mode (call from browser console)
