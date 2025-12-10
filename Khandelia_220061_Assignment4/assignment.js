var gl;
var canvas;

var shaderProgram;
var shadowShaderProgram;

var buf;
var indexBuf;
var cubeNormalBuf;
var spBuf;
var spIndexBuf;
var spNormalBuf;
var spVerts = [];
var spIndicies = [];
var spNormals = [];
var objVertexPositionBuffer;
var objVertexNormalBuffer;
var objVertexIndexBuffer;

var shadowFBO;
var shadowTexture;

var aPositionLocation;
var aNormalLocation;

var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;
var lvMatrixLocation;
var lpMatrixLocation;

var vMatrix = mat4.create(); 
var mMatrix = mat4.create(); 
var pMatrix = mat4.create(); 
var lvMatrix = mat4.create();
var lpMatrix = mat4.create();

var ambientColorLocation;
var diffuseColorLocation;
var specularColorLocation;
var lightColorLocation;

var lightPositionLocation;
var eyePositionLocation;
var shininessLocation;

var shadowTextureLocation;

var zAngle = 0.0;
var yAngle = 0.0;                 
var prevMouseX = 0.0;     
var prevMouseY = 0.0;

var eyePos = [2.5, 0.8, 0];
var finalEyePos = [2.5, 0.8, 0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

var stack = [];

var activeViewport = 0;        
var viewportDegrees = [
  [0.0, 0.0],
];
var current = "shader";

var input_JSON = "teapot.json";

var startTime;

var lightXPosition = -2;
var lightPos = [lightXPosition, 2.5, -2];

const vertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 lvMatrix;
uniform mat4 lpMatrix;

out vec3 positionViewSpace;
out vec3 normalViewSpace;
out mat4 viewMatrix;
out vec3 positionWorldSpace;
out vec3 normalWorldSpace;

out vec4 shadowCoord;

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

  positionWorldSpace = vec3(uMMatrix * vec4(aPosition,1.0));

  mat3 normalMatrixWorld = mat3(uMMatrix);
  normalMatrixWorld = transpose(inverse(normalMatrixWorld));
  normalWorldSpace = normalize(normalMatrixWorld * aNormal);

  const mat4 textureTransformMatrix = mat4(
    0.5, 0.0, 0.0, 0.0,
    0.0, 0.5, 0.0, 0.0,
    0.0, 0.0, 0.5, 0.0,
    0.5, 0.5, 0.5, 1.0
  );

  mat4 lightProjectionModelView = textureTransformMatrix*lpMatrix*lvMatrix*uMMatrix;
  shadowCoord = lightProjectionModelView * vec4(aPosition, 1.0);
  
  gl_PointSize = 2.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

in vec3 positionViewSpace;
in vec3 normalViewSpace;
in mat4 viewMatrix;
in vec3 positionWorldSpace;
in vec3 normalWorldSpace;

in vec4 shadowCoord;

uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform vec3 lightColor;

uniform vec3 eyePosition;
uniform vec3 lightPosition; 
uniform float shininess;

uniform sampler2D shadowTexture;

void main()
{
  vec3 sc = shadowCoord.xyz / shadowCoord.w;
  float currentDepth = sc.z;
  float shadowMapDepth = texture(shadowTexture, sc.xy).r;
  float shadowFactor = currentDepth - 0.0005 > shadowMapDepth ? 0.1 : 1.0;

  vec3 normal = normalize(normalViewSpace);
  
  vec3 lightPositionViewSpace = vec3(viewMatrix * vec4(lightPosition,1.0));
  
  vec3 L = normalize(lightPositionViewSpace - positionViewSpace);
  vec3 R = normalize(-reflect(L, normal));
  vec3 V = normalize(-positionViewSpace);
  
  vec3 ambient = ambientColor;
  vec3 diffuse = max(dot(L, normal), 0.0) * diffuseColor * shadowFactor;
  vec3 specular = pow(max(dot(R, V), 0.0), shininess) * specularColor * shadowFactor;
  vec3 color = ambient + diffuse + specular;
  color = color * lightColor;
  fragColor = vec4(color, 1.0);
}`;

const shadowVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 lvMatrix;
uniform mat4 lpMatrix;

out vec3 positionViewSpace;
out vec3 normalViewSpace;
out mat4 viewMatrix;
out vec3 positionWorldSpace;
out vec3 normalWorldSpace;

void main()
{
  gl_Position = uPMatrix*uVMatrix*uMMatrix*vec4(aPosition, 1.0);
}`;

const shadowFragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

in vec3 positionViewSpace;
in vec3 normalViewSpace;
in mat4 viewMatrix;
in vec3 positionWorldSpace;
in vec3 normalWorldSpace;

uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform vec3 lightColor;

uniform vec3 eyePosition;
uniform vec3 lightPosition; 
uniform float shininess;

uniform sampler2D shadowTexture;

void main()
{
  vec3 normal = normalize(normalViewSpace);
  
  vec3 lightPositionViewSpace = vec3(viewMatrix * vec4(lightPosition,1.0));
  
  vec3 L = normalize(lightPositionViewSpace - positionViewSpace);
  vec3 R = normalize(-reflect(L, normal));
  vec3 V = normalize(-positionViewSpace);

  vec3 diffuse = max(dot(L, normal), 0.0) * diffuseColor;
  vec3 color = diffuse;
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

function initShader() {
  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  var shadowVertexShader = vertexShaderSetup(shadowVertexShaderCode);
  var shadowFragmentShader = fragmentShaderSetup(shadowFragShaderCode);

  shadowShaderProgram = gl.createProgram();
  gl.attachShader(shadowShaderProgram, shadowVertexShader);
  gl.attachShader(shadowShaderProgram, shadowFragmentShader);
  gl.linkProgram(shadowShaderProgram);

}

function initDics() {
  // initialise locations depending on current

  var program = current === "shadow" ? shadowShaderProgram : shaderProgram;
  // var program = shaderProgram;

  aPositionLocation = gl.getAttribLocation(program, "aPosition");
  aNormalLocation = gl.getAttribLocation(program, "aNormal");

  if (aPositionLocation >= 0) gl.enableVertexAttribArray(aPositionLocation);
  if (aNormalLocation   >= 0) gl.enableVertexAttribArray(aNormalLocation);

  uMMatrixLocation = gl.getUniformLocation(program, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(program, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(program, "uPMatrix");
  lvMatrixLocation = gl.getUniformLocation(program, "lvMatrix");
  lpMatrixLocation = gl.getUniformLocation(program, "lpMatrix");

  ambientColorLocation = gl.getUniformLocation(program, "ambientColor");
  diffuseColorLocation = gl.getUniformLocation(program, "diffuseColor");
  specularColorLocation = gl.getUniformLocation(program, "specularColor");
  lightColorLocation = gl.getUniformLocation(program, "lightColor");

  lightPositionLocation = gl.getUniformLocation(program, "lightPosition");
  eyePositionLocation = gl.getUniformLocation(program, "eyePosition");
  shininessLocation = gl.getUniformLocation(program, "shininess");

  shadowTextureLocation = gl.getUniformLocation(program, "shadowTexture");
}

function pushMatrix(m) {
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix() {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
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
  for (var i = 0; i <= nslices; i++) {
    var angle = (i * Math.PI) / nslices;
    var comp1 = Math.sin(angle);
    var comp2 = Math.cos(angle);

    for (var j = 0; j <= nstacks; j++) {
      var phi = (j * 2 * Math.PI) / nstacks;
      var comp3 = Math.sin(phi);
      var comp4 = Math.cos(phi);

      var xcood = comp4 * comp1;
      var ycoord = comp2;
      var zcoord = comp3 * comp1;

      spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
      spNormals.push(xcood, ycoord, zcoord);
    }
  }

  // now compute the indices here
  for (var i = 0; i < nslices; i++) {
    for (var j = 0; j < nstacks; j++) {
      var id1 = i * (nstacks + 1) + j;
      var id2 = id1 + nstacks + 1;

      spIndicies.push(id1, id2, id1 + 1);
      spIndicies.push(id2, id2 + 1, id1 + 1);
    }
  }
}

function initSphereBuffer() {
  var nslices = 50;
  var nstacks = 50;
  var radius = 1.0;

  initSphere(nslices, nstacks, radius);

  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = spVerts.length / 3;

  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = spIndicies.length;

  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = spNormals.length / 3;
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

  gl.uniform3fv(lightPositionLocation, lightPos);
  gl.uniform1f(shininessLocation, shininess);

  gl.uniform3fv(eyePositionLocation, eyePos);

  gl.uniformMatrix4fv(lvMatrixLocation, false, lvMatrix);
  gl.uniformMatrix4fv(lpMatrixLocation, false, lpMatrix);
  gl.uniform1i(shadowTextureLocation, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, shadowTexture);

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

  gl.uniform3fv(lightPositionLocation, lightPos);
  gl.uniform1f(shininessLocation, shininess);

  gl.uniform3fv(eyePositionLocation, eyePos);

  gl.uniformMatrix4fv(lvMatrixLocation, false, lvMatrix);
  gl.uniformMatrix4fv(lpMatrixLocation, false, lpMatrix);
  gl.uniform1i(shadowTextureLocation, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, shadowTexture);

  gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

function initObject() {
  var request = new XMLHttpRequest();
  request.open("GET", input_JSON);
  request.overrideMimeType("application/json");
  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      processObject(JSON.parse(request.responseText));
    }
  };
  request.send();
}

function processObject(objData) {
  objVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(objData.vertexPositions),
    gl.STATIC_DRAW
  );
  objVertexPositionBuffer.itemSize = 3;
  objVertexPositionBuffer.numItems = objData.vertexPositions.length / 3;

  objVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(objData.indices),
    gl.STATIC_DRAW
  );
  objVertexIndexBuffer.itemSize = 1;
  objVertexIndexBuffer.numItems = objData.indices.length;

  objVertexNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(objData.vertexNormals),
    gl.STATIC_DRAW
  );
  objVertexNormalBuffer.itemSize = 3;
  objVertexNormalBuffer.numItems = objData.vertexNormals.length / 3;

  drawScene();
}

function drawObject(aR, aG, aB, dR, dG, dB, sR, sG, sB, lR, lG, lB, shininess=32.0) {
  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    3,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);

  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
  gl.vertexAttribPointer(
    aNormalLocation,
    3,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.uniform3fv(ambientColorLocation, [aR, aG, aB]);
  gl.uniform3fv(diffuseColorLocation, [dR, dG, dB]);
  gl.uniform3fv(specularColorLocation, [sR, sG, sB]);
  gl.uniform3fv(lightColorLocation, [lR, lG, lB]);
  gl.uniform1f(shininessLocation, shininess);
  gl.uniform3fv(lightPositionLocation, lightPos);
  gl.uniform3fv(eyePositionLocation, eyePos);

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(lvMatrixLocation, false, lvMatrix);
  gl.uniformMatrix4fv(lpMatrixLocation, false, lpMatrix);
  gl.uniform1i(shadowTextureLocation, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, shadowTexture);

  gl.drawElements(
    gl.TRIANGLES,
    objVertexIndexBuffer.numItems,
    gl.UNSIGNED_INT,
    0
  );
}

function drawTableTop() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0.0, -0.5, 0.0], mMatrix);
  mat4.scale(mMatrix, [2, 0.05, 2], mMatrix);
  drawCube(0.1, 0.1, 0.1, 0.77, 0.77, 0.77, 1, 1, 1, 1.0, 1.0, 1.0, 64.0);
  mMatrix = popMatrix();
}

