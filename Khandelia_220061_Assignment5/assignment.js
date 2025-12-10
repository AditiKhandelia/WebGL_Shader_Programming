var gl;
var canvas;

var shaderProgram;
var aPositionLocation;

var ambientColorLocation;
var diffuseColorLocation;
var specularColorLocation;
var lightColorLocation;

var lightPositionLocation;
var eyePositionLocation;
var shininessLocation;

var circleCenterPositionLocation;
var circleRadiusLocation;

var canvasWidthLocation;
var canvasHeightLocation;

var shadowLocation;
var reflectionLocation;

var sphereCountLocation, sphereCentersLocation, sphereRadiiLocation, currentIndexLocation;
var currentSpheres = [];

var sphereAmbLocation;
var sphereDifLocation;
var sphereSpeLocation;
var sphereShinyLocation;

var finalEyePos = [0.1, -0.1, 1.2];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

var shadowBit = 1;
var reflectionBit = 1;


var activeViewport = 0;        
var viewportDegrees = [
  [0.0, 0.0],
];

var lightXPosition = -2;
var lightPos = [lightXPosition, 2, 2];

const vertexShaderCode = `#version 300 es
in vec3 aPosition;
out vec3 vPosition;

void main()
{
  vPosition = aPosition;
  gl_Position = vec4(aPosition, 1.0);
}`;

const fragShaderCode = `#version 300 es
precision highp float;
out vec4 fragColor;

in vec3 vPosition;

uniform vec3 ambientColor;
uniform vec3 diffuseColor;   
uniform vec3 specularColor;  
uniform vec3 lightColor;     

uniform vec3 eyePosition;    
uniform vec3 lightPosition;  
uniform float shininess;     

uniform vec3 circleCenter;
uniform float circleRadius;

uniform float canvasWidth;
uniform float canvasHeight;

uniform int shadow;
uniform int reflection;

uniform int   sphereCount;
uniform vec3  sphereCenters[16];
uniform float sphereRadii[16];
uniform int   currentIndex;

uniform vec3  sphereAmb[16];
uniform vec3  sphereDif[16];
uniform vec3  sphereSpe[16];
uniform float sphereShiny[16];

struct Ray { 
  vec3 origin; 
  vec3 direction; 
};

const float EPS = 1e-3;

bool hitSphere(vec3 ro, vec3 rd, vec3 c, float r, float tMin, float tMax, out float tHit) {
  vec3 oc = ro - c;
  float b = dot(rd, oc);
  float cc = dot(oc, oc) - r*r;
  float discriminant = b*b - cc;
  if (discriminant < 0.0) return false;
  float sq = sqrt(discriminant);
  float t = -b - sq;
  if (t < tMin || t > tMax) {
    t = -b + sq;
    if (t < tMin || t > tMax) return false;
  }
  tHit = t; return true;
}

bool hitClosestSphere(vec3 ro, vec3 rd, float tMin, float tMax, int skipIdx, out float tHit, out int idxHit) {
  bool anyHit = false;
  float bestT = tMax;
  int bestIdx = -1;
  for (int i = 0; i < 16; ++i) {
    if (i >= sphereCount) break;
    if (i == skipIdx) continue;
    float t;
    if (hitSphere(ro, rd, sphereCenters[i], sphereRadii[i], tMin, bestT, t)) {
      anyHit = true; bestT = t; bestIdx = i;
    }
  }
  tHit = bestT; idxHit = bestIdx; return anyHit;
}

void main() {
  if (circleRadius <= 0.0) { 
    fragColor = vec4(ambientColor, 1.0); 
    return; 
  }

  Ray ray;
  ray.origin = eyePosition;
  vec2 ndc = (gl_FragCoord.xy / vec2(canvasWidth, canvasHeight)) * 2.0 - 1.0;
  float aspect = canvasWidth / canvasHeight;
  ray.direction = normalize(vec3(ndc.x * aspect, ndc.y, -1.0));

  vec3 oc = ray.origin - circleCenter;
  float b = dot(ray.direction, oc);
  float c = dot(oc, oc) - circleRadius*circleRadius;
  float discriminant = b*b - c;

  if (discriminant >= 0.0) {
    float t = - b - sqrt(discriminant);
    vec3 p = ray.origin + t * ray.direction;

    vec3 n  = normalize(p - circleCenter);
    vec3 L  = normalize(lightPosition - p);
    vec3 V  = normalize(eyePosition - p);
    vec3 R = reflect(-L, n);

    float diffuse = max(dot(n, L), 0.0);
    float spec = pow(max(dot(V, R), 0.0), shininess);

    vec3 amb = ambientColor;
    vec3 dif = diffuseColor * diffuse;
    vec3 spe = specularColor * spec;

    bool inShadow = false;
    if (shadow == 1) {
      vec3 shO = p + n * EPS;
      vec3 sDir = normalize(lightPosition - shO);
      float maxT = length(lightPosition - shO);
      for (int i = 0; i < 16; ++i) {
        if (i >= sphereCount) break;
        if (i == currentIndex) continue;
        float tHit;
        if (hitSphere(shO, sDir, sphereCenters[i], sphereRadii[i], 0.0, maxT, tHit)) { inShadow = true; break; }
      }
      if (inShadow) { dif *= 0.0; spe *= 0.0; amb *= 0.2;}
    }

    vec3 color = (amb + dif + spe) * lightColor;

    if (reflection == 1) {
      float reflectivity = 0.3;
      vec3 rDir = reflect(-V, n);
      vec3 rOri = p + n * EPS;

      float tR; int idxR;
      if (hitClosestSphere(rOri, rDir, 0.0, 1e9, currentIndex, tR, idxR)) {
        vec3 q  = rOri + tR * rDir;
        vec3 n2 = normalize(q - sphereCenters[idxR]);
        vec3 L2 = normalize(lightPosition - q);
        vec3 V2 = normalize(eyePosition - q);
        vec3 R2 = reflect(-L2, n2);

        float d2 = max(dot(n2, L2), 0.0);
        float s2 = pow(max(dot(V2, R2), 0.0), sphereShiny[idxR]);

        vec3 amb2 = sphereAmb[idxR];
        vec3 dif2 = sphereDif[idxR] * d2;
        vec3 spe2 = sphereSpe[idxR] * s2;

        if (shadow == 1) {
          vec3 shO2  = q + n2 * EPS;
          vec3 sDir2 = normalize(lightPosition - shO2);
          float maxT2 = length(lightPosition - shO2);
          bool inShadow2 = false;
          for (int j = 0; j < 16; ++j) {
            if (j >= sphereCount) break;
            if (j == idxR) continue;
            float tS;
            if (hitSphere(shO2, sDir2, sphereCenters[j], sphereRadii[j], 0.0, maxT2, tS)) { inShadow2 = true; break; }
          }
          if (inShadow2) { dif2 *= 0.0; spe2 *= 0.0; }
        }

        vec3 reflCol = (amb2 + dif2 + spe2) * lightColor;
        color = mix(color, reflCol, reflectivity);
      }
    }

    fragColor = vec4(color, 1.0);
    return;
  }

  discard;
}`;

