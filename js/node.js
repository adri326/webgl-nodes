function initDragNode(elem) {

  var oldX, oldY, diffX, diffY;

  function dragMouseDown(event) {
    console.log("Bananas!");
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

    console.log("Coconuts!");
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

window.addEventListener("load", function() {
  console.log(initDragNode(document.getElementById("node-display").childNodes[1]).childNodes[0].onmousedown);
});