function drawKettle() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [-0.3, -0.18, 0.4], mMatrix);
  mat4.scale(mMatrix, [0.04, 0.04, 0.04], mMatrix);
  drawObject(0, 0.8*0.4, 0.8*0.3, 0, 0.5, 0.2, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 5.0);
  mMatrix = popMatrix();
}

function drawTableSphere() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0.5, -0.24, -0.5], mMatrix);
  mat4.scale(mMatrix, [0.25, 0.25, 0.25], mMatrix);
  drawSphere(0, 0.5*0.5, 0.5*0.8, 0, 0.5, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 32.0);
  mMatrix = popMatrix();
}

function drawScene() {

  // shadow pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFBO);
  gl.viewport(0, 0, 2048, 2048);
  gl.colorMask(false, false, false, false);
  gl.clearDepth(1.0);
  gl.clear(gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(0.5, 0.0005);

  mat4.identity(vMatrix);
  eyePos = lightPos;
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);
  lvMatrix = mat4.lookAt(eyePos, COI, viewUp, lvMatrix);

  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);
  lpMatrix = mat4.perspective(50, 1.0, 0.1, 1000, lpMatrix);

  mat4.identity(mMatrix);
  mat4.rotateY(mMatrix, degToRad(zAngle), mMatrix);
  mat4.rotateX(mMatrix, degToRad(yAngle), mMatrix);

  current = "shadow";
  gl.useProgram(shadowShaderProgram);
  initDics();
  drawTableTop();
  drawKettle();
  drawTableSphere();

  gl.disable(gl.POLYGON_OFFSET_FILL);
  
  // camera pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.colorMask(true, true, true, true);
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  current = "shader";
  gl.useProgram(shaderProgram);
  initDics();

  eyePos = finalEyePos;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  mat4.identity(mMatrix);
  mat4.rotateY(mMatrix, degToRad(zAngle), mMatrix);
  mat4.rotateX(mMatrix, degToRad(yAngle), mMatrix);

  drawTableTop();
  drawKettle();
  drawTableSphere();
}

