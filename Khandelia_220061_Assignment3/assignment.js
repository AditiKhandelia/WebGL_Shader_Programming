var gl;
var canvas;

var shaderProgram;

var buf;
var indexBuf;
var cubeNormalBuf;
var cubeTexBuf;

var spBuf;
var spIndexBuf;
var spNormalBuf;
var spTexBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];
var spTexCoords = [];

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

var aTexCoordLocation;
var uSamplerLocation;

var negativeXImage, positiveXImage;
var negativeYImage, positiveYImage;
var negativeZImage, positiveZImage;

var cubeMapTexture;
var cubeMapTextureLocation;

var textureLocation;
var cubeMapLocation;
var phongLocation;
var refractionLocation;

var zAngle = 0.0;
var yAngle = 0.0;                 
var prevMouseX = 0.0;     
var prevMouseY = 0.0;

var eyePos = [0, 0.8, 2.5];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

var stack = [];

var activeViewport = 0;        
var viewportDegrees = [
  [0.0, 0.0],
];

var wood_texture;
var mesh_texture;


var input_JSON = "texture_and_other_files/teapot.json";

var objVertexPositionBuffer;
var objVertexNormalBuffer;
var objVertexIndexBuffer;
var objVertexTexCoordBuffer;

var posxTexture;
var negxTexture;
var posyTexture;
var negyTexture;
var poszTexture;
var negzTexture;

var startTime;




const vertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 positionViewSpace;
out vec3 normalViewSpace;
out mat4 viewMatrix;
out vec3 positionWorldSpace;
out vec3 normalWorldSpace;

in vec2 aTexCoord;
out vec2 vTexCoord;



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

  vTexCoord = aTexCoord;
  
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

uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform vec3 lightColor;

uniform vec3 eyePosition;
uniform vec3 lightPosition; 
uniform float shininess;

in vec2 vTexCoord;
uniform sampler2D uSampler;

uniform bool textureBit;
uniform bool cubeMapBit;
uniform bool phongBit;
uniform bool refractionBit;

uniform samplerCube cubeMapTexture;


void main()
{
  // -------
  // phong shading
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

  // -------
  // texture
  vec4 texColor = texture(uSampler, vTexCoord);

  // -------
  // cubemap
  vec4 cubeTexColor;
  vec3 directionOfLight = normalize(-positionWorldSpace + eyePosition);
  vec3 reflectDir = reflect(-directionOfLight, normalize(normalWorldSpace));
  cubeTexColor = texture(cubeMapTexture, reflectDir);

  // -------
  // refraction
  vec4 refractColor;
  vec3 refractDir = refract(-directionOfLight, normalize(normalWorldSpace), 0.99);
  refractColor = texture(cubeMapTexture, refractDir);

  // -------
  // final color
  if(texColor.a < 0.1) discard;
  else {
    vec4 finalColor = vec4(0, 0, 0, 1);
    if (textureBit) {
      finalColor = finalColor + texColor;
    }
    if (cubeMapBit) {
      finalColor = finalColor + cubeTexColor;
    }
    if (phongBit) {
      finalColor = finalColor + vec4(color, 1.0);
    }
    if (refractionBit) {
      finalColor = finalColor + refractColor;
    }

    fragColor = finalColor;
  }
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

}

function initDics() {
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);  

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  
  ambientColorLocation = gl.getUniformLocation(shaderProgram, "ambientColor");
  diffuseColorLocation = gl.getUniformLocation(shaderProgram, "diffuseColor");
  specularColorLocation = gl.getUniformLocation(shaderProgram, "specularColor");
  lightColorLocation = gl.getUniformLocation(shaderProgram, "lightColor");
  lightPositionLocation = gl.getUniformLocation(shaderProgram, "lightPosition");
  eyePositionLocation = gl.getUniformLocation(shaderProgram, "eyePosition");
  shininessLocation = gl.getUniformLocation(shaderProgram, "shininess");

  textureLocation = gl.getUniformLocation(shaderProgram, "textureBit");
  cubeMapLocation = gl.getUniformLocation(shaderProgram, "cubeMapBit");
  phongLocation = gl.getUniformLocation(shaderProgram, "phongBit");
  refractionLocation = gl.getUniformLocation(shaderProgram, "refractionBit");

  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoord");
  gl.enableVertexAttribArray(aTexCoordLocation);
  uSamplerLocation = gl.getUniformLocation(shaderProgram, "uSampler");
  cubeMapTextureLocation = gl.getUniformLocation(shaderProgram, "cubeMapTexture");
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
      var utex = 1 - j / nstacks;
      var vtex = 1 - i / nslices;

      spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
      spNormals.push(xcood, ycoord, zcoord);
      spTexCoords.push(utex, vtex);
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

  spTexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spTexCoords), gl.STATIC_DRAW);
  spTexBuf.itemSize = 2;
  spTexBuf.numItems = spTexCoords.length / 2;
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

  var textureCoords = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Back face
    1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,
    // Top face
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,
    // Bottom face
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // Right face
    1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,
    // Left face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
  ];
  cubeTexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
  cubeTexBuf.itemSize = 2;
  cubeTexBuf.numItems = textureCoords.length / 2;
}

