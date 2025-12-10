var gl;
var canvas;

var flatShaderProgram;
var gouradShaderProgram;
var phongShaderProgram;

var flatDic = {};
var gouradDic = {};
var phongDic = {};

var finalDic = {};

var buf;
var indexBuf;
var cubeNormalBuf;

var spBuf;
var spIndexBuf;
var spNormalBuf;
var spVerts = [];
var spIndicies = [];
var spNormals = [];

var aPositionLocation;
var aNormalLocation;

var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;

var vMatrix = mat4.create(); 
var mMatrix = mat4.create(); 
var pMatrix = mat4.create(); 

var ambientColorLocation;
var diffuseColorLocation;
var specularColorLocation;
var lightColorLocation;

var lightPositionLocation;
var eyePositionLocation;
var shininessLocation;

var degree0 = 0.0;
var degree1 = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

var eyePos = [0, 0, 2.5];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

var stack = [];

var lightXPosition = 1;
var eyePosZ = 2.5;

var activeViewport = -1;        
var viewportDegrees = [
  [0.0, 0.0], 
  [0.0, 0.0],
  [0.0, 0.0], 
];

function pushMatrix(m) {
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix() {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

const flatVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 positionViewSpace;
out mat4 viewMatrix;

void main()
{
  mat4 projectionModelView;
  projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition, 1.0);

  mat4 modelViewMatrix = uVMatrix*uMMatrix;
  positionViewSpace = vec3(modelViewMatrix * vec4(aPosition,1.0));
  viewMatrix = uVMatrix;

  gl_PointSize = 2.0;
}`;

const flatFragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

in vec3 positionViewSpace;
in mat4 viewMatrix;

uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform vec3 lightColor;

uniform vec3 lightPosition; 
uniform float shininess;

void main()
{
  vec3 normal = normalize(cross(dFdx(positionViewSpace), dFdy(positionViewSpace)));

  vec3 lightPositionViewSpace = vec3(viewMatrix * vec4(lightPosition,1.0));

  vec3 L = normalize(lightPositionViewSpace - positionViewSpace);
  vec3 R = normalize(-reflect(L, normal));
  vec3 V = normalize(-positionViewSpace);

  vec3 ambient = ambientColor;
  vec3 diffuse = max(dot(L, normal), 0.0) * diffuseColor;
  vec3 specular = pow(max(dot(R, V), 0.0), shininess) * specularColor;

  vec3 color = ambient + diffuse + specular;
  color = color * lightColor;
  
  fragColor = vec4(color, 1.0);
}`;

const gouradVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform vec3 lightColor;

uniform vec3 lightPosition; 
uniform float shininess;

out vec3 vColor;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition, 1.0);

  mat4 modelViewMatrix = uVMatrix*uMMatrix;
  mat3 normalMatrix = mat3(modelViewMatrix);
  normalMatrix = transpose(inverse(normalMatrix));
  vec3 normal = normalize(normalMatrix * aNormal);

  vec3 positionViewSpace = vec3(modelViewMatrix * vec4(aPosition,1.0));
  vec3 lightPositionViewSpace = vec3(uVMatrix * vec4(lightPosition,1.0));

  vec3 L = normalize(lightPositionViewSpace - positionViewSpace);
  vec3 R = normalize(-reflect(L, normal));
  vec3 V = normalize(-positionViewSpace);

  vec3 ambient = ambientColor;
  vec3 diffuse = max(dot(L, normal), 0.0) * diffuseColor;
  vec3 specular = pow(max(dot(R, V), 0.0), shininess) * specularColor;

  vColor = ambient + diffuse + specular;
  vColor = vColor * lightColor;

  gl_PointSize = 2.0;
}`;

const gouradFragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

in vec3 vColor;
void main() {
  fragColor = vec4(vColor, 1.0);
}`;

const phongVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 positionViewSpace;
out vec3 normalViewSpace;
out mat4 viewMatrix;

