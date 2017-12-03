var SceneElement = {
  new: function(type, x, y, width, height) {
    return {
      type,
      x,
      y,
      width,
      height,
      name: "Rectangle",
      fillStyle: "#dddddd",
      strokeStyle: "#ffffff",
      lineWidth: 0,
      ID: new_elem_ID(),
      nodes: NodeGroup.new(),
      textures: []
    };
  }
}

var Scene = {
  new: function() {
    return {
      elements: []
    }
  }
}


var active_scene = Scene.new();
var selected_element = null;

function new_elem_ID() {
  return (active_scene.elements.length);
}

function select_element(elem) {
  var old_elem = document.getElementById("outline-list").childNodes.forEach(e => {
    // Updates the "selected" class of the outliner
    if (e.classList.contains("selected")) {
      e.classList.remove("selected");
      e.childNodes[0].contentEditable = false;
      e.onclick = select_element.bind(null, e);
    }
  });
  selected_element = active_scene.elements.find(e => e.ID == elem.ID);
  if (selected_element) {
    elem.classList.add("selected");
    elem.childNodes[0].contentEditable = true;
    elem.childNodes[0].oninput = update_name.bind(null, elem.childNodes[0]);
    elem.onclick = null;

    // Property window synchronisation
    update_properties();
    update_draggable();
    update_nodes();
  }
}

function slider_update(slider) {
  // Set value
  if (slider.ID) {
    selected_element[slider.ID] = +slider.value || slider.value;
  }

  // Update the other sliders value
  slider.parentNode.childNodes.forEach(elem => {
    if (elem.ID == slider.ID && elem.value != slider.value) {
      elem.value = slider.value;
    }
  });

  update_draggable();

  update();
}

function update_sliders() {
  // Update the sliders
  var properties_element = document.getElementById("properties-list");
  properties_element.childNodes.forEach(elem => {
    elem.childNodes.forEach(elem_ => {
      elem_.childNodes.forEach(input => {
        if (selected_element[input.ID]) input.value = selected_element[input.ID];
      });
    });
  });
}

function update_draggable(e) {
  var draggable = document.getElementById("preview-drag");
  var canvas = document.getElementById("preview-canvas");
  if (!e) {
    // Update drag element
    if (elementsDisplay[selected_element.type].draggable && draggable) {
      draggable.classList.remove("invisible");
      draggable.style.top = (selected_element.y / 256 * canvas.clientWidth) + "px";
      draggable.style.left = (selected_element.x / 256 * canvas.clientWidth) + "px";
      draggable.style.width = (selected_element.width / 256 * canvas.clientWidth) + "px";
      draggable.style.height = (selected_element.height / 256 * canvas.clientWidth) + "px";
    }
    else {
      draggable.classList.add("invisible");
    }
  }
  else {

    update_sliders();

    update();
  }
}

function update_name(name) {
  console.log(name.innerText || name);
  selected_element.name = name.innerText || name;
}

function initDragElement(elem) {

  var oldX, oldY, diffX, diffY;
  var canvas = document.getElementById("preview-canvas");

  function dragMouseDown(event) {
    event = event || window.event;

    oldX = event.clientX;
    oldY = event.clientY;

    document.onmouseup = endDrag;
    if (!event.shiftKey)
      document.onmousemove = drag;
    else
      document.onmousemove = dragShift;
  }

  function drag(event) {
    event = event || window.event;

    diffX = oldX - event.clientX;
    diffY = oldY - event.clientY;
    oldX = event.clientX;
    oldY = event.clientY;

    selected_element.y = (selected_element.y / 256 * canvas.clientWidth - diffY) * 256 / canvas.clientWidth;
    selected_element.x = (selected_element.x / 256 * canvas.clientWidth - diffX) * 256 / canvas.clientWidth;

    elem.style.top = (selected_element.y / 256 * canvas.clientWidth) + "px";
    elem.style.left = (selected_element.x / 256 * canvas.clientWidth) + "px";

    update_draggable(true);
  }

  function dragShift(event) {
    event = event || window.event;

    diffX = oldX - event.clientX;
    diffY = oldY - event.clientY;
    oldX = event.clientX;
    oldY = event.clientY;

    selected_element.height = (selected_element.height / 256 * canvas.clientWidth - diffY) * 256 / canvas.clientWidth;
    selected_element.width = (selected_element.width / 256 * canvas.clientWidth - diffX) * 256 / canvas.clientWidth;

    elem.style.height = (selected_element.height / 256 * canvas.clientWidth) + "px";
    elem.style.width = (selected_element.width / 256 * canvas.clientWidth) + "px";

    update_draggable(true);
  }

  function endDrag() {
    document.onmouseup = null;
    document.onmousemove = null;
  }

  elem.addEventListener("mousedown", dragMouseDown);
}

function createSlider(id, property) {
  if (property.type == "int") {
    var element = document.createElement("div");
    var slider = document.createElement("input");

    slider.type = "range";
    slider.min = property.min || 0;
    slider.max = property.max || 256;
    slider.classList.add("slider", "property-slider");
    slider.value = selected_element[id];
    slider.ID = id;

    slider.oninput = slider_update.bind(null, slider);
    element.appendChild(slider);

    var input = document.createElement("input");
    input.type = "number";
    input.classList.add("number", "property-input");
    input.value = selected_element[id];
    input.ID = id;

    input.oninput = slider_update.bind(null, input);
    element.appendChild(input);
    return element;
  }
  else if (property.type == "color") {
    var element = document.createElement("div");
    var slider = document.createElement("input");

    slider.type = "color";
    slider.classList.add("color", "property-color");
    slider.value = selected_element[id];
    slider.ID = id;

    slider.oninput = slider_update.bind(null, slider);
    element.appendChild(slider);

    return element;
  }
  else {
    return document.createElement("div");
  }
}

function init() {
  active_scene.elements.push(SceneElement.new("rect", 16, 16, 16, 16));
  active_scene.elements[0].fillStyle = "#714d51";
  active_scene.elements[0].strokeStyle = "#ffffff";
  update_outliner();
  initDragElement(document.getElementById("preview-drag"));
}

function load_image_from_file_selector(selector) {
  var image = new Image();
  var file = selector.files[0];
  var reader = new FileReader();

  reader.onloadend = function() {
    image.src = reader.result;
  }
  if (file) {
    reader.readAsDataURL(file);
    image.name = image.id = file.name;
  }
  else {
    image.src = "";
  }
  return image;
}


window.addEventListener("load", function() {
  init();
  draw();
});
window.addEventListener("resize", function() {
  update_draggable();
  update();
  initNodeDrawCanvas();
});

Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};