function drawSphere(aR=0.2, aG=0.2, aB=0.8, dR=0.2, dG=0.2, dB=0.8, sR=1.0, sG=1.0, sB=1.0, lR = 1.0, lG = 1.0, lB = 1.0, shininess=10.0, texture, textureBit=0, cubeMapBit=0, phongBit=1, refractionBit=0) {
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

  gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    spTexBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );


  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(ambientColorLocation, [aR, aG, aB]);
  gl.uniform3fv(diffuseColorLocation, [dR, dG, dB]);
  gl.uniform3fv(specularColorLocation, [sR, sG, sB]);
  gl.uniform3fv(lightColorLocation, [lR, lG, lB]);

  gl.uniform3fv(lightPositionLocation, [0, 0.8, 1]);
  gl.uniform1f(shininessLocation, shininess);

  gl.uniform1i(textureLocation, textureBit);
  gl.uniform1i(cubeMapLocation, cubeMapBit);
  gl.uniform1i(phongLocation, phongBit);
  gl.uniform1i(refractionLocation, refractionBit);
  
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(uSamplerLocation, 0);

  gl.uniform3fv(eyePositionLocation, eyePos);

  
  gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

function drawCube(aR=0.8, aG=0.4, aB=0.2, dR=0.8, dG=0.4, dB=0.2, sR=1.0, sG=1.0, sB=1.0, lR = 1.0, lG = 1.0, lB = 1.0, shininess=32.0, texture, textureBit=0, cubeMapBit=0, phongBit=1, refractionBit=0) {
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

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    cubeTexBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(ambientColorLocation, [aR, aG, aB]);
  gl.uniform3fv(diffuseColorLocation, [dR, dG, dB]);
  gl.uniform3fv(specularColorLocation, [sR, sG, sB]);
  gl.uniform3fv(lightColorLocation, [lR, lG, lB]);

  gl.uniform3fv(lightPositionLocation, [0, 0.8, 1]);
  gl.uniform1f(shininessLocation, shininess);

  gl.uniform1i(textureLocation, textureBit);
  gl.uniform1i(cubeMapLocation, cubeMapBit);
  gl.uniform1i(phongLocation, phongBit);
  gl.uniform1i(refractionLocation, refractionBit);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(uSamplerLocation, 0);

  gl.uniform3fv(eyePositionLocation, eyePos);

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
  
  objVertexTexCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexTexCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(objData.vertexTextureCoords),
    gl.STATIC_DRAW
  );
  objVertexTexCoordBuffer.itemSize = 2;
  objVertexTexCoordBuffer.numItems = objData.vertexTextureCoords.length / 2;

  drawScene();
}

function drawObject(aR, aG, aB, dR, dG, dB, sR, sG, sB, lR, lG, lB, shininess=32.0, texture, textureBit=0, cubeMapBit=0, phongBit=1, refractionBit=0) {
  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    objVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);

  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
  gl.vertexAttribPointer(
    aNormalLocation,
    objVertexNormalBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexTexCoordBuffer);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    objVertexTexCoordBuffer.itemSize,
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

  gl.uniform1i(textureLocation, textureBit);
  gl.uniform1i(cubeMapLocation, cubeMapBit);
  gl.uniform1i(phongLocation, phongBit);
  gl.uniform1i(refractionLocation, refractionBit);

  gl.uniform3fv(lightPositionLocation, [0, 0.8, 1]);
  gl.uniform3fv(eyePositionLocation, eyePos);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(uSamplerLocation, 0);

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.drawElements(
    gl.TRIANGLES,
    objVertexIndexBuffer.numItems,
    gl.UNSIGNED_INT,
    0
  );
}