void main()
{
  mat4 projectionModelView;
  projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition, 1.0);
  
  mat4 modelViewMatrix = uVMatrix*uMMatrix;
  positionViewSpace = vec3(modelViewMatrix * vec4(aPosition,1.0));
  mat3 normalMatrix = mat3(modelViewMatrix);
  normalMatrix = transpose(inverse(normalMatrix));
  normalViewSpace = normalize(normalMatrix * aNormal);
  viewMatrix = uVMatrix;
  
  gl_PointSize = 2.0;
}`;

const phongFragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

in vec3 positionViewSpace;
in vec3 normalViewSpace;
in mat4 viewMatrix;

uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform vec3 lightColor;

uniform vec3 lightPosition; 
uniform float shininess;

void main()
{
  vec3 normal = normalize(normalViewSpace);
  
  vec3 lightPositionViewSpace = vec3(viewMatrix * vec4(lightPosition,1.0));
  
  vec3 L = normalize(lightPositionViewSpace - positionViewSpace);
  vec3 R = normalize(-reflect(L, normal));
  vec3 V = normalize(-positionViewSpace);
  
  vec3 ambient = ambientColor;
  vec3 diffuse = max(dot(L, normal), 0.0) * diffuseColor;
  vec3 specular = pow(max(dot(R, V), 0.0), shininess) * specularColor;
  vec3 color = ambient + diffuse + specular;
  color = color * lightColor;
  
  fragColor = vec4(color, 1.0);
}`;

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders() {

  flatShaderProgram = gl.createProgram();
  gouradShaderProgram = gl.createProgram();
  phongShaderProgram = gl.createProgram();

  var flatVertexShader = vertexShaderSetup(flatVertexShaderCode);
  var flatFragmentShader = fragmentShaderSetup(flatFragShaderCode);

  var gouradVertexShader = vertexShaderSetup(gouradVertexShaderCode);
  var gouradFragmentShader = fragmentShaderSetup(gouradFragShaderCode);

  var phongVertexShader = vertexShaderSetup(phongVertexShaderCode);
  var phongFragmentShader = fragmentShaderSetup(phongFragShaderCode);

  // attach the shaders
  gl.attachShader(flatShaderProgram, flatVertexShader);
  gl.attachShader(flatShaderProgram, flatFragmentShader);
  gl.linkProgram(flatShaderProgram);

  gl.attachShader(gouradShaderProgram, gouradVertexShader);
  gl.attachShader(gouradShaderProgram, gouradFragmentShader);
  gl.linkProgram(gouradShaderProgram);

  gl.attachShader(phongShaderProgram, phongVertexShader);
  gl.attachShader(phongShaderProgram, phongFragmentShader);
  gl.linkProgram(phongShaderProgram);

}

function initDics(shaderProgram) {
  return {
    aPositionLocation: gl.getAttribLocation(shaderProgram, "aPosition"),
    aNormalLocation: gl.getAttribLocation(shaderProgram, "aNormal"),

    uMMatrixLocation: gl.getUniformLocation(shaderProgram, "uMMatrix"),
    uVMatrixLocation: gl.getUniformLocation(shaderProgram, "uVMatrix"),
    uPMatrixLocation: gl.getUniformLocation(shaderProgram, "uPMatrix"),

    ambientColorLocation: gl.getUniformLocation(shaderProgram, "ambientColor"),
    diffuseColorLocation: gl.getUniformLocation(shaderProgram, "diffuseColor"),
    specularColorLocation: gl.getUniformLocation(shaderProgram, "specularColor"),
    lightColorLocation: gl.getUniformLocation(shaderProgram, "lightColor"),

    lightPositionLocation: gl.getUniformLocation(shaderProgram, "lightPosition"),
    eyePositionLocation: gl.getUniformLocation(shaderProgram, "eyePosition"),
    shininessLocation: gl.getUniformLocation(shaderProgram, "shininess"),
  }
}

function setShader(shaderProgram, dic) {
  gl.useProgram(shaderProgram);
  
  aPositionLocation = dic.aPositionLocation;
  aNormalLocation = dic.aNormalLocation;

  uMMatrixLocation = dic.uMMatrixLocation;
  uVMatrixLocation = dic.uVMatrixLocation;
  uPMatrixLocation = dic.uPMatrixLocation;
  
  ambientColorLocation = dic.ambientColorLocation;
  diffuseColorLocation = dic.diffuseColorLocation;
  specularColorLocation = dic.specularColorLocation;
  lightColorLocation = dic.lightColorLocation;

  lightPositionLocation = dic.lightPositionLocation;
  eyePositionLocation = dic.eyePositionLocation;
  shininessLocation = dic.shininessLocation;

  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    gl.viewportWidth = canvas.width; // the width of the canvas
    gl.viewportHeight = canvas.height; // the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function nc(c) {
  return c / 255.0;
}

