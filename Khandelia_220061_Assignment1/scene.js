var stack = [];
var model = mat4.create();
var drawMode;
var animation;
var animate;

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 2.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;

function shaderSetup(gl, shaderCode, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, shaderCode);
  gl.compileShader(shader);
  return shader;
}

function initShaders(gl) {
  shaderProgram = gl.createProgram();

  var vertexShader = shaderSetup(gl, vertexShaderCode, gl.VERTEX_SHADER);
  var fragmentShader = shaderSetup(gl, fragShaderCode, gl.FRAGMENT_SHADER);

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  gl.useProgram(shaderProgram);

  shaderProgram._uMLoc = gl.getUniformLocation(shaderProgram, "uM");
  const m4 = window.mat4; const I = m4.create(); m4.identity(I);
  gl.uniformMatrix4fv(shaderProgram._uMLoc, false, I);
  return shaderProgram;
}

function pushMatrix(stack, m) {
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function normalisedColor(value)
{
  return (value / 255);
}

function drawTriangle(gl, shaderProgram, R, G, B, x1=0, y1=0.5, x2=-0.5, y2=-0.5, x3=0.5, y3=-0.5) 
{
  const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

  const bufData = new Float32Array([x1, y1, x2, y2, x3, y3]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, bufData, gl.STATIC_DRAW);
  gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPositionLocation);

  const aColorLocation = gl.getUniformLocation(shaderProgram, "color");

  gl.uniform4f(aColorLocation, R, G, B, 1.0);
  gl.drawArrays(drawMode, 0, 3);
}

function drawCircle(gl, shaderProgram, R, G, B, cx = 0, cy = 0, r = 1) {

  const aPosition = gl.getAttribLocation(shaderProgram, "aPosition");
  const buf = gl.createBuffer();
  const N = 50;

  for (let i = 0; i < N; i++) {
    const t1 = (i / N) * Math.PI * 2;
    const t2 = ((i + 1) / N) * Math.PI * 2;

    const x1 = cx + r * Math.cos(t1);
    const y1 = cy + r * Math.sin(t1);
    const x2 = cx + r * Math.cos(t2);
    const y2 = cy + r * Math.sin(t2);

    drawTriangle(gl, shaderProgram, R, G, B, cx, cy, x1, y1, x2, y2);
  }
}

function drawSquare(gl, shaderProgram, R, G, B, x=0, y=0, size=1) 
{
  const halfSize = size / 2;

  drawTriangle(gl, shaderProgram,
    R, G, B,
    x - halfSize, y - halfSize,
    x + halfSize, y - halfSize,
    x + halfSize, y + halfSize,
  );

  drawTriangle(gl, shaderProgram,
    R, G, B,
    x - halfSize, y - halfSize,
    x + halfSize, y + halfSize,
    x - halfSize, y + halfSize,
  );
}

