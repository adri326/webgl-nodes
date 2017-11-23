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
      nodes: NodeGroup.new()
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
    var properties_element = document.getElementById("properties-list");
    var properties = elementsDisplay[selected_element.type].properties;
    properties_element.childNodes.forEach((property, i) => {
      property.ID = Object.keys(properties)[i];
      if (property.ID) {
        property.name = properties[property.ID]["name"] || property.name;
        property.childNodes[0].innerHTML = property.name;
        property.removeChild(property.childNodes[1]);
        property.appendChild(createSlider(property.ID, properties[property.ID]));
      }
      else { // If no ID: the property element is unnecessary
        properties_element.removeChild(property);
      }
    });
    if (properties_element.childNodes.length < Object.keys(properties).length) {
      for (n = properties_element.childNodes.length; n < Object.keys(properties).length; n++) {
        var property = document.createElement("div");
        property.ID = Object.keys(properties)[n];
        property.name = properties[property.ID]["name"] || property.name;
        var nameNode = document.createElement("div");
        nameNode.innerHTML = property.name;
        var sliderNode = createSlider(property.ID, properties[property.ID]);
        property.appendChild(nameNode);
        property.appendChild(sliderNode);
        properties_element.appendChild(property);
      }
    }

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
  if (!e) {
    // Update drag element
    if (elementsDisplay[selected_element.type].draggable && draggable) {
      draggable.classList.remove("invisible");
      draggable.style.top = selected_element.y + "px";
      draggable.style.left = selected_element.x + "px";
      draggable.style.width = selected_element.width + "px";
      draggable.style.height = selected_element.height + "px";
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
    diffY = oldY - evetopnt.clientY;
    oldX = event.clientX;
    oldY = event.clientY;

    selected_element.y = selected_element.y - diffY;
    selected_element.x = selected_element.x - diffX;

    elem.style.top = selected_element.y + "px";
    elem.style.left = selected_element.x + "px";

    update_draggable(true);
  }

  function dragShift(event) {
    event = event || window.event;

    diffX = oldX - event.clientX;
    diffY = oldY - event.clientY;
    oldX = event.clientX;
    oldY = event.clientY;

    selected_element.height = selected_element.height - diffY;
    selected_element.width = selected_element.width - diffX;

    elem.style.height = selected_element.height + "px";
    elem.style.width = selected_element.width + "px";

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


function update_outliner() {
  var outliner = document.getElementById("outline-list");
  outliner.childNodes.forEach((elem, i) => {
    if (!active_scene.elements[i]) {
      // Remove the excess
      outliner.removeChild(elem);
    }
    else {
      var active_element = active_scene.elements[i];
      if (elem.ID != active_element.ID) {
        elem.ID = active_element.ID;
        elem.name = active_element.name;
        elem.childNodes[0].innerHTML = active_element.name;
      }
    }
  });
  if (outliner.childNodes.length < active_scene.elements.length) {
    for (var n = outliner.childNodes.length; n < active_scene.elements.length; n++) {
      var element = active_scene.elements[n];
      var active_element = document.createElement("li");
      var name_element = document.createElement("div");
      name_element.innerHTML = element.name;
      active_element.appendChild(name_element);
      active_element.onclick = select_element.bind(null, active_element);
      active_element.ID = element.ID;
      active_element.name = element.name;
      outliner.appendChild(active_element);
    }
  }
}

function init() {
  active_scene.elements.push(SceneElement.new("rect", 16, 16, 16, 16));
  active_scene.elements[0].fillStyle = "#714d51";
  active_scene.elements[0].strokeStyle = "#ffffff";
  update_outliner();
  initDragElement(document.getElementById("preview-drag"));
}

window.addEventListener("load", init);

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
