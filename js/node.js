const NodeGroup = {
  new: function() {
    return {
      array: [],
      add: NodeGroup.add,
      remove: NodeGroup.remove,
      get: NodeGroup.get,
      getElement: NodeGroup.getElement,
      length: 0
    }
  },
  getElement: function(index) {
    var nodeParent = document.getElementById("node-display");
    var result = null;
    nodeParent.childNodes.forEach(elem => {
      if (elem.ID == index) {
        result = elem;
      }
    });
    return result;
  },
  get: function(index) {
    return this.array[index];
  },
  add: function(node) {
    this.array.push(node);
    this.length = this.array.length;
  },
  remove: function(index) {
    this.array.splice(index, 1);
    this.length = this.array.length;
  }
}

const Node = {
  types: {
    "value": {
      title: "Value",
      content: `<input type="number" class="property-input" value="0" onchange="update_node_value(this, 'value');" />`,
      out: 1,
      in: 0,
      defaults: {value: 0},
      outputs: ["value"],
      output_types: ["float"],
      internals: ["value"],
      internal_types: ["float"],
      glsl: `
        float {{output[0]}} = {{internal[0]}};
      `
    },
    "coords": {
      title: "Coords",
      content: ``,
      out: 1,
      in: 0,
      outputs: ["coord"],
      output_types: ["vec2"],
      output: false,
      glsl: `
        vec2 {{output[0]}} = gl_FragCoord.xy / canvas_size;
      `
    },
    "vec2": {
      "title": "2D Vector",
      content: ``,
      out: 1,
      in: 2,
      inputs: ["x", "y"],
      input_types: ["float", "float"],
      outputs: ["vector"],
      output_types: ["vec2"],
      output: false,
      glsl: `
        float {{input[0]}} = {{init(0, 0.0)}};
        float {{input[1]}} = {{init(1, 0.0)}};
        vec2 {{output[0]}} = vec2({{input[0]}}, {{input[1]}});
      `
    },
    "vec3": {
      "title": "3D Vector",
      content: ``,
      out: 1,
      in: 3,
      inputs: ["x", "y", "z"],
      input_types: ["float", "float", "float"],
      outputs: ["vector"],
      output_types: ["vec3"],
      output: false,
      glsl: `
        float {{input[0]}} = {{init(0, 0.0)}};
        float {{input[1]}} = {{init(1, 0.0)}};
        float {{input[2]}} = {{init(2, 0.0)}};
        vec3 {{output[0]}} = vec3({{input[0]}}, {{input[1]}}, {{input[2]}});
      `
    },
    "svec2": {
      "title": "Separate 2D",
      content: ``,
      out: 2,
      in: 1,
      inputs: ["vector"],
      input_types: ["vec2"],
      outputs: ["x", "y"],
      output_types: ["float", "float"],
      output: false,
      glsl: `
        vec2 {{input[0]}} = {{init(0, {{vec2_null}})}};
        float {{output[0]}} = {{input[0]}}.x;
        float {{output[1]}} = {{input[0]}}.y;
      `
    },
    "svec3": {
      "title": "Separate 3D",
      content: ``,
      out: 3,
      in: 1,
      inputs: ["vec"],
      input_types: ["vec3"],
      outputs: ["x", "y", "z"],
      output_types: ["float", "float", "float"],
      output: false,
      glsl: `
        vec3 {{input[0]}} = {{init(0, {{vec3_null}}}}
        float {{output[0]}} = {{input[0]}}.x;
        float {{output[1]}} = {{input[0]}}.y;
        float {{output[2]}} = {{input[0]}}.z;
      `
    },
    "output": {
      title: "Output",
      content: ``,
      out: 0,
      in: 2,
      inputs: ["color", "alpha"],
      input_types: ["vec3", "float"],
      output: true,
      glsl: `
        vec3 {{input[0]}} = {{init(0, {{background_vec3}})}};
        float {{input[1]}} = {{init(1, 1.0)}};
        outputs[{{eid}}] = vec4({{input[0]}}, {{input[1]}});
      `
    }
  },
  new: function(type) {
    return {
      type,
      inputs: [],
      getValue: Node.getValue
    };
  },
  getValue: function(name) {
    return this[name] || Node.types[this.type].defaults[name] || null;
  }
}