function drawWindmill(gl, uM, stack, model, spinRad)
{
  pushMatrix(stack, model);
  model = mat4.translate(model, [0.48, -0.17, 0]);
  model = mat4.scale(model, [0.025, 0.38, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(45), normalisedColor(45), normalisedColor(45));
  model = popMatrix(stack);

  pushMatrix(stack, model);
  model = mat4.translate(model, [0.48, 0.0, 0]);
  model = mat4.rotate(model, spinRad, [0, 0, 1]);    
  model = mat4.translate(model, [-0.48, 0.0, 0]);

  // blade 1
  pushMatrix(stack, model);
  model = mat4.translate(model, [0.56, -0.05, 0]);
  model = mat4.rotate(model, degToRad(60), [0, 0, 1]);
  model = mat4.scale(model, [0.06, 0.2, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(180), normalisedColor(180), normalisedColor(0));
  model = popMatrix(stack);

  // blade 2
  pushMatrix(stack, model);
  model = mat4.translate(model, [0.53, 0.07, 0]);
  model = mat4.rotate(model, degToRad(150), [0, 0, 1]);
  model = mat4.scale(model, [0.06, 0.2, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(180), normalisedColor(180), normalisedColor(0));
  model = popMatrix(stack);

  // blade 3
  pushMatrix(stack, model);
  model = mat4.translate(model, [0.4, 0.045, 0]);
  model = mat4.rotate(model, degToRad(240), [0, 0, 1]);
  model = mat4.scale(model, [0.06, 0.2, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(180), normalisedColor(180), normalisedColor(0));
  model = popMatrix(stack);

  // blade 4
  pushMatrix(stack, model);
  model = mat4.translate(model, [0.43, -0.07, 0]);
  model = mat4.rotate(model, degToRad(330), [0, 0, 1]);
  model = mat4.scale(model, [0.06, 0.2, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(180), normalisedColor(180), normalisedColor(0));
  model = popMatrix(stack);
  model = popMatrix(stack);

  pushMatrix(stack, model);
  model = mat4.translate(model, [0.48, 0, 0]);
  model = mat4.scale(model, [0.025, 0.025, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, normalisedColor(0), normalisedColor(0), normalisedColor(0));
  model = popMatrix(stack);

  return model;
}

function drawBoat(gl, uM, stack, model, flagR, flagG, flagB) {
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.12, -0.03, 0]);
  model = mat4.scale(model, [0.013, 0.24, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(0), normalisedColor(0), normalisedColor(0));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.17, -0.032, 0]);
  model = mat4.rotate(model, degToRad(-25), [0, 0, 1]);
  model = mat4.scale(model, [0.005, 0.24, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(0), normalisedColor(0), normalisedColor(0));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.013, -0.02, 0]);
  model = mat4.rotate(model, degToRad(-90), [0, 0, 1]);
  model = mat4.scale(model, [0.2,0.2,1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(flagR), normalisedColor(flagG), normalisedColor(flagB));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.21,-0.17, 0]);
  model = mat4.rotate(model, degToRad(-180), [0, 0, 1]);
  model = mat4.scale(model, [0.06, 0.05, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(200), normalisedColor(200), normalisedColor(200));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.02,-0.17, 0]);
  model = mat4.rotate(model, degToRad(-180), [0, 0, 1]);
  model = mat4.scale(model, [0.06, 0.05, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(200), normalisedColor(200), normalisedColor(200));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.115,-0.17, 0]);
  model = mat4.scale(model, [0.185, 0.05, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(200), normalisedColor(200), normalisedColor(200));
  model = popMatrix(stack, model);

  return model;
}

function drawCloud(gl, uM, stack, model, R, G, B) {
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.85, 0.5, 0]);
  model = mat4.scale(model, [0.2, 0.12, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, R, G, B, 0);
  model = popMatrix(stack, model);
  return model
}

function drawMountains(gl, uM, stack, model, darkSide = true)
{
  if (darkSide)
  {
    pushMatrix(stack, model);
    model = mat4.translate(model, [-0.7, 0, 0]);
    model = mat4.scale(model, [1.2, 0.4, 1]);
    gl.uniformMatrix4fv(uM, false, model);
    drawTriangle(gl, shaderProgram, normalisedColor(140), normalisedColor(90), normalisedColor(60));
    model = popMatrix(stack, model);
  }

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.66, 0.01, 0]);
  model = mat4.rotate(model, degToRad(10), [0, 0, 1]);
  model = mat4.scale(model, [1.2, 0.4, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(150), normalisedColor(120), normalisedColor(82));
  model = popMatrix(stack, model);

  return model;
}

function drawHouse(gl, uM, stack, model)
{
  // house
  // roof
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.7, -0.3, 0]);
  model = mat4.scale(model, [0.3, 0.2, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(255), normalisedColor(77), normalisedColor(0));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.3, -0.3, 0]);
  model = mat4.scale(model, [0.3, 0.2, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(255), normalisedColor(77), normalisedColor(0));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.5, -0.3, 0]);
  model = mat4.scale(model, [0.4, 0.2, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(255), normalisedColor(77), normalisedColor(0));
  model = popMatrix(stack, model);

  // body
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.5, -0.51, 0]);
  model = mat4.scale(model, [0.55, 0.22, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(229), normalisedColor(229), normalisedColor(229));
  model = popMatrix(stack, model);

  // door
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.5, -0.54, 0]);
  model = mat4.scale(model, [0.08, 0.15, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(229), normalisedColor(178), normalisedColor(0));
  model = popMatrix(stack, model);

  // windows
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.35, -0.47, 0]);
  model = mat4.scale(model, [0.07, 0.07, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(229), normalisedColor(178), normalisedColor(0));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.65, -0.47, 0]);
  model = mat4.scale(model, [0.07, 0.07, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(229), normalisedColor(178), normalisedColor(0));
  model = popMatrix(stack, model);
  return model;
}