function nc(color) {
  return color/255.0;
}

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
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

  gl.useProgram(shaderProgram);
}

function initDics() {

  var program = shaderProgram;
  aPositionLocation = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPositionLocation);

  ambientColorLocation = gl.getUniformLocation(program, "ambientColor");
  diffuseColorLocation = gl.getUniformLocation(program, "diffuseColor");
  specularColorLocation = gl.getUniformLocation(program, "specularColor");
  lightColorLocation = gl.getUniformLocation(program, "lightColor");

  lightPositionLocation = gl.getUniformLocation(program, "lightPosition");
  eyePositionLocation = gl.getUniformLocation(program, "eyePosition");
  shininessLocation = gl.getUniformLocation(program, "shininess");

  circleCenterPositionLocation = gl.getUniformLocation(program, "circleCenter");
  circleRadiusLocation = gl.getUniformLocation(program, "circleRadius");

  canvasWidthLocation = gl.getUniformLocation(program, "canvasWidth");
  canvasHeightLocation = gl.getUniformLocation(program, "canvasHeight");

  gl.uniform1f(canvasWidthLocation, canvas.width);
  gl.uniform1f(canvasHeightLocation, canvas.height);

  shadowLocation = gl.getUniformLocation(program, "shadow");
  reflectionLocation = gl.getUniformLocation(program, "reflection");

  sphereCountLocation   = gl.getUniformLocation(program, "sphereCount");
  sphereCentersLocation = gl.getUniformLocation(program, "sphereCenters[0]");
  sphereRadiiLocation   = gl.getUniformLocation(program, "sphereRadii[0]");
  currentIndexLocation  = gl.getUniformLocation(program, "currentIndex");

  sphereAmbLocation   = gl.getUniformLocation(program, "sphereAmb[0]");
  sphereDifLocation   = gl.getUniformLocation(program, "sphereDif[0]");
  sphereSpeLocation   = gl.getUniformLocation(program, "sphereSpe[0]");
  sphereShinyLocation = gl.getUniformLocation(program, "sphereShiny[0]");
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