const Connection = {
  new: function(target, index) {
    return {
      target,
      index,
      draw: Connection.draw
    }
  },
  draw: function(from, index) {
    var elem1 = selected_element.nodes.getElement(this.target);
    var elem2 = selected_element.nodes.getElement(from);
    connectHandles(elem1, elem2, this.index + 1, index + 1);
  }
}

function initDragNode(elem) {

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
    diffY = oldY - event.clientY;
    oldX = event.clientX;
    oldY = event.clientY;

    var node = selected_element.nodes.get(elem.ID);

    elem.style.top = elem.offsetTop - diffY + "px";
    node.top = elem.offsetTop;
    elem.style.left = elem.offsetLeft - diffX + "px";
    node.left = elem.offsetLeft;

    updateNodeDrawCanvas();
  }

  function endDrag() {
    document.onmouseup = null;
    document.onmousemove = null;
  }

  elem.childNodes[0].onmousedown = dragMouseDown;

  return elem;
}

function initDragHandle(elem, parent, top, index) {

  var baseX, baseY;

  function dragMouseDown(event) {
    event = event || window.event;

    baseX = getHandleXCoord(parent, top, index + 1);
    baseY = getHandleYCoord(parent, top, index + 1);

    document.onmouseup = endDrag;
    document.onmousemove = drag;
  }

  function drag(event) {
    var nodeParent = document.getElementById("node-window");

    event = event || window.event;

    updateNodeDrawCanvas();
    nodeDrawContext.strokeStyle = "black";
    nodeDrawContext.beginPath();
    nodeDrawContext.moveTo(baseX, baseY);
    nodeDrawContext.lineTo(event.clientX - nodeParent.offsetLeft, event.clientY - nodeParent.offsetTop);
    nodeDrawContext.stroke();
  }

  function endDrag(event) {
    document.onmouseup = null;
    document.onmousemove = null;

    if (event.target.className.indexOf("handle-") > -1) {
      var newParent = event.target.parentNode;

      if (newParent.ID != parent.ID) {
        var newTop = event.target.className.indexOf("handle-top") > -1;
        var newIndex = null;
        event.target.classList.forEach(className => {
          var match = /handle-(\d+)-\d+/.exec(className);
          if (match) newIndex = +match[1] - 1;
        });
        //console.log(newParent, newTop, newIndex, parent, top, index);
        if (newIndex !== null && newTop != top) {
          if (!top) {
            selected_element.nodes.get(newParent.ID).inputs[newIndex] = Connection.new(parent.ID, index);
          }
          else {
            selected_element.nodes.get(parent.ID).inputs[index] = Connection.new(newParent.ID, newIndex);
          }
        }
      }
      update();
    }

    updateNodeDrawCanvas();
  }

  elem.onmousedown = dragMouseDown;

  return elem;
}

var nodeDrawCanvas;
var nodeDrawContext;

function initNodeDrawCanvas() {
  nodeDrawCanvas = document.getElementById("node-draw");
  nodeDrawCanvas.width = document.getElementById("node-display").offsetWidth;
  nodeDrawCanvas.height = document.getElementById("node-display").offsetHeight;
  nodeDrawContext = nodeDrawCanvas.getContext("2d");
  updateNodeDrawCanvas();
}

function updateNodeDrawCanvas() {
  nodeDrawContext.clearRect(0, 0, nodeDrawCanvas.width, nodeDrawCanvas.height);
  drawNodeCanvas();
}

function drawNodeCanvas() {
  var nodeParent = document.getElementById("node-display");
  if (selected_element) {
    selected_element.nodes.array.forEach((node, i) => {
      node.inputs.forEach((input, j) => {
        if (input) {
          input.draw(i, j);
        }
      });
    });
  }
}

