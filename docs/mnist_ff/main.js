window._LOADED_MODULES = [];

/*function load_module(path) {
  console.log(`loaded ${path}`);
  if (window._LOADED_MODULES.indexOf(path) < 0) {
    const head = document.querySelector("head");
    const elem = document.createElement("script");
    elem.src = `${path}?t=${Date.now()}`;
    head.appendChild(elem);
  }
}
*/

async function load_module(path) {
  return new Promise((resolve, reject) => {
    if (window._LOADED_MODULES.indexOf(path) >= 0) {
      console.log(`Module ${path} is already loaded.`);
      resolve();
    } else {
      const head = document.querySelector("head");
      const elem = document.createElement("script");
      elem.src = `${path}?t=${Date.now()}`;
      window._LOADED_MODULES.push(path);

      elem.onload = () => {
        console.log(`loaded ${path}`);
        resolve();
      };

      // Event listener for loading errors
      elem.onerror = () => {
        console.error(`Error loading module ${path}`);
        reject(new Error(`Error loading module ${path}`));
      };

      head.appendChild(elem);
    }
  });
}


load_module("./mnist_demo.js")


