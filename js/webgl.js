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
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  {{uniforms}}

  uniform int active_element;
  uniform vec2 canvas_size;
  uniform vec3 background_vec3;

  void main() {
    vec4 outputs[{{elements_amount_min1}}];

    {{nodes}}

    for (int i = 0; i < {{elements_amount}}; i++) {
      if (i == active_element) gl_FragColor = outputs[i];
    }
  }
`;

var glsl_default = `outputs[{{element_id}}] = {{background_vec4}};`

var gl;
var fss;

function initWebGL() {

  gl = preview_element.getContext("webgl");
  if (!gl) {
    console.error("Warning! WebGL couldn't be loaded!");
  }
  gl.clearColor(0, 0, 0, 1);
  gl.clearDepth(1.0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  genFsSource().then(fsSource => {
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
}

function updateWebGL(info) {
  var aspect_ratio = gl.canvas.clientWidth / gl.canvas.clientHeight;
  active_scene.elements.forEach((element, element_id) => {
    gl.useProgram(info.program);
    gl.uniform2f(info.uniforms.elementSize, element.width / 128, - element.height / 128 * aspect_ratio);
    gl.uniform2f(info.uniforms.elementPosition, element.x / 128 - 1, 1 - element.y / 128 * aspect_ratio);
    gl.uniform1i(info.uniforms.active_element, element_id);
    gl.uniform2f(info.uniforms.canvas_size, gl.canvas.clientWidth, gl.canvas.clientHeight);
    element.nodes.array.forEach((node, node_id) => {
      var node_parent = Node.types[node.type];
      if (node_parent) {
        if (node_parent.internals) {
          node_parent.internals.forEach((internal, internal_id) => {
            if (node_parent.internal_types[internal_id] == "float") {
              //console.log(+node[internal]);
              gl.uniform1f(info.uniforms["node_" + element_id + "_internal_" + node_id + "_" + internal_id], +node[internal]);
            }
            if (node_parent.internal_types[internal_id] == "int") {
              //console.log(Math.floor(+node[internal]) || 0);
              gl.uniform1i(info.uniforms["node_" + element_id + "_internal_" + node_id + "_" + internal_id], Math.floor(+node[internal]) || 0);
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
  ["elementSize", "elementPosition", "active_element", "canvas_size"].forEach(_ => {
    out[_] = gl.getUniformLocation(program, _);
  });
  return out;
}

function preCompGLSL(node, element_id, index, element) {
  if (node) {
    var glslRaw = node.glsl;
    const replaces = [
      {match: /{{input\[(\d+)]}}/g, with: "node_" + element_id + "_input_" + index + "_$1"},
      {match: /{{internal\[(\d+)]}}/g, with: "node_" + element_id + "_internal_" + index + "_$1"},
      {match: /{{output\[(\d+)]}}/g, with: "node_" + element_id + "_output_" + index + "_$1"},
      {match: /{{main}}/g, with: "void node_" + element_id + "_main_" + index + "()"},
      {match: /{{(index|id)}}/gi, with: index},
      {match: /{{(element_id|eid)}}/gi, with: element_id},
      {match: /{{background_vec3}}/g, with: (() => {
        // Parse the background color of the element
        var parsed = /^#?([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})$/.exec(active_scene.elements[element_id].fillStyle);
        //console.log(active_scene.elements[element_id].fillStyle, parsed);
        if (parsed) {
          var r = (parseInt(parsed[1], 16) / 256).toString();
          var g = (parseInt(parsed[2], 16) / 256).toString();
          var b = (parseInt(parsed[3], 16) / 256).toString();
          // Add floating point if not already here
          if (!/\d+\.\d*/.exec(r)) r = r + ".0";
          if (!/\d+\.\d*/.exec(g)) g = g + ".0";
          if (!/\d+\.\d*/.exec(b)) b = b + ".0";
          return "vec3(" + r + ", " + g + ", " + b + ")";
        }
        else {
          return "vec3(0.0, 0.0, 0.0)";
        }
      })()},
      {match: /{{vec2_null}}/g, with: "vec2(0.0, 0.0)"},
      {match: /{{vec3_null}}/g, with: "vec3(0.0, 0.0, 0.0)"}
    ];

    replaces.forEach(replace => {
      glslRaw = glslRaw.replace(replace.match, replace.with);
    });

    glslRaw = glslRaw.replace(
      /{{init\((?:node_\d+_input_\d+_)?(\d+), ?(.+\)?)\)}}/g,
      (match, input_id, default_value, offset, string) => {
        var input = active_scene.elements[element_id].nodes.get(index).inputs[+input_id];
        if (input) {
          return "node_" + element_id + "_output_" + input.target + "_" + input.index;
        }
        else {
          return default_value;
        }
      }
    );

    return glslRaw;
  }
  else {
    return new Promise(function(resolve, reject) {
      var promises = [];
      get_node_weighted_list("output", element).forEach(id => {
        promises.push(new Promise(function(resolve, reject) {
          if (!element) reject("No element!");
          var node = element.nodes.get(id);
          if (node.weight == -1) resolve();
          if (!node) reject("Node not found! ID: ${id}");
          var node_parent = Node.types[node.type];
          if (!node_parent) reject("Node class not found! Type: ${class}, ID: ${id}");
          var glsl = preCompGLSL(node_parent, element.ID, id);
          if (!glsl) reject("Couldn't generate GLSL! ID: ${id}");
          resolve(glsl);
        }));
      });
      Promise.all(promises).then(_ => {
        resolve(_.join(""));
      }).catch(reject);
    });
  }
}

function genFsSource() {
  return new Promise(function(resolve, reject) {
    var source = "";
    var uniforms = "";
    var promises = [];
    active_scene.elements.forEach((element, element_id) => {
      // Compute the preCompGLSL result
      promises.push(preCompGLSL(false, false, false, element).then(res => {
        //console.log(res != "");
        if (res != "") source += res;
        else {
          var bg_vec4 = (() => {
            // Parse the background color of the element
            var parsed = /^#?([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})$/.exec(active_scene.elements[element_id].fillStyle);
            if (parsed) {
              var r = (parseInt(parsed[1], 16) / 256).toString();
              var g = (parseInt(parsed[2], 16) / 256).toString();
              var b = (parseInt(parsed[3], 16) / 256).toString();
              // Add floating point if not already here
              if (!/\d+\.\d*/.exec(r)) r = r + ".0";
              if (!/\d+\.\d*/.exec(g)) g = g + ".0";
              if (!/\d+\.\d*/.exec(b)) b = b + ".0";
              return "vec4(" + r + ", " + g + ", " + b + ", 1.0)";
            }
            else {
              return "vec4(0.0, 0.0, 0.0, 1.0)";
            }
          })();
          source += glsl_default
            .replace(/{{background_vec4}}/g, bg_vec4)
            .replace(/{{element_id}}/g, element_id);
          //console.log(source);
        }
      }).catch(console.error));
      // Compute the internals
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
            }
          }
          else {
            //reject();
          }
        });
        resolve();
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
        .replace(
          /{{elements_amount_min1}}/g,
          Math.max(active_scene.elements.length, 1)
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
