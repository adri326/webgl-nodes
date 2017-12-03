function update_properties() {
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

  var textures_element = document.getElementById("textures-list");
  textures_element.innerHTML = ""; // Remove any lingering texture
  selected_element.textures.forEach((texture, texture_id) => {
    var div = document.createElement("div");
    div.className = "texture";
    var name_container = document.createElement("div");
    name_container.className = "name";
    var name = document.createElement("div");
    name.innerHTML = texture.id;
    name_container.appendChild(name);
    div.appendChild(name_container);
    var remove = document.createElement("div");
    remove.innerHTML = `<i class="material-icons">delete</i>`;
    remove.className = "remove";
    init_remove_texture(remove, texture_id);
    div.appendChild(remove);
    textures_element.appendChild(div);
  });
}

function init_remove_texture(elem, id) {
  elem.onclick = function() {
    selected_element.textures.splice(id, 1);
    update_properties();
    update();
  }
}

function texture_upload(input) {
  var image = load_image_from_file_selector(input);
  selected_element.textures.push(image);
  update_properties();
}
