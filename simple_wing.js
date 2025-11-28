// Simple airplane wing simulation
let angleAttack = radians(5);
let windSpeed = 70;

function setup() {
  createCanvas(800, 600);
  background(135, 206, 250); // Sky blue
}

function draw() {
  background(135, 206, 250);

  // Draw clouds
  fill(255, 255, 255, 200);
  noStroke();
  ellipse(200, 100, 80, 50);
  ellipse(250, 110, 70, 45);
  ellipse(180, 120, 60, 35);

  // Draw wing
  push();
  translate(width/2, height/2);
  rotate(angleAttack * 0.3);

  // Wing airfoil shape
  fill(200, 200, 200);
  stroke(100, 100, 100);
  strokeWeight(2);

  beginShape();
  // Upper surface
  vertex(-150, 0);
  bezierVertex(-100, -30, -50, -50, 0, -55);
  bezierVertex(50, -55, 100, -50, 150, -30);
  // Lower surface
  bezierVertex(150, 10, 100, 20, 50, 25);
  bezierVertex(0, 25, -50, 20, -100, 10);
  bezierVertex(-130, 5, -150, 0, -150, 0);
  endShape(CLOSE);

  // Wing label
  fill(0);
  textAlign(CENTER);
  textSize(16);
  text('Ala NACA 2412', 0, 70);

  pop();

  // Draw air flow arrows
  stroke(0, 255, 0);
  strokeWeight(2);

  // Upper surface flow
  for (let i = 0; i < 5; i++) {
    let x = width/2 - 100 + i * 40;
    let y = height/2 - 40 - i * 5;
    line(x, y, x + 20, y);
    line(x + 15, y - 3, x + 20, y);
    line(x + 15, y + 3, x + 20, y);
  }

  // Lower surface flow
  stroke(255, 0, 0);
  for (let i = 0; i < 5; i++) {
    let x = width/2 - 100 + i * 40;
    let y = height/2 + 20 + i * 3;
    line(x, y, x + 20, y);
    line(x + 15, y - 3, x + 20, y);
    line(x + 15, y + 3, x + 20, y);
  }

  // UI
  fill(0);
  textAlign(LEFT);
  textSize(14);
  text(`Ángulo de ataque: ${degrees(angleAttack).toFixed(1)}°`, 20, 30);
  text(`Velocidad del viento: ${windSpeed} m/s`, 20, 50);
  text('Flechas verdes: Flujo superior (veloz)', 20, height - 60);
  text('Flechas rojas: Flujo inferior (lento)', 20, height - 40);
  text('Presiona las teclas ↑↓ para cambiar ángulo', 20, height - 20);
}

function keyPressed() {
  if (keyCode === UP_ARROW) {
    angleAttack += radians(1);
    if (angleAttack > radians(20)) angleAttack = radians(20);
  } else if (keyCode === DOWN_ARROW) {
    angleAttack -= radians(1);
    if (angleAttack < radians(-5)) angleAttack = radians(-5);
  }
}
