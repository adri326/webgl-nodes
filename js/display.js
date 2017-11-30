var preview_element;
var preview_context;
var do_update = true;
var programInfo;

var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
window.requestAnimationFrame = requestAnimationFrame;

var elementsDisplay = { // Element display and properties declaration
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
      height: {name: "Height", type: "int", min: 0, max: 192},
      x: {name: "X Pos", type: "int"},
      y: {name: "Y Pos", type: "int", max: 192},
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

    var canvas = document.getElementById("preview-canvas");
    if (canvas.width != canvas.clientWidth) canvas.width = gl.canvas.clientWidth = canvas.clientWidth;
    if (canvas.height != canvas.clientHeight) canvas.height = gl.canvas.clientHeight = canvas.clientHeight;
    gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
  }
  if (active_scene.info) updateWebGL(active_scene.info); // Means that the program has updated
  requestAnimationFrame(draw);
}

function update() {
  do_update = true;
}


window.addEventListener("load", draw);
window.addEventListener("resize", update);
