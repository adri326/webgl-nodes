function update_outliner() { // Update the outliner window
  var outliner = document.getElementById("outline-list");

  outliner.childNodes.forEach((elem, i) => { // TODO: un-forEach-ify this
    if (!active_scene.elements[i]) {
      // Remove the excess
      outliner.removeChild(elem);
    }
    else {
      // Update the existing elements
      var active_element = active_scene.elements[i];
      if (elem.ID != active_element.ID) {
        elem.ID = active_element.ID;
        elem.name = active_element.name;
        elem.childNodes[0].innerHTML = active_element.name;
      }
    }
  });

  if (outliner.childNodes.length < active_scene.elements.length) {
    // Create new elements
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

function addElement() { // Create a new rectangle
  active_scene.elements.push(SceneElement.new("rect", 16, 16, 16, 16));
  update_outliner();
  update();
}

function moveElementUp() { // Moves the selected element up, if possible
  var index = active_scene.elements.findIndex(elem => {
    //console.log(elem);
    return (elem || {}).ID == (selected_element || {}).ID;
  });
  if (index > 0) {
    active_scene.elements.move(index, index - 1);
    active_scene.elements[index].ID = index; // Replacement element
    active_scene.elements[index - 1].ID = index - 1; // Moved element
    update_outliner();
    select_element(document.getElementById("outline-list").childNodes[index - 1]);
  }
  update();
}

function moveElementDown() { // Moves the selected element down, if possible
  var index = active_scene.elements.findIndex(elem => {
    return (elem || {}).ID == (selected_element || {}).ID;
  });
  if (index > -1 && index < active_scene.elements.length - 1) {
    active_scene.elements.move(index, index + 1);
    active_scene.elements[index].ID = index; // Replacement element
    active_scene.elements[index + 1].ID = index + 1; // Moved element
    update_outliner();
    select_element(document.getElementById("outline-list").childNodes[index + 1]);
  }
  update();
}

function remove_element() { // Delett an element
  var index = active_scene.elements.findIndex(elem => {
    return (elem || {}).ID == (selected_element || {}).ID;
  });
  if (index > -1 && index < active_scene.elements.length) {
    active_scene.elements.splice(index);
    update_outliner();
    if (index < active_scene.elements.length - 1) {
      select_element(document.getElementById("outline-list").childNodes[index + 1]);
    }
    else if (index > 0) {
      select_element(document.getElementById("outline-list").childNodes[index - 1]);
    }
  }
  update();
}