function drawCar(gl, uM, stack, model)
{
  // car
  // roof
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.4, -0.72, 0]);
  model = mat4.scale(model, [0.17, 0.1, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, normalisedColor(0), normalisedColor(0), normalisedColor(255));
  model = popMatrix(stack, model);

  // window
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.4, -0.71, 0]);
  model = mat4.scale(model, [0.2, 0.06, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(204), normalisedColor(204), normalisedColor(255));
  model = popMatrix(stack, model);

  //wheels
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.54, -0.88, 0]);
  model = mat4.scale(model, [0.05, 0.05, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, normalisedColor(0), normalisedColor(0), normalisedColor(0));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.25, -0.88, 0]);
  model = mat4.scale(model, [0.05, 0.05, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, normalisedColor(0), normalisedColor(0), normalisedColor(0));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.54, -0.88, 0]);
  model = mat4.scale(model, [0.04, 0.04, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, normalisedColor(150), normalisedColor(150), normalisedColor(150));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.25, -0.88, 0]);
  model = mat4.scale(model, [0.04, 0.04, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, normalisedColor(150), normalisedColor(150), normalisedColor(150));
  model = popMatrix(stack, model);

  // body
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.6, -0.8, 0]);
  model = mat4.scale(model, [0.2, 0.12, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(0), normalisedColor(128), normalisedColor(229));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.2, -0.8, 0]);
  model = mat4.scale(model, [0.2, 0.12, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(0), normalisedColor(128), normalisedColor(229));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.4, -0.8, 0]);
  model = mat4.scale(model, [0.4, 0.12, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(0), normalisedColor(128), normalisedColor(229));
  model = popMatrix(stack, model);

  return model;
}

function drawTree(gl, uM, stack, model)
{
  pushMatrix(stack, model);
  model = mat4.translate(model, [0.82, 0.09, 0]);
  model = mat4.scale(model, [0.045, 0.23, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawSquare(gl, shaderProgram, normalisedColor(130), normalisedColor(80), normalisedColor(80));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [0.82, 0.35, 0]);
  model = mat4.scale(model, [0.35, 0.3, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(0), normalisedColor(150), normalisedColor(75));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [0.82, 0.39 , 0]);
  model = mat4.scale(model, [0.39, 0.3, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(80), normalisedColor(180), normalisedColor(78));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [0.82, 0.435, 0]);
  model = mat4.scale(model, [0.45, 0.3, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, normalisedColor(100), normalisedColor(200), normalisedColor(77));
  model = popMatrix(stack, model);
  return model;
}

function drawBush(gl, uM, stack, model, R, G, B)
{
  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.95, -0.55, 0]);
  model = mat4.scale(model, [0.08, 0.05, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, normalisedColor(R), normalisedColor(180), normalisedColor(B));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.70, -0.55, 0]);
  model = mat4.scale(model, [0.07, 0.05, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, normalisedColor(0), normalisedColor(100), normalisedColor(0));
  model = popMatrix(stack, model);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-0.82, -0.53, 0]);
  model = mat4.scale(model, [0.11, 0.07, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, normalisedColor(0), normalisedColor(150), normalisedColor(0));
  model = popMatrix(stack, model);

  return model;
}

function changeMode(mode) 
{
  var canvas = document.getElementById("myCanvas");
    var gl = canvas.getContext("webgl2");
   if (mode === 'point') 
   {
       drawMode = gl.POINTS;
   } 
   else if (mode === 'line') 
   {
       drawMode = gl.LINE_LOOP;
   } 
   else if (mode === 'solid') 
   {
       drawMode = gl.TRIANGLES;
   }
}

