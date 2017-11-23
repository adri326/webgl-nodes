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
      out: 1, in: 0, defaults: {value: 0}},
    "output_width": {
      title: "Width",
      content: ``,
      out: 0,
      in: 1,
      inputs: ["value"]
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

    elem.style.top = elem.offsetTop - diffY + "px";
    elem.style.left = elem.offsetLeft - diffX + "px";

    updateNodeDrawCanvas();
  }

  function dragShift(event) {
    event = event || window.event;

    diffX = oldX - event.clientX;
    diffY = oldY - event.clientY;
    oldX = event.clientX;
    oldY = event.clientY;

    elem.style.height = elem.offsetHeight - diffY + "px";
    elem.style.width = elem.offsetWidth - diffX + "px";
  }

  function endDrag() {
    document.onmouseup = null;
    document.onmousemove = null;
  }

  elem.childNodes[0].onmousedown = dragMouseDown;

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
  nodeDrawContext.lineWidth = 2;
  nodeDrawContext.strokeStyle = "black";
  nodeDrawContext.beginPath();
  nodeDrawContext.moveTo(coords1.x, coords1.y);
  nodeDrawContext.lineTo(coords2.x, coords2.y);
  nodeDrawContext.stroke();
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
    nodeParent.childNodes.forEach((elem, i) => {
      if (!selected_element.nodes.get(i)) {
        // Delete display node
        nodeParent.removeChild(elem);
      }
      else {
        // Display node shall exist \o/
        var active_node = selected_element.nodes.get(i);
        var active_node_class = Node.types[active_node.type];
        elem.ID = i;
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
            elem.appendChild(child);
          }
        }
        if (active_node_class.out > 0) {
          for (n = 0; n < active_node_class.out; n++) {
            var child = document.createElement("div");
            child.classList.add("handle-bottom");
            child.classList.add("handle-" + (n + 1) + "-" + active_node_class.out);
            elem.appendChild(child);
          }
        }
      }
    });
    if (nodeParent.childNodes.length < selected_element.nodes.length) {
      for (n = nodeParent.childNodes.length; n < selected_element.nodes.length; n++) {
        var elem = document.createElement("div");
        elem.classList.add("node");
        var active_node = selected_element.nodes.get(n);
        var active_node_class = Node.types[active_node.type];
        elem.ID = n;
        var titleElement = document.createElement("div");
        titleElement.innerHTML = active_node.title || active_node_class.title;
        titleElement.classList.add("title");
        elem.appendChild(titleElement);
        var contentElement = document.createElement("div");
        contentElement.innerHTML = active_node_class.content;
        contentElement.classList.add("content");
        elem.appendChild(contentElement);
        if (active_node_class.in > 0) {
          for (n = 0; n < active_node_class.in; n++) {
            var child = document.createElement("div");
            child.connection = active_node.inputs[n];
            child.classList.add("handle-top");
            child.classList.add("handle-" + (n + 1) + "-" + active_node_class.in);
            elem.appendChild(child);
          }
        }
        if (active_node_class.out > 0) {
          for (n = 0; n < active_node_class.out; n++) {
            var child = document.createElement("div");
            child.classList.add("handle-bottom");
            child.classList.add("handle-" + (n + 1) + "-" + active_node_class.out);
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
}

function addNode(type) {
  if (type) {
    if (Node.types[type]) {
      selected_element.nodes.add(Node.new(type));
      update_nodes();
    }
  }
  else {
    var input = document.getElementById("node-input-type");
    input.classList.add("visible");
    input.childNodes[0].value = "";
  }
}

function update_node_value(input, name) {
  var elem = input.parentNode.parentNode;
  selected_element.nodes.get(elem.ID)[name] = input.value;
}


window.addEventListener("load", function() {
  update_nodes();
  initNodeDrawCanvas();
  document.getElementById("node-input-type-input").addEventListener("keyup", event => {
    if (event.key !== "Enter") return;
    addNode(document.getElementById("node-input-type-input").value);
    document.getElementById("node-input-type").classList.remove("visible");
    event.preventDefault();
  });
});

window.addEventListener("resize", function() {
  initNodeDrawCanvas();
})
