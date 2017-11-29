const vsSource = `
  attribute vec4 aVertexPosition;

  uniform vec2 elementSize;
  uniform vec2 elementPosition;

  void main() {
    //gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    gl_Position = aVertexPosition * vec4(elementSize, 1.0, 1.0) + vec4(elementPosition, 0.0, 0.0);
  }
`;

var fsSourceBase = `
  precision highp float;

  float init_node_input(int element_id, int node_id, int input_id, float fallback);

  {{uniforms}}

  uniform int active_element;

  void main() {
    vec4 outputs[{{elements_amount}}];

    {{nodes}}

    for (int i = 0; i < {{elements_amount}}; i++) {
      if (i == active_element) gl_FragColor = outputs[i];
    }
  }

  float init_node_input(int element_id, int node_id, int input_id, float fallback) {
    return fallback;
  }
`;

var gl;
var fss;

function initWebGL() {

  gl = preview_element.getContext("webgl");
  if (!gl) {
    console.error("Warning! WebGL couldn't be loaded!");
  }
  gl.clearColor(0, 0, 0, 1);
  gl.clearDepth(1.0);

  genFsSource().then(fsSource => {
    //console.log(fsSource);
    fss = fsSource;
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    var info = {
      program: shaderProgram,
      attributes: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition")
      },
      uniforms: getUniformLocations(gl, shaderProgram),
      fsSource: fsSource,
      vsSource: vsSource,
      vertexBuffer: {
        numComponent: 2,
        type: gl.FLOAT,
        normalize: false,
        stride: 0,
        offset: 0,
        buffers: initBuffers()
      }
    };

    gl.enableVertexAttribArray(info.attributes.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, info.vertexBuffer.buffers.position);
    gl.vertexAttribPointer(info.attributes.vertexPosition,
      info.vertexBuffer.numComponent,
      info.vertexBuffer.type,
      info.vertexBuffer.normalize,
      info.vertexBuffer.stride,
      info.vertexBuffer.offset);

    active_scene.info = info;
  }).catch(console.error);




  /*gl = preview_element.getContext("webgl");
  if (!gl) {
    console.error("Warning! WebGL couldn't be loaded!");
  }
  gl.clearColor(0, 0, 0, 1);
  gl.clearDepth(1.0);
  //gl.enable(gl.DEPTH_TEST);
  //gl.depthFunc(gl.LEQUAL);node_0_internal_0_0

  gl.clear(gl.COLOR_BUFFER_BIT, gl.DEPTH_BUFFER_BIT);

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  var programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
    },
  };

  var buffers = initBuffers();

  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix,
                   fieldOfView,
                   aspect,
                   zNear,
                   zFar);
  const modelViewMatrix = mat4.create();

  mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);

  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

  const numComponent = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition,
    numComponent,
    type,
    normalize,
    stride,
    offset);

  gl.useProgram(programInfo.program);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix
  );

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);*/
}

function updateWebGL(info) {
  var aspect_ratio = gl.canvas.clientWidth / gl.canvas.clientHeight;
  active_scene.elements.forEach((element, element_id) => {
    gl.useProgram(info.program);
    gl.uniform2f(info.uniforms.elementSize, element.width / 128 / aspect_ratio, - element.height / 128);
    gl.uniform2f(info.uniforms.elementPosition, element.x / 128 / aspect_ratio - 1, 1 - element.y / 128);
    gl.uniform1i(info.uniforms.active_element, element_id);
    element.nodes.array.forEach((node, node_id) => {
      var node_parent = Node.types[node.type];
      if (node_parent) {
        if (node_parent.internals) {
          node_parent.internals.forEach((internal, internal_id) => {
            if (node_parent.internal_types[internal_id] == "float") {
              //console.log(+node[internal]);
              gl.uniform1f(info.uniforms["node_" + element_id + "_internal_" + node_id + "_" + internal_id], +node[internal]);
            }
          });
        }
      }
    });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
}

function getUniformLocations(gl, program) {
  var out = {};
  active_scene.elements.forEach(element => {
    element.nodes.array.forEach((node, node_ID) => {
      //console.log(node);
      var node_class = Node.types[node.type];
      if (node_class) {
        if (node_class.internals) {
          for (var i = 0; i < node_class.internals.length; i++) {
            var input_name = `node_${element.ID}_internal_${node_ID}_${i}`;
            out[input_name] = gl.getUniformLocation(program, input_name);
          }
        }
      }
    });
  });
  ["elementSize", "elementPosition", "active_element"].forEach(_ => {
    out[_] = gl.getUniformLocation(program, _);
  });
  return out;
}

function genFsSource() {
  return new Promise(function(resolve, reject) {
    var source = "";
    var uniforms = "";
    var promises = [];
    active_scene.elements.forEach((element, element_id) => {
      promises.push(preCompGLSL(false, false, false, element).then(_ => source += "" + _).catch(console.error));
      promises.push(new Promise(function(resolve, reject) {
        //element.nodes.array.forEach((node, node_id) => {
        get_node_weighted_list("output", element).forEach(node_id => {
          var node = element.nodes.get(node_id);
          var node_parent = Node.types[node.type];
          if (node_parent) {
            if (node_parent.internals) {
              var uniform = "";
              node_parent.internals.forEach((internal, internal_id) => {
                uniform += "\n" + "uniform " + node_parent.internal_types[internal_id] + " node_" + element_id + "_internal_" + node_id + "_" + internal_id + ";";
              });
              uniforms += uniform;
              resolve(uniform);
            }
            else {
              resolve("");
            }
          }
          else {
            reject();
          }
        });
      }));
    });
    Promise.all(promises).then(_ => {
      //console.log(uniforms);
      resolve(
        fsSourceBase.replace(
          "{{nodes}}",
          source.replace(/[^\x00-\x7F]/gu, "")
        )
        .replace(
          "{{uniforms}}",
          uniforms.replace(/[^\x00-\x7F]/gu, "")
        )
        .replace(
          /{{nodes_amount}}/g,
          active_scene.elements.reduce((ttl, element) => ttl + element.nodes.array.length, 0)
        )
        .replace(
          /{{elements_amount}}/g,
          active_scene.elements.length
        )
      );

    }).catch(reject);
  });
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
    1.0, 1.0, // (1, 1)
    0.0, 1.0, // (0, 1)
    1.0, 0.0, // (1, 0)
    0.0, 0.0  // (0, 0)
  ];

  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array(positions),
    gl.STATIC_DRAW);

  return {
    position: positionBuffer
  };
}