function initTextures(textureFile) {
  var tex = gl.createTexture();
  tex.image = new Image();
  tex.image.src = textureFile;
  tex.image.onload = function () {
    handleTextureLoaded(tex);
  };
  return tex;
}

function handleTextureLoaded(texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // use it to flip Y if needed
  gl.texImage2D(
    gl.TEXTURE_2D, // 2D texture
    0, // mipmap level
    gl.RGBA, // internal format
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type of data
    texture.image // array or <img>
  );

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );

  drawScene();
}

function initCubeMap() {
  const faceImages = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: positiveXImage,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: negativeXImage,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: positiveYImage,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: negativeYImage,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: positiveZImage,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: negativeZImage,
    },
  ]
  cubeMapTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);

  faceImages.forEach((faceInfo) => {
    const { target, url } = faceInfo;

    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 512;
    const height = 512;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // setup each face so it's immediately renderable
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    image.onload = function () {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // do not flip cube map
      gl.texImage2D(target, level, internalFormat, format, type, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      drawScene();
    };
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
}

function drawTableTop() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0.8, -1.1, -0.8], mMatrix);
  mat4.scale(mMatrix, [0.18, 1.3, 0.18], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, wood_texture, 1, 0, 0, 0);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [-0.8, -1.1, -0.8], mMatrix);
  mat4.scale(mMatrix, [0.18, 1.3, 0.18], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, wood_texture, 1, 0, 0, 0);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0.8, -1.1, 0.8], mMatrix);
  mat4.scale(mMatrix, [0.18, 1.3, 0.18], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, wood_texture, 1, 0, 0, 0);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [-0.8, -1.1, 0.8], mMatrix);
  mat4.scale(mMatrix, [0.18, 1.3, 0.18], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, wood_texture, 1, 0, 0, 0);
  mMatrix = popMatrix();


  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0.0, -0.5, 0.0], mMatrix);
  mat4.scale(mMatrix, [1.65, 0.15, 1.3], mMatrix);
  drawSphere(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, wood_texture, 1, 0, 0, 0);
  mMatrix = popMatrix();
}

function earth() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [-0.1,-0.1, 0.7], mMatrix);
  mat4.scale(mMatrix, [0.28, 0.28, 0.28], mMatrix);
  drawSphere(0, 0, 0, 0, 0, 0, 1, 1, 1.0, 1, 1, 1.0, 22, earth_texture, 1, 0, 1, 0);
  mMatrix = popMatrix();
}

function enclosedEarth() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0.7, -0.137, 0.5], mMatrix);
  mat4.scale(mMatrix, [0.45, 0.45, 0.45], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, mesh_texture, 1, 0, 0, 0);
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0.7, -0.16, 0.5], mMatrix);
  mat4.scale(mMatrix, [0.15, 0.15, 0.15], mMatrix);
  drawSphere(0, 0, nc(50), 0, 0, nc(50), 1, 1, nc(50), 1, 1, 1.0, 32, earth_texture, 0, 1, 1, 0);
  mMatrix = popMatrix();

}

function drawKettle() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0, 0.13, -0.4], mMatrix);
  mat4.scale(mMatrix, [0.065, 0.065, 0.065], mMatrix);
  drawObject(0, 0, 0, 0, 0, 0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 20, wood_texture, 0, 1, 1, 0);
  mMatrix = popMatrix();
}

function glass() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [-0.8, -0.15, 0.65], mMatrix);
  mat4.rotate(mMatrix, degToRad(-40), [0, 1, 0], mMatrix);
  mat4.scale(mMatrix, [0.3, 0.8, 0.06], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 32, wood_texture, 0, 0, 0, 1);
  mMatrix = popMatrix();
}

function drawEnvironmentPosY() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0, 0.25, 0], mMatrix);
  mat4.rotate(mMatrix, degToRad(-90), [1, 0, 0], mMatrix);
  mat4.scale(mMatrix, [0.501, 0.501,0], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, posyTexture, 1, 0, 0, 0);
  mMatrix = popMatrix();
}

