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