function initDepthFBO() {
  shadowTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.DEPTH_COMPONENT24,
    2048,
    2048,
    0,
    gl.DEPTH_COMPONENT,
    gl.UNSIGNED_INT,
    null
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  shadowFBO = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFBO);
  shadowFBO.width = 2048;
  shadowFBO.height = 2048;
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.TEXTURE_2D,
    shadowTexture,
    0
  );

  gl.drawBuffers([gl.NONE]);
  gl.readBuffer(gl.NONE);

  var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status != gl.FRAMEBUFFER_COMPLETE) {
    alert("Framebuffer not complete");
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);   // unbind FBO
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function webGLStart() {
  
    // make the scene rotatable
    canvas = document.getElementById("myCanvas");
    startTime = Date.now();
    
    initGL(canvas);
    initShader();
    initDics();

    gl.enable(gl.DEPTH_TEST);

    initDepthFBO();
    initObject();
    initCubeBuffer();
    initSphereBuffer();
    
    
    // set interval
    setInterval(() => {
      drawScene();
    }, 30);
}

function updateLightXPosition(value) {
  lightXPosition = parseFloat(value);
  lightPos[0] = lightXPosition;
  drawScene();
}

function toggleAnimation(isChecked) {
  if (isChecked) {
    animationInterval = null;
    animationStartTime = Date.now();
    var radius = Math.hypot(finalEyePos[0], finalEyePos[2]);
    if (radius < 1e-6) radius = 2.7; 
    var initialAngle = Math.atan2(finalEyePos[0], finalEyePos[2]);
    var angularSpeed = -0.3;

    animationInterval = setInterval(() => {
      var time = (Date.now() - animationStartTime) / 1000;
      var angle = initialAngle + angularSpeed * time;
      finalEyePos[0] = radius * Math.sin(angle);
      finalEyePos[2] = radius * Math.cos(angle);
      drawScene();
    }, 30);
  } else {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
  }
}