function connectHandles(elem1, elem2, index1, index2) {
  var coords1 = getHandleCoords(elem1, false, index1);
  var coords2 = getHandleCoords(elem2, true, index2);
  if (coords1.x !== null && coords1.y !== null && coords2.x !== null && coords2.y !== null) {
    nodeDrawContext.lineWidth = 2;
    nodeDrawContext.strokeStyle = "black";
    nodeDrawContext.beginPath();
    nodeDrawContext.moveTo(coords1.x, coords1.y);
    nodeDrawContext.lineTo(coords2.x, coords2.y);
    nodeDrawContext.stroke();
  }
}

function getHandleXCoord(elem, top, index) {
  var nodeHandle = getHandle(elem, top, index);
  if (nodeHandle) {
    return nodeHandle.offsetLeft + nodeHandle.offsetWidth / 2 + elem.offsetLeft;
  }
  return null;
}

function getHandleYCoord(elem, top, index) {
  var nodeHandle = getHandle(elem, top, index);
  if (nodeHandle) {
    return nodeHandle.offsetTop + nodeHandle.offsetHeight / 2 + elem.offsetTop;
  }
  return null;
}

function getHandleCoords(elem, top, index) {
  return {
    x: getHandleXCoord(elem, top, index),
    y: getHandleYCoord(elem, top, index)
  };
}

function getHandle(elem, top, index) {
  var nodeHandle;
  elem.childNodes.forEach(child => {
    if (child.classList &&
      child.classList.contains(top ? "handle-top" : "handle-bottom") &&
      child.className.indexOf("handle-" + index) > -1) {
        nodeHandle = child;
      }
  });
  return nodeHandle;
}


function update_nodes() {
  var nodeParent = document.getElementById("node-display");
  if (selected_element) {
    if (nodeParent.childNodes.length > selected_element.nodes.length) {
      for (n = selected_element.nodes.length; nodeParent.childNodes[n];) {
        nodeParent.removeChild(nodeParent.childNodes[n]);
      }
    }
    nodeParent.childNodes.forEach((elem, i) => {
      // Display node shall exist \o/
      var active_node = selected_element.nodes.get(i);
      var active_node_class = Node.types[active_node.type];
      elem.ID = i;
      elem.style.top = active_node.top + "px";
      elem.style.left = active_node.left + "px";
      elem.childNodes[0].innerHTML = active_node.title || active_node_class.title;
      elem.childNodes[1].innerHTML = active_node_class.content;
      elem.childNodes.forEach((child, index) => {
        if (index >= 2) elem.removeChild(child); // Remove any handle child; we'll do them manually
      });
      if (active_node_class.in > 0) {
        for (n = 0; n < active_node_class.in; n++) {
          var child = document.createElement("div");
          child.connection = active_node.inputs[n];
          child.classList.add("handle-top");
          child.classList.add("handle-" + (n + 1) + "-" + active_node_class.in);
          if (active_node_class.input_types) child.classList.add(active_node_class.input_types[n]);
          initDragHandle(child, elem, true, n);
          elem.appendChild(child);
        }
      }
      if (active_node_class.out > 0) {
        for (n = 0; n < active_node_class.out; n++) {
          var child = document.createElement("div");
          child.classList.add("handle-bottom");
          child.classList.add("handle-" + (n + 1) + "-" + active_node_class.out);
          if (active_node_class.output_types) child.classList.add(active_node_class.output_types[n]);
          initDragHandle(child, elem, false, n);
          elem.appendChild(child);
        }
      }
    });
    if (nodeParent.childNodes.length < selected_element.nodes.length) {
      // Node creation
      for (n = nodeParent.childNodes.length; n < selected_element.nodes.length; n++) {
        var elem = document.createElement("div");
        elem.classList.add("node");
        var active_node = selected_element.nodes.get(n);
        var active_node_class = Node.types[active_node.type];
        elem.ID = n;
        elem.style.top = active_node.top + "px";
        elem.style.left = active_node.left + "px";
        var titleElement = document.createElement("div");
        titleElement.innerHTML = active_node.title || active_node_class.title;
        titleElement.classList.add("title");
        elem.appendChild(titleElement);
        var contentElement = document.createElement("div");
        contentElement.innerHTML = active_node_class.content;
        contentElement.classList.add("content");
        elem.appendChild(contentElement);
        if (active_node_class.in > 0) {
          for (o = 0; o < active_node_class.in; o++) {
            var child = document.createElement("div");
            child.connection = active_node.inputs[o];
            child.classList.add("handle-top");
            child.classList.add("handle-" + (o + 1) + "-" + active_node_class.in);
            if (active_node_class.input_types) child.classList.add(active_node_class.input_types[o]);
            initDragHandle(child, elem, true, o);
            elem.appendChild(child);
          }
        }
        if (active_node_class.out > 0) {
          for (o = 0; o < active_node_class.out; o++) {
            var child = document.createElement("div");
            child.classList.add("handle-bottom");
            child.classList.add("handle-" + (o + 1) + "-" + active_node_class.out);
            if (active_node_class.output_types) child.classList.add(active_node_class.output_types[o]);
            initDragHandle(child, elem, false, o);
            elem.appendChild(child);
          }
        }
        nodeParent.appendChild(elem);
        initDragNode(elem);
      }
    }
  }
  else {
    // There is no selected element, get rid of every node
    nodeParent.innerHTML = "";
  }
  updateNodeDrawCanvas();
}

