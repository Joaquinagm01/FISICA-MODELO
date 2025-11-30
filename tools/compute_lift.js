// Script de comprobación de cálculos aerodinámicos
// Ejecutar con: node tools/compute_lift.js

function calculateLiftCoefficient(angleOfAttack) {
  const CL0 = 0.2;
  const CL_alpha = 5.7; // por radian
  const alpha_rad = angleOfAttack * Math.PI / 180;
  return CL0 + CL_alpha * alpha_rad;
}

function calculateDragCoefficientFromCL(CL) {
  const CD0 = 0.02;
  const k = 0.05;
  return CD0 + k * CL * CL;
}

function calculateAirDensity(altitude) {
  const AIR_DENSITY_SEA_LEVEL = 1.225;
  const scaleHeight = 8500;
  return AIR_DENSITY_SEA_LEVEL * Math.exp(-altitude / scaleHeight);
}

function calculateLift(velocity_ms, angleOfAttack, altitude, wingArea) {
  const CL = calculateLiftCoefficient(angleOfAttack);
  const rho = calculateAirDensity(altitude);
  const V = velocity_ms;
  return {
    lift: 0.5 * rho * V * V * wingArea * CL,
    CL,
    rho
  };
}

function calculateDrag(velocity_ms, angleOfAttack, altitude, wingArea) {
  const CL = calculateLiftCoefficient(angleOfAttack);
  const rho = calculateAirDensity(altitude);
  const V = velocity_ms;
  const CD = calculateDragCoefficientFromCL(CL);
  return {
    drag: 0.5 * rho * V * V * wingArea * CD,
    CD,
    rho
  };
}

function calculateWeight(mass) {
  const GRAVITY = 9.81;
  return mass * GRAVITY;
}

// Valores provistos por el usuario
const inputs = {
  velocity_ms: 8.3,
  angleOfAttack: 5,
  altitude: 500,
  mass: 1338,
  wingArea: 16.2
};

const liftRes = calculateLift(inputs.velocity_ms, inputs.angleOfAttack, inputs.altitude, inputs.wingArea);
const dragRes = calculateDrag(inputs.velocity_ms, inputs.angleOfAttack, inputs.altitude, inputs.wingArea);
const weight = calculateWeight(inputs.mass);

console.log('Inputs:');
console.log(inputs);
console.log('\nResultados:');
console.log('rho (kg/m^3):', liftRes.rho.toFixed(4));
console.log('CL:', liftRes.CL.toFixed(4));
console.log('Lift (N):', liftRes.lift.toFixed(1));
console.log('Drag (N):', dragRes.drag.toFixed(1));
console.log('CD:', dragRes.CD.toFixed(4));
console.log('Weight (N):', weight.toFixed(1));
console.log('Lift / Weight:', (liftRes.lift / weight).toFixed(3));

// Comparación con wingArea por defecto del archivo (36.3 m2) para referencia
const altLiftRes = calculateLift(inputs.velocity_ms, inputs.angleOfAttack, inputs.altitude, 36.3);
console.log('\nReferencia (wingArea=36.3 m^2): Lift =', altLiftRes.lift.toFixed(1), 'N');