function drawEnvironmentNegZ() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0, 0, -0.25], mMatrix);
  mat4.rotate(mMatrix, degToRad(180), [0, 1, 0], mMatrix);
  mat4.scale(mMatrix, [0.501, 0.501,0], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, negzTexture, 1, 0, 0, 0);
  mMatrix = popMatrix();
}

function drawEnvironmentPosX() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0.25, 0, 0], mMatrix);
  mat4.rotate(mMatrix, degToRad(90), [0, 1, 0], mMatrix);
  mat4.scale(mMatrix, [0.501, 0.501,0], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, posxTexture, 1, 0, 0, 0);
  mMatrix = popMatrix();
}

function drawEnvironmentNegX() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [-0.25, 0, 0], mMatrix);
  mat4.rotate(mMatrix, degToRad(-90), [0, 1, 0], mMatrix);
  mat4.scale(mMatrix, [0.501, 0.501,0], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, negxTexture, 1, 0, 0, 0);
  mMatrix = popMatrix();
}

function drawEnvironmentNegY() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0, -0.25, 0], mMatrix);
  mat4.rotate(mMatrix, degToRad(90), [1, 0, 0], mMatrix);
  mat4.scale(mMatrix, [0.5, 0.5,0], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, negyTexture, 1, 0, 0, 0);
  mMatrix = popMatrix();
}

function drawEnvironmentPosZ() {
  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0, 0, 0.25], mMatrix);
  mat4.scale(mMatrix, [0.501, 0.501,0], mMatrix);
  drawCube(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, poszTexture, 1, 0, 0, 0);
  mMatrix = popMatrix();
}


function drawScene() {

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  mat4.identity(mMatrix);
  mat4.rotateY(mMatrix, degToRad(zAngle), mMatrix);
  mat4.rotateX(mMatrix, degToRad(yAngle), mMatrix);

  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0, 0, 0], mMatrix);
  mat4.scale(mMatrix, [40, 40, 40], mMatrix);
  drawEnvironmentPosY();
  drawEnvironmentNegZ();
  drawEnvironmentPosX();
  drawEnvironmentNegX();
  drawEnvironmentNegY();
  drawEnvironmentPosZ();
  mMatrix = popMatrix();

  pushMatrix(mMatrix);
  mat4.translate(mMatrix, [0, 0.2, 0], mMatrix);
  drawTableTop();
  earth();
  enclosedEarth();
  drawKettle();

  glass();
  mMatrix = popMatrix();
}

function webGLStart() {
    canvas = document.getElementById("myCanvas");
    startTime = Date.now();
    
    initGL(canvas);
    initShader();
    initDics();

    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(shaderProgram);


    wood_texture = initTextures("texture_and_other_files/wood_texture.jpg");
    earth_texture = initTextures("texture_and_other_files/earthmap.jpg");
    mesh_texture = initTextures("texture_and_other_files/fence_alpha.png");

    negativeXImage = 'texture_and_other_files/Field/negx.png';
    positiveXImage = 'texture_and_other_files/Field/posx.jpg';
    negativeYImage = 'texture_and_other_files/Field/negy.jpg';
    positiveYImage = 'texture_and_other_files/Field/posy.jpg';
    negativeZImage = 'texture_and_other_files/Field/negz.jpg';
    positiveZImage = 'texture_and_other_files/Field/posz.jpg';

    posxTexture = initTextures(positiveXImage);
    negxTexture = initTextures(negativeXImage);
    posyTexture = initTextures(positiveYImage);
    negyTexture = initTextures(negativeYImage);
    poszTexture = initTextures(positiveZImage);
    negzTexture = initTextures(negativeZImage);

    initCubeMap();
    gl.uniform1i(cubeMapTextureLocation, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);

    setTimeout(() => {
      drawScene();
    }, 500);


    initObject();
    initCubeBuffer();
    initSphereBuffer();

    drawScene();
}


// make the eyePos mpove with an angular velocity
setInterval(() => {
  var radius = 2.7;
  var angularSpeed = -0.2 ; 
  var time = (Date.now() - startTime) / 1000; // time in seconds
  eyePos[0] = radius * Math.sin(angularSpeed * time);
  eyePos[2] = radius * Math.cos(angularSpeed * time);
  drawScene();
}, 30);