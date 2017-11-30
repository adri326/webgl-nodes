function addElement() {
  active_scene.elements.push(SceneElement.new("rect", 16, 16, 16, 16));
  update_outliner();
  update();
}

function moveElementUp() {
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

function moveElementDown() {
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