function initSphere(nslices, nstacks, radius) {
  var theta1, theta2;

  for (i = 0; i < nslices; i++) {
    spVerts.push(0);
    spVerts.push(-radius);
    spVerts.push(0);

    spNormals.push(0);
    spNormals.push(-1.0);
    spNormals.push(0);
  }

  for (j = 1; j < nstacks - 1; j++) {
    theta1 = (j * 2 * Math.PI) / nslices - Math.PI / 2;
    for (i = 0; i < nslices; i++) {
      theta2 = (i * 2 * Math.PI) / nslices;
      spVerts.push(radius * Math.cos(theta1) * Math.cos(theta2));
      spVerts.push(radius * Math.sin(theta1));
      spVerts.push(radius * Math.cos(theta1) * Math.sin(theta2));

      spNormals.push(Math.cos(theta1) * Math.cos(theta2));
      spNormals.push(Math.sin(theta1));
      spNormals.push(Math.cos(theta1) * Math.sin(theta2));
    }
  }

  for (i = 0; i < nslices; i++) {
    spVerts.push(0);
    spVerts.push(radius);
    spVerts.push(0);

    spNormals.push(0);
    spNormals.push(1.0);
    spNormals.push(0);
  }

  // setup the connectivity and indices
  for (j = 0; j < nstacks - 1; j++)
    for (i = 0; i <= nslices; i++) {
      var mi = i % nslices;
      var mi2 = (i + 1) % nslices;
      var idx = (j + 1) * nslices + mi;
      var idx2 = j * nslices + mi;
      var idx3 = j * nslices + mi2;
      var idx4 = (j + 1) * nslices + mi;
      var idx5 = j * nslices + mi2;
      var idx6 = (j + 1) * nslices + mi2;

      spIndicies.push(idx);
      spIndicies.push(idx2);
      spIndicies.push(idx3);
      spIndicies.push(idx4);
      spIndicies.push(idx5);
      spIndicies.push(idx6);
    }
}

function initSphereBuffer() {
  var nslices = 30; // use even number
  var nstacks = nslices / 2 + 1;
  var radius = 1.0;
  initSphere(nslices, nstacks, radius);

  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = nslices * nstacks;

  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = nslices * nstacks;

  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = (nstacks - 1) * 6 * (nslices + 1);
}

function initCubeBuffer() {
  var vertices = [
    // Front face
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Back face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    // Top face
    -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Bottom face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    // Right face
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
    // Left face
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  ];
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  buf.itemSize = 3;
  buf.numItems = vertices.length / 3;

  var normals = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // Back face
    0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
    // Top face
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // Bottom face
    0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
    // Right face
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    // Left face
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];
  cubeNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  cubeNormalBuf.itemSize = 3;
  cubeNormalBuf.numItems = normals.length / 3;


  var indices = [
    0,
    1,
    2,
    0,
    2,
    3, // Front face
    4,
    5,
    6,
    4,
    6,
    7, // Back face
    8,
    9,
    10,
    8,
    10,
    11, // Top face
    12,
    13,
    14,
    12,
    14,
    15, // Bottom face
    16,
    17,
    18,
    16,
    18,
    19, // Right face
    20,
    21,
    22,
    20,
    22,
    23, // Left face
  ];
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  indexBuf.itemSize = 1;
  indexBuf.numItems = indices.length;
}