function addNode(type) {
  if (type) {
    if (Node.types[type]) {
      selected_element.nodes.add(Node.new(type));
      update_nodes();
      update();
    }
  }
  else {
    if (selected_element) {
      var input = document.getElementById("node-input-type");
      input.classList.add("visible");
      input.childNodes[0].value = "";
      input.childNodes[0].focus();
    }
  }
}

function update_node_value(input, name) {
  var elem = input.parentNode.parentNode;
  selected_element.nodes.get(elem.ID)[name] = input.value;
}

function update_node_weights(filter, element) {
  element.nodes.array.forEach(node => {
    node.weight = -1;
  });

  return new Promise(function(resolve, reject) {
    var promises = [];
    element.nodes.array.forEach(node => {
      var node_parent = Node.types[node.type];
      if (node_parent.output) {
        node.weight = 0;
        promises.push(node_weight_step(node));
      }
      else {
        promises.push(true);
      }
    });
    Promise.all(promises).then(resolve).catch(reject);
  });

  function node_weight_step(node) {
    var node_parent = Node.types[node.type];
    if (node_parent.in == 0) return true;
    else return new Promise(function(resolve, reject) {
      var promises = [];
      node.inputs.forEach(input => {
        if (input) {
          element.nodes.get(input.target).weight = Math.max(node.weight + 1, element.nodes.get(input.target).weight);
          promises.push(node_weight_step(element.nodes.get(input.target)));
        }
        else {
          promises.push(true);
        }
      });
      Promise.all(promises).then(resolve).catch(reject);
    });
  }
}

function get_node_weighted_list(filter, element) {
  update_node_weights(filter, element);
  return Array.from(element.nodes.array)
    .map((n, i) => {n.ID = i; return n})
    .sort((a, b) => b.weight - a.weight)
    .map(n => n.ID);
}


window.addEventListener("load", function() {
  initNodeDrawCanvas();
  update_nodes();
  document.getElementById("node-input-type-input").addEventListener("keyup", event => {
    if (event.key !== "Enter") return;
    addNode(document.getElementById("node-input-type-input").value);
    document.getElementById("node-input-type").classList.remove("visible");
    document.getElementById("node-window").focus();
    event.preventDefault();
  });
  document.getElementById("node-window").addEventListener("keypress", event => {
    if (event.key !== " ") return;
    addNode();
    event.preventDefault();
  });
});

window.addEventListener("resize", function() {
  initNodeDrawCanvas();
})
