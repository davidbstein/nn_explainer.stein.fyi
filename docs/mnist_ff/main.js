window._LOADED_MODULES = [];

function load_module(path) {
  console.log(`loaded ${path}`);
  if (window._LOADED_MODULES.indexOf(path) < 0) {
    const head = document.querySelector("head");
    const elem = document.createElement("script");
    elem.src = path;
    head.appendChild(elem);
  }
}


load_module("./mnist_demo.js")