function drawStar(gl, uM, stack, model) 
{
  const armSx = 0.02, armSy = 0.07;
  const d = 0.03; 

  pushMatrix(stack, model);
  model = mat4.translate(model, [0,  d, 0]);
  model = mat4.scale(model, [armSx, armSy, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, 1, 1, 1);
  model = popMatrix(stack);

  pushMatrix(stack, model);
  model = mat4.translate(model, [-d, 0, 0]);
  model = mat4.rotate(model, degToRad(90), [0, 0, 1]);
  model = mat4.scale(model, [armSx, armSy, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, 1, 1, 1);
  model = popMatrix(stack);

  pushMatrix(stack, model);
  model = mat4.translate(model, [ d, 0, 0]);
  model = mat4.rotate(model, degToRad(-90), [0, 0, 1]);
  model = mat4.scale(model, [armSx, armSy, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, 1, 1, 1);
  model = popMatrix(stack);

  pushMatrix(stack, model);
  model = mat4.translate(model, [0, -d, 0]);
  model = mat4.rotate(model, degToRad(180), [0, 0, 1]);
  model = mat4.scale(model, [armSx, armSy, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawTriangle(gl, shaderProgram, 1, 1, 1);
  model = popMatrix(stack);

  return model;
}

function drawMoon(gl, uM, stack, model, angleRad = 0) 
{
  const cx = -0.7, cy = 0.8; 
  const moonR = 0.12;
  const rayLen = 0.05;
  const rayThk = 0.005;

  pushMatrix(stack, model);
  model = mat4.translate(model, [cx, cy, 0]);

  pushMatrix(stack, model);
  model = mat4.rotate(model, angleRad, [0, 0, 1]);

  for (let i = 0; i < 8; i++) 
  {
    pushMatrix(stack, model);
    model = mat4.rotate(model, degToRad(i * 45), [0, 0, 1]);
    const offset = moonR + rayLen / 2;
    model = mat4.translate(model, [0, offset, 0]);
    model = mat4.scale(model, [rayThk, rayLen, 1]);
    gl.uniformMatrix4fv(uM, false, model);
    drawSquare(gl, shaderProgram, 1, 1, 1);
    model = popMatrix(stack);
  }
  model = popMatrix(stack); 

  pushMatrix(stack, model);
  model = mat4.scale(model, [moonR, moonR, 1]);
  gl.uniformMatrix4fv(uM, false, model);
  drawCircle(gl, shaderProgram, 1, 1, 1);
  model = popMatrix(stack);

  model = popMatrix(stack);
  return model;
}

function initCanvas() 
{
    var canvas = document.getElementById("myCanvas");
    var gl = canvas.getContext("webgl2");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    drawMode = gl.TRIANGLES;

    shaderProgram = initShaders(gl);
    
    const uM = gl.getUniformLocation(shaderProgram, "uMMatrix");
    if (uM) 
    {
      gl.uniformMatrix4fv(uM, false, model);
    }

    if(animation)
    {
      window.cancelAnimationFrame(animation);
    }

    var boatspeed1 = -0.003;
    var boatposition1 = -0.05;

    var boatspeed2 = -0.003;
    var boatposition2 = 0;

    var tStar = 0;

    var moonAngle = 0;
    var moonSpeed = degToRad(1.1); 

    var bladeAngle = 0;                     
    var bladeSpeed = degToRad(2.3); 

    var animate = function ()
    {

      if(boatposition1 >= 0.95 || boatposition1 <= -0.85)
      {
        boatspeed1 = -boatspeed1;
      }
      boatposition1 += boatspeed1;

      if(boatposition2 >= 0.9 || boatposition2 <= -0.75)
      {
        boatspeed2 = -boatspeed2;
      }
      boatposition2 += boatspeed2;

      mat4.identity(model);
      pushMatrix(stack, model);

      // sky
      pushMatrix(stack, model);
      model = mat4.translate(model, [0, 0.5, 0]);
      model = mat4.scale(model, [2, 1, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      drawSquare(gl, shaderProgram, normalisedColor(0), normalisedColor(0), normalisedColor(0));
      model = popMatrix(stack);

      pushMatrix(stack, model);
      gl.uniformMatrix4fv(uM, false, model);

      // star
      tStar += 0.05; 
      var s = 0.40 + 0.1 * Math.sin(tStar); 

      pushMatrix(stack, model);
      model = mat4.translate(model, [0.4, 0.9, 0]); 
      model = mat4.scale(model, [s, s, 1]);          
      gl.uniformMatrix4fv(uM, false, model);
      model = drawStar(gl, uM, stack, model);
      model = popMatrix(stack);

      var m = 0.7 + 0.1 * Math.sin(tStar);

      pushMatrix(stack, model);
      model = mat4.translate(model, [0.3, 0.75, 0]);
      model = mat4.scale(model, [m, m, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawStar(gl, uM, stack, model);
      model = popMatrix(stack); 

      var n = 0.5 + 0.1 * Math.sin(tStar);

      pushMatrix(stack, model);
      model = mat4.translate(model, [-0.2, 0.7, 0]);
      model = mat4.scale(model, [n, n, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawStar(gl, uM, stack, model);
      model = popMatrix(stack);

      pushMatrix(stack, model);
      model = mat4.translate(model, [-0.08, 0.6, 0]);
      model = mat4.scale(model, [n, n, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawStar(gl, uM, stack, model);
      model = popMatrix(stack);

      var p = 0.3 + 0.1 * Math.sin(tStar);

      pushMatrix(stack, model);
      model = mat4.translate(model, [-0.17, 0.5, 0]);
      model = mat4.scale(model, [p, p, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawStar(gl, uM, stack, model);
      model = popMatrix(stack);

      model = popMatrix(stack);

      // moon
      moonAngle = (moonAngle + moonSpeed) % (Math.PI * 2);
      model = drawMoon(gl, uM, stack, model, moonAngle);

      // clouds
      model = drawCloud(gl, uM, stack, model, 0.7, 0.7, 0.7);

      pushMatrix(stack, model);
      model = mat4.translate(model, [0.05, 0.07, 0]);
      model = mat4.scale(model, [0.8, 0.8, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawCloud(gl, uM, stack, model, 1, 1, 1);
      model = popMatrix(stack, model);

      pushMatrix(stack, model);
      model = mat4.translate(model, [-0.02, 0.22, 0]);
      model = mat4.scale(model, [0.5, 0.5, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawCloud(gl, uM, stack, model, 0.7, 0.7, 0.7);
      model = popMatrix(stack);

      // mountains
      model = drawMountains(gl, uM, stack, model);

      pushMatrix(stack, model);
      model = mat4.translate(model, [1.5, 0, 0]);
      model = mat4.scale(model, [1, 0.8, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawMountains(gl, uM, stack, model, false);
      model = popMatrix(stack);

      pushMatrix(stack, model);
      model = mat4.translate(model, [1, 0, 0]);
      model = mat4.scale(model, [1.5, 1.5, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawMountains(gl, uM, stack, model);
      model = popMatrix(stack);
      

      // ground
      pushMatrix(stack, model);
      model = mat4.translate(model, [0, -0.55, 0]);
      model = mat4.scale(model, [2, 1.06, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      drawSquare(gl, shaderProgram, normalisedColor(0), normalisedColor(229), normalisedColor(128));
      model = popMatrix(stack, model);

      // trees
      model = drawTree(gl, uM,stack, model);

      pushMatrix(stack, model);
      model = mat4.translate(model, [-0.45, 0, 0]);
      model = mat4.scale(model, [1.2, 1.2, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawTree(gl, uM,stack, model);
      model = popMatrix(stack, model);

      pushMatrix(stack, model);
      model = mat4.translate(model, [-0.54, 0, 0]);
      model = mat4.scale(model, [0.9, 0.9, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawTree(gl, uM,stack, model);
      model = popMatrix(stack, model);

      // road
      pushMatrix(stack, model);
      model = mat4.translate(model, [0.45, -0.7, 0]);
      model = mat4.rotate(model, degToRad(50),[0,0,1]);
      model = mat4.scale(model, [1.6, 1.5, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      drawTriangle(gl, shaderProgram, normalisedColor(100), normalisedColor(160), normalisedColor(50));
      model = popMatrix(stack, model);

      // river
      pushMatrix(stack, model);
      model = mat4.translate(model, [0, -0.15, 0]);
      model = mat4.scale(model, [2, 0.2, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      drawSquare(gl, shaderProgram, normalisedColor(0), normalisedColor(102), normalisedColor(255));
      model = popMatrix(stack, model);

      // small boat
      pushMatrix(stack, model);
      model = mat4.translate(model, [boatposition1, 0.0, 0]);
      model = mat4.scale(model,[0.6,0.6, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawBoat(gl, uM, stack, model, 115, 40, 166);
      model = popMatrix(stack, model);

      // waves
      pushMatrix(stack, model);
      model = mat4.translate(model, [-0.6, -0.15, 0]);
      model = mat4.scale(model, [0.4, 0.002, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      drawSquare(gl, shaderProgram, normalisedColor(220), normalisedColor(220), normalisedColor(220));
      model = popMatrix(stack, model);

      pushMatrix(stack, model);
      model = mat4.translate(model, [0.05, -0.12, 0]);
      model = mat4.scale(model, [0.4, 0.002, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      drawSquare(gl, shaderProgram, normalisedColor(220), normalisedColor(220), normalisedColor(220));
      model = popMatrix(stack, model);

      // large boat
      pushMatrix(stack, model);
      model = mat4.translate(model, [boatposition2, 0.015, 0]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawBoat(gl, uM, stack, model, 255, 0, 0);
      model = popMatrix(stack, model);

      // wave
      pushMatrix(stack, model);
      model = mat4.translate(model, [0.6, -0.2, 0]);
      model = mat4.scale(model, [0.4, 0.002, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      drawSquare(gl, shaderProgram, normalisedColor(220), normalisedColor(220), normalisedColor(220));
      model = popMatrix(stack, model);


      // bushes
      model = drawBush(gl, uM, stack, model, 0, 178, 0);

      pushMatrix(stack, model);
      model = mat4.translate(model, [0.78, 0.05, 0]);
      model = mat4.scale(model, [1.1, 1.1, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawBush(gl, uM, stack, model, 0, 153, 76);
      model = popMatrix(stack, model);

      // house
      model = drawHouse(gl, uM, stack, model);

      pushMatrix(stack, model);
      model = mat4.translate(model, [1.4, -0.15, 0]);
      model = mat4.scale(model, [1.6, 1.6, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawBush(gl, uM, stack, model, 0, 102, 0);
      model = popMatrix(stack, model);

      // car
      model = drawCar(gl, uM, stack, model);
      

      // windmills 
      bladeAngle = (bladeAngle - bladeSpeed) % (Math.PI * 2);
      // windmill 1
      pushMatrix(stack, model);
      model = mat4.translate(model, [0.08, 0.02, 0]);
      model = mat4.scale(model, [0.9, 0.9, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawWindmill(gl, uM, stack, model, bladeAngle);   // <-- pass angle
      model = popMatrix(stack);

      // windmill 2
      pushMatrix(stack, model);
      model = mat4.translate(model, [0.11, -0.02, 0]);
      model = mat4.scale(model, [1.3, 1.3, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawWindmill(gl, uM, stack, model, bladeAngle);   // <-- pass angle
      model = popMatrix(stack);

      pushMatrix(stack, model);
      model = mat4.translate(model, [1.95, 0.15, 0]);
      model = mat4.scale(model, [1.1, 1.1, 1]);
      gl.uniformMatrix4fv(uM, false, model);
      model = drawBush(gl, uM, stack, model, 0, 102, 0);
      model = popMatrix(stack, model);

      animation = window.requestAnimationFrame(animate);

    }

    animate();


}