function drawSphere(aR=0.2, aG=0.2, aB=0.8, dR=0.2, dG=0.2, dB=0.8, sR=1.0, sG=1.0, sB=1.0, lR = 1.0, lG = 1.0, lB = 1.0, shininess=10.0) {
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    spBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    spNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(ambientColorLocation, [aR, aG, aB]);
  gl.uniform3fv(diffuseColorLocation, [dR, dG, dB]);
  gl.uniform3fv(specularColorLocation, [sR, sG, sB]);
  gl.uniform3fv(lightColorLocation, [lR, lG, lB]);

  gl.uniform3fv(lightPositionLocation, [lightXPosition, 1, 1.0]);
  gl.uniform1f(shininessLocation, shininess);

  gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

function drawCube(aR=0.8, aG=0.4, aB=0.2, dR=0.8, dG=0.4, dB=0.2, sR=1.0, sG=1.0, sB=1.0, lR = 1.0, lG = 1.0, lB = 1.0, shininess=32.0) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(
    aPositionLocation,
    buf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    cubeNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(ambientColorLocation, [aR, aG, aB]);
  gl.uniform3fv(diffuseColorLocation, [dR, dG, dB]);
  gl.uniform3fv(specularColorLocation, [sR, sG, sB]);
  gl.uniform3fv(lightColorLocation, [lR, lG, lB]);

  gl.uniform3fv(lightPositionLocation, [lightXPosition, 1, 1.0]);
  gl.uniform1f(shininessLocation, shininess);

  gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawObject1() {

  pushMatrix(mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(20), [1, 0, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);

  // top
  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, 0.7, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawSphere(nc(9), nc(80), nc(116), nc(9), nc(80), nc(116), 1, 1, 1, 1.0, 1.0, 1.0, 10);
  mMatrix = popMatrix();


  // base
  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, -0.2, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 1.2, 0.6]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawCube(nc(173), nc(173), nc(120), nc(173), nc(173), nc(120), 1, 1, 1, 0.65, 0.65, 0.65);
  mMatrix = popMatrix();

  mMatrix = popMatrix();
}

function drawObject2() {
  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.25, -0.25, 0.0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(65), [0, 0, 1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-5), [1, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [1, 1, 1]);

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.2, -0.05, 0.0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-20), [0, 0, 1]);

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.1, 0.0]);

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.95, 0.46, 0.1]);
  mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 0.1]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawSphere(nc(1.4*50), nc(1.4*50), nc(1.4*50), nc(150), nc(150), nc(150), 1, 1, 1, 1.0, 1.0, 1.0, 16);
  mMatrix = popMatrix();

  
  pushMatrix(mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(60), [0, 0, 1]);

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.65, -0.6, 0.0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-25), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawCube(nc(0), nc(100), nc(0), nc(0), nc(100), nc(0), 1, 1, 1, 1.0, 1.0, 1.0, 32);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.65, -0.2, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawSphere(nc(1.4*50), nc(1.4*50), nc(1.4*50), nc(150), nc(150), nc(150), 1, 1, 1, 1.0, 1.0, 1.0, 16);
  mMatrix = popMatrix();

  mMatrix = popMatrix();
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, 0.35, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawCube(nc(0), nc(100), nc(0), nc(0), nc(100), nc(0), 1, 1, 1, 1.0, 1.0, 1.0, 32);
  mMatrix = popMatrix();

  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.4, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawSphere(nc(1.4*50), nc(1.4*50), nc(1.4*50), nc(150), nc(150), nc(150), 1, 1, 1, 1.0, 1.0, 1.0, 16);
  mMatrix = popMatrix();

  mMatrix = popMatrix();
}

function drawObject3() {

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.38, 0.0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(10), [1, 0, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [0.9, 0.9, 0.9]);

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 1.15, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawSphere(nc(0.4*120), nc(0.4*130), nc(0.4*160), nc(120), nc(130), nc(160), 0.8, 0.8, 0.8, 1.0, 1.0, 1.0, 10);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, 0.83, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.5, 0.06, 0.6]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawCube(nc(0.4*176), nc(0.4*63), nc(0.4*19), nc(176), nc(63), nc(19), 1, 1, 1, 1.0, 1.0, 1.0, 32);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.45, 0.6, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0.2]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawSphere(nc(0.4*153), nc(0,.4*109), nc(0.4*30), nc(153), nc(109), nc(30), 1, 1, 1, 1.0, 1.0, 1.0, 10);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.45, 0.6, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0.2]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawSphere(nc(0.4*155), nc(0), nc(0.4*155), nc(155), nc(0), nc(155), 1, 1, 1, 1.0, 1.0, 1.0, 10);
  mMatrix = popMatrix();
  
  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.45, 0.37, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.06, 1]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawCube(nc(0.4*177), nc(0.4*176), nc(0.4*2), nc(177), nc(176), nc(2), 1, 1, 1, 1.0, 1.0, 1.0, 32);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.45, 0.37, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.06, 1]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawCube(nc(0.4*51), nc(0.4*169), nc(0.4*135), nc(51), nc(169), nc(135), 1, 1, 1, 1.0, 1.0, 1.0, 32);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.45, 0.15, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0.2]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawSphere(nc(0.4*28), nc(0.4*101), nc(0.4*117), nc(28), nc(101), nc(117), 1, 1, 1, 1.0, 1.0, 1.0, 20);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.45, 0.15, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0.2]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawSphere(nc(0.4*90), nc(0.4*90), nc(0.4*180), nc(90), nc(90), nc(180), 1, 1, 1, 1.0, 1.0, 1.0, 10);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, -0.07, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.5, 0.06, 0.6]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawCube(nc(0.4*176), nc(0.4*63), nc(0.4*19), nc(176), nc(63), nc(19), 1, 1, 1, 1.0, 1.0, 1.0, 32);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.4, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  drawSphere(nc(0), nc(0.4*202), nc(0.4*41), nc(0), nc(202), nc(41), 1, 1, 1, 1.0, 1.0, 1.0, 10);
  mMatrix = popMatrix();

  mMatrix = popMatrix();
}