function drawSquare() {

  const bufData = new Float32Array([
-1, 1, 0, 1, 1, 0, -1, -1, 0, -1, -1, 0, 1, 1, 0, 1, -1, 0,]);
  const quadVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
  gl.bufferData(gl.ARRAY_BUFFER, bufData, gl.STATIC_DRAW);
  gl.vertexAttribPointer(aPositionLocation, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPositionLocation);

  gl.uniform3fv(ambientColorLocation, [0, 0, 0]);
  gl.uniform3fv(diffuseColorLocation, [0.6, 0.6, 0.6]);
  gl.uniform3fv(specularColorLocation, [0.9, 0.9, 0.9]);
  gl.uniform3fv(lightColorLocation, [1.0, 1.0, 1.0]);

  gl.uniform3fv(lightPositionLocation, lightPos);
  gl.uniform3fv(eyePositionLocation, finalEyePos);
  gl.uniform1f(shininessLocation, 32.0);

  gl.uniform1f(circleRadiusLocation, -1.0);

  gl.uniform1i(shadowLocation, 0);
  gl.uniform1i(reflectionLocation, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawSphere(center, radius, ambientColor, diffuseColor, specularColor, shininess, shadow=1, reflection=1) {
  gl.uniform3fv(circleCenterPositionLocation, center);
  gl.uniform1f(circleRadiusLocation, radius);

  gl.uniform3fv(ambientColorLocation, ambientColor);
  gl.uniform3fv(diffuseColorLocation, diffuseColor);
  gl.uniform3fv(specularColorLocation, specularColor);
  gl.uniform3fv(lightColorLocation, [1.0, 1.0, 1.0]);

  gl.uniform3fv(lightPositionLocation, lightPos);
  gl.uniform3fv(eyePositionLocation, finalEyePos);
  gl.uniform1f(shininessLocation, shininess);

  gl.uniform1i(shadowLocation, shadow);
  gl.uniform1i(reflectionLocation, reflection);

  let idx = currentSpheres.findIndex(s => s.radius === radius &&
                                        s.center[0] === center[0] &&
                                        s.center[1] === center[1] &&
                                        s.center[2] === center[2]);
  if (idx < 0) idx = 0;
  gl.uniform1i(currentIndexLocation, idx);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function setSpheresUniforms(spheres) {
  currentSpheres = spheres.slice(0, 16);
  const n = currentSpheres.length;

  const centersFlat = new Float32Array(16 * 3);
  const radiiFlat   = new Float32Array(16);

  const ambFlat = new Float32Array(16 * 3);
  const difFlat = new Float32Array(16 * 3);
  const speFlat = new Float32Array(16 * 3);
  const shiny   = new Float32Array(16);

  for (let i = 0; i < n; ++i) {
    const s = currentSpheres[i];
    const c = s.center;
    centersFlat[i*3+0] = c[0];
    centersFlat[i*3+1] = c[1];
    centersFlat[i*3+2] = c[2];
    radiiFlat[i]       = s.radius;

    const A = s.amb || [0,0,0];
    const D = s.dif || [0.6,0.6,0.6];
    const S = s.spe || [0.9,0.9,0.9];
    const H = s.shi !== undefined ? s.shi : 20.0;

    ambFlat[i*3+0] = A[0]; ambFlat[i*3+1] = A[1]; ambFlat[i*3+2] = A[2];
    difFlat[i*3+0] = D[0]; difFlat[i*3+1] = D[1]; difFlat[i*3+2] = D[2];
    speFlat[i*3+0] = S[0]; speFlat[i*3+1] = S[1]; speFlat[i*3+2] = S[2];
    shiny[i]       = H;
  }

  gl.uniform1i(sphereCountLocation, n);
  gl.uniform3fv(sphereCentersLocation, centersFlat);
  gl.uniform1fv(sphereRadiiLocation, radiiFlat);

  gl.uniform3fv(sphereAmbLocation,   ambFlat);
  gl.uniform3fv(sphereDifLocation,   difFlat);
  gl.uniform3fv(sphereSpeLocation,   speFlat);
  gl.uniform1fv(sphereShinyLocation, shiny);
}


function drawSphereByIndex(i) {
  const c = currentSpheres[i].center;
  const r = currentSpheres[i].radius;
  const ambientColor = currentSpheres[i].amb;
  const diffuseColor = currentSpheres[i].dif;
  const specularColor = currentSpheres[i].spe;
  const shininess = currentSpheres[i].shi;

  gl.uniform3fv(circleCenterPositionLocation, c);
  gl.uniform1f(circleRadiusLocation, r);

  gl.uniform3fv(ambientColorLocation,  ambientColor);
  gl.uniform3fv(diffuseColorLocation,  diffuseColor);
  gl.uniform3fv(specularColorLocation, specularColor);
  gl.uniform3fv(lightColorLocation, [1,1,1]);

  gl.uniform3fv(lightPositionLocation, lightPos);
  gl.uniform3fv(eyePositionLocation,   finalEyePos);
  gl.uniform1f(shininessLocation,      shininess);

  gl.uniform1i(shadowLocation,     shadowBit);
  gl.uniform1i(reflectionLocation, reflectionBit);

  gl.uniform1i(currentIndexLocation, i);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}


function drawScene() {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.uniform1f(canvasWidthLocation,  gl.drawingBufferWidth);
  gl.uniform1f(canvasHeightLocation, gl.drawingBufferHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const spheres = [
  { center: [-0.2,  0, -0.1], radius: 0.2,  amb:[nc(60), nc(20), nc(60)],  dif:[nc(137), nc(37),  nc(137)], spe:[1,1,1], shi:30 },
  { center: [-0.3, 0.3, 0.06],  radius: 0.2,  amb:[nc(40), nc(20), nc(90)],  dif:[nc(87),  nc(43),  nc(175)], spe:[1,1,1], shi:20 },
  { center: [ 0, 0.5, 0.13],   radius: 0.2,  amb:[nc(0),  nc(30), nc(100)], dif:[nc(1),   nc(62),  nc(190)], spe:[1,1,1], shi:15 },
  { center: [ 0.35, 0.4, 0.18],  radius: 0.2, amb:[nc(0),  nc(45), nc(80)],  dif:[nc(0),   nc(96),  nc(158)], spe:[1,1,1], shi:15 },
  { center: [ 0.45, 0.05,0.18],  radius: 0.2,  amb:[nc(1),  nc(80), nc(80)],  dif:[nc(3),   nc(155), nc(154)], spe:[1,1,1], shi:15 },
  { center: [ 0.35,-0.3, 0.28],  radius: 0.2,  amb:[nc(1),  nc(70), nc(38)],  dif:[nc(3),   nc(134), nc(77)],  spe:[1,1,1], shi:15 },
  { center: [ 0.01, -0.35, 0.40],  radius: 0.17,  amb:[nc(2),  nc(100),nc(0)],   dif:[nc(2),   nc(200), nc(0)],   spe:[1,1,1], shi:7  },
];

setSpheresUniforms(spheres);
drawSquare();

drawSphereByIndex(0);
drawSphereByIndex(1);
drawSphereByIndex(2);
drawSphereByIndex(3);
drawSphereByIndex(4);
drawSphereByIndex(5);
drawSphereByIndex(6);


}

function webGLStart() {
  canvas = document.getElementById("myCanvas");
  
  initGL(canvas);
  initShader();
  initDics();

  setInterval(() => {
    drawScene();
  }, 30);
}

function updateLightXPosition(value) {
  lightXPosition = parseFloat(value);
  lightPos[0] = lightXPosition;
  drawScene();
}

function toggleShadingMode(value) {
  if (value === 0) {
    shadowBit = 0;
    reflectionBit = 0;
  } else if (value === 1) {
    shadowBit = 0;
    reflectionBit = 1;
  } else if (value === 2) {
    shadowBit = 1;
    reflectionBit = 0;
  } else if (value === 3) {
    shadowBit = 1;
    reflectionBit = 1;
  }
}
