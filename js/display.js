var preview_element;
var preview_context;
var do_update = true;
var programInfo;

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
  /*preview_context = preview_element.getContext("2d");
  preview_context.fillStyle = "black";
  preview_context.fillRect(0, 0, preview_element.width, preview_element.height);*/
  initWebGL();
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
    //if (preview_context) draw_preview();
    //else
    reset_preview();
  }
  if (active_scene.info) updateWebGL(active_scene.info); // Means that the program has updated
  requestAnimationFrame(draw);
}

function update() {
  do_update = true;
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
      {match: /{{background_vec3}}/g, with: "vec3(1.0, 1.0, 1.0)"}
    ];
    replaces.forEach(replace => {
      glslRaw = glslRaw.replace(replace.match, replace.with);
    });

    glslRaw = glslRaw.replace(
      /{{init\((?:node_\d+_input_\d+_)?(\d+), ?(.+)\)}}/g,
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


window.addEventListener("load", draw);
window.addEventListener("resize", update);