function drawScene() {
  gl.enable(gl.DEPTH_TEST);

  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  // left viewport
  setShader(flatShaderProgram, flatDic);
  gl.viewport(0, 0, canvas.width / 3, canvas.height);
  gl.scissor(0, 0, canvas.width / 3, canvas.height);
  gl.enable(gl.SCISSOR_TEST);
  gl.clearColor(nc(217), nc(217), nc(241), 1.0); 
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  mat4.identity(mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(viewportDegrees[0][0]), [0, 1, 0]); // yaw
  mMatrix = mat4.rotate(mMatrix, degToRad(viewportDegrees[0][1]), [1, 0, 0]); // pitch
  drawObject1();
  gl.disable(gl.SCISSOR_TEST);

  // middle viewport
  setShader(gouradShaderProgram, gouradDic);
  gl.viewport(canvas.width / 3, 0, canvas.width / 3, canvas.height);
  gl.scissor(canvas.width / 3, 0, canvas.width / 3, canvas.height);
  gl.enable(gl.SCISSOR_TEST);
  gl.clearColor(nc(240), nc(216), nc(219), 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  mat4.identity(mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(viewportDegrees[1][0]), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(viewportDegrees[1][1]), [1, 0, 0]);
  drawObject2();
  gl.disable(gl.SCISSOR_TEST);

  // right viewport
  setShader(phongShaderProgram, phongDic);
  gl.viewport((canvas.width / 3) * 2, 0, canvas.width / 3, canvas.height);
  gl.scissor((canvas.width / 3) * 2, 0, canvas.width / 3, canvas.height);
  gl.enable(gl.SCISSOR_TEST);
  gl.clearColor(nc(216), nc(241), nc(217), 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  mat4.identity(mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(viewportDegrees[2][0]), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(viewportDegrees[2][1]), [1, 0, 0]);
  drawObject3();
  gl.disable(gl.SCISSOR_TEST);
}

function getCanvasRelative(event) 
{
  var rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    w: rect.width,
    h: rect.height
  };
}

function onMouseDown(event) 
{
  var pos = getCanvasRelative(event);
  if (pos.x < 0 || pos.x > pos.w || pos.y < 0 || pos.y > pos.h) return;

  var vp = Math.floor(pos.x / (pos.w / 3));
  if (vp < 0) vp = 0;
  if (vp > 2) vp = 2;
  activeViewport = vp;

  prevMouseX = pos.x;
  prevMouseY = pos.h - pos.y; 

  document.addEventListener("mousemove", onMouseMove, false);
  document.addEventListener("mouseup", onMouseUp, false);
  document.addEventListener("mouseout", onMouseOut, false);
}

function onMouseMove(event) 
{
  if (activeViewport === -1) return;
  var pos = getCanvasRelative(event);
  var mouseX = pos.x;
  var diffX = mouseX - prevMouseX;
  prevMouseX = mouseX;
  viewportDegrees[activeViewport][0] += diffX / 5;
  

  var mouseY = pos.h - pos.y;
  var diffY = mouseY - prevMouseY;
  prevMouseY = mouseY;
  viewportDegrees[activeViewport][1] -= diffY / 5; 

  degree0 = viewportDegrees[activeViewport][0];
  degree1 = viewportDegrees[activeViewport][1];

  drawScene();
}

function onMouseUp(event) 
{
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
  activeViewport = -1;
}

function onMouseOut(event) 
{
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
  activeViewport = -1;
}

function webGLStart() {
  canvas = document.getElementById("canvas");
  document.addEventListener("mousedown", onMouseDown, false);

  initGL(canvas);
  initShaders();
  flatDic = initDics(flatShaderProgram);
  gouradDic = initDics(gouradShaderProgram);
  phongDic = initDics(phongShaderProgram);

  finalDic = phongDic; 

  initCubeBuffer();
  initSphereBuffer();

  drawScene();
}

function setLightXPosition(val) {
  lightXPosition = val;
  drawScene();
}

function setCameraZPosition(val) {
  eyePos = [0, 0, val];
  drawScene();
}