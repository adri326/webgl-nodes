var preview_element;
var preview_context;
var do_update = true;
var programInfo;

const vsSource = `
  attribute vec4 aVertexPosition;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  }
`;

const fsSource = `
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;

var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
window.requestAnimationFrame = requestAnimationFrame;

var elementsDisplay = {
  "rect": {
    render: function(elem, x, y) {
      preview_context.fillStyle = elem.fillStyle || "transparent";
      preview_context.strokeStyle = elem.strokeStyle || "transparent";
      preview_context.lineWidth = elem.lineWidth / 2 || 0.5;

      preview_context.beginPath();
      preview_context.rect(
        x + elem.x,
        y + elem.y,
        elem.width,
        elem.height
      );

      if (elem.strokeStyle && elem.lineWidth > 0) preview_context.stroke();
      if (elem.fillStyle) preview_context.fill();
    },
    properties: {
      width: {name: "Width", type: "int", min: 0, max: 256},
      height: {name: "Height", type: "int", min: 0, max: 256},
      x: {name: "X Pos", type: "int"},
      y: {name: "Y Pos", type: "int"},
      fillStyle: {name: "Fill color", type: "color"},
      strokeStyle: {name: "Border color", type: "color"},
      lineWidth: {name: "B. weight", type: "int", "min": 0, "max": 16}
    },
    draggable: true
  }
};


function draw_preview() {
  reset_preview();
  active_scene.elements.forEach(function(elem) {
    preview_draw_element(elem, 0, 0);
  });
}

function reset_preview() {
  var preview_parent = document.getElementById("preview-window");
  preview_element = document.getElementById("preview-canvas");
  preview_element.width = preview_parent.offsetWidth;
  preview_element.height = preview_parent.offsetHeight;
  preview_context = preview_element.getContext("2d");
  preview_context.fillStyle = "black";
  preview_context.fillRect(0, 0, preview_element.width, preview_element.height);
  //initWebGL();
}

function initWebGL() {
  preview_gl = preview_element.getContext("webgl");
  if (!preview_gl) {
    console.error("Warning! WebGL couldn't be loaded!");
  }
  preview_gl.clearColor(0, 0, 0, 1);
  preview_gl.clearDepth(1.0);
  preview_gl.enable(preview_gl.DEPTH_TEST);
  preview_gl.depthFunc(preview_gl.LEQUAL);

  preview_gl.clear(preview_gl.COLOR_BUFFER_BIT, preview_gl.DEPTH_BUFFER_BIT);

  const shaderProgram = initShaderProgram(preview_gl, vsSource, fsSource);

  programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: preview_gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    },
    uniformLocations: {
      projectionMatrix: preview_gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: preview_gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
    },
  };

  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = preview_gl.canvas.clientWidth / preview_gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix,
                   fieldOfView,
                   aspect,
                   zNear,
                   zFar);
}

function preview_draw_element(elem, x, y) {
  var displayer = elementsDisplay[elem.type];
  if (displayer) {
    if (displayer.preview) displayer.preview(elem, x, y);
    else if (displayer.render) displayer.render(elem, x, y);
  }
}

function draw() {
  if (do_update) {
    do_update = false;
    draw_preview();
  }
  requestAnimationFrame(draw);
}

function update() {
  do_update = true;
}

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error("Unable to initialise program" + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function initBuffers() {
  const positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const positions = [
    1.0, 1.0,
    -1.0, 1.0,
    1.0, -1.0,
    -1.0, -1.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array(positions),
    gl.STATIC_DRAW);

  return {
    position: positionBuffer
  };
}



function preCompGLSL(node, index) {
  if (node) {
    var glslRaw = node.glsl;
    const replaces = [
      {match: /{{input\[(\d+)]}}/g, with: "node_input_" + index + "_$1"},
      {match: /{{internal\[(\d+)]}}/g, with: "node_internal_" + index + "_$1"},
      {match: /{{output\[(\d+)]}}/g, with: "node_output_" + index + "_$1"},
      {match: /{{main}}/g, with: "void node_main_" + index + "()"},
      {match: /{{(index|id)}}/gi, with: index},
      {match: /{{init\(node_input_\d+_(\d+), ?(.+)\)}}/g, with: `node_input_${index}_$1 = init_node_input(${index}, $1, $2)`}
    ];
    replaces.forEach(replace => {
      glslRaw = glslRaw.replace(replace.match, replace.with);
    });
    return glslRaw;
  }
  else {
    return new Promise(function(resolve, reject) {
      var promises = [];
      get_node_weighted_list("output").forEach(id => {
        promises.push(new Promise(function(resolve, reject) {
          if (!selected_element) reject("No selected element!");
          var node = selected_element.nodes.get(id);
          if (!node) reject("Node not found! ID: ${id}");
          var node_parent = Node.types[node.type];
          if (!node_parent) reject("Node class not found! Type: ${class}, ID: ${id}");
          var glsl = preCompGLSL(node_parent, id);
          if (!glsl) reject("Couldn't generate GLSL! ID: ${id}");
          resolve(glsl);
        }));
      });
      Promise.all(promises).then(_ => {
        resolve(_.join("\n"));
      }).catch(reject);
    });
  }
}


window.addEventListener("load", draw);
window.addEventListener("resize", update);
