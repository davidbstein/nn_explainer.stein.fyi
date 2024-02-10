load_module("./ff_nn.js")
load_module("./checkpoint_manager/checkpoints.js")
load_module("./viz/viz.js")
load_module("./viz/space_viz.js")


async function trainBatched(n, batchSize=100, imageGetter, render_update_callback, update_step=10) {
  console.log(`training for ${n} iterations with batch size ${batchSize}...`)

  document.getElementById("pause-training").hidden = false;
  document.getElementById("pause-training").disabled = false;
  let scores = estimateScores();
  const startTime = Date.now();
  let last_update = 0;
  for (let i = 0; i < n; i++) {
    let ts = Math.floor((Date.now() - startTime)/1000);
    if (last_update != ts){
      last_update = ts;
      scores = estimateScores();
    }
    await updateProgressBar(i*batchSize, n*batchSize, startTime, scores);
    if (i % update_step == 0 && render_update_callback) {
      render_update_callback();
    }
    await doBatch(window.network, batchSize, imageGetter);
    await delay(0);
    if (window.STOP_SIGNAL) {
      delete window.STOP_SIGNAL;
      break;
    }
  }
  clearProgressBar();

  document.getElementById("pause-training").hidden = true;
}

// Promisify setTimeout to work with async/await
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


window.onload = async function () {
  /**
   * output: {
   *   image: a 784 number array between 0 and 1, representing an 28x28 image where 0 is black and 1 is white
   *   label: the digit represented by the image
   * }
   * returns a black image if there are no valid digits, with the label -1
   */
  function getRandomImage() {
    const validDigits = window.currentDigits;
    if (validDigits.length === 0) {
      return {
        image: Array(784).fill(0),
        label: -1
      }
    }
    let index = Math.floor(Math.random() * data.length);
    while (!validDigits.includes(data[index].label)) {
      index = Math.floor(Math.random() * data.length);
    }
    return data[index];
  }
  window.getRandomImage = getRandomImage;

  function loadRandomImage() {
    const imageData = getRandomImage();
    window.currentInput = imageData.image.map(x => x / 255);
    window.currentLabel = imageData.label;
    redraw();
  }

  function clearImage() {
    window.currentInput = Array(784).fill(0);
    window.currentLabel = -1;
    redraw();
  }

  function redraw(){
    drawNetwork(network, currentInput);
    instrumentInputImage(redraw);
  }
  window.redraw = redraw;

  function updateWeights(n) {
    for (let i = 0; i < n; i++) {
      let learningRate = window.LEARNING_RATE;
      network.backward(window.currentInput, window.currentLabel, learningRate);
    }
    redraw();
  }

  function resetWeights() {
    network.resetWeights();
    redraw();
  }

  function dampenWeights() {
    network.dampenWeights();
    redraw();
  }

  function trainingRateChanged(event) {
    window.OVERRIDE_RATE = event.target.value / 10;
    document.querySelector("#training-rate-label").innerHTML = window.OVERRIDE_RATE;
    console.log(event);
  }

  function loadNewLayers() {
    const layers = document.getElementById("layers-input").value.split(",").map(x => parseInt(x));
    window.history.pushState({}, "", `?${layers.join(",")}`);
    network.changeLayersButRetainWeights(layers);
    document.getElementById("layers-input").classList.remove("changed");
    document.getElementById("set-layers").disabled = true;
    redraw();
  }

  async function train(n, batch_size=30) {
    for (q of document.getElementById("config-container").querySelectorAll("button")) {
      q.disabled = true;
    }
    if (batch_size===1){
      console.log(`training for ${n} iterations...`)
      for (let i = 0; i < n; i++) {
        const imageData = getRandomImage();
        let input = imageData.image.map(x => x / 255);
        let label = imageData.label;
        let learningRate = window.LEARNING_RATE;
        network.backward(input, label, learningRate);
      }
      return;
    }

    await trainBatched(n/batch_size, batch_size, getRandomImage, loadRandomImage);
    loadRandomImage();
    redraw();

    for (q of document.querySelectorAll("button")) {
      q.disabled = false;
    }
    console.log("done training!");
    storeNetworkInLocalStorage(network);
  }


  function updateCurrentDigits() {
    window.currentDigits = [];
    for (let elem of document.querySelectorAll("input[name=digit]")) {
      if (elem.checked) {
        window.currentDigits.push(parseInt(elem.value));
      }
    }
  }

  function toggleDrawErase() {
    window.drawMode = !window.drawMode;
    const button = document.getElementById("draw-erase-toggle");
    button.innerHTML = window.drawMode ? "draw mode" : "erase mode";
  }

  function toggleVizMode(event) {
    const toggleButton = event.target;
    document.querySelector("#network").classList.toggle("hide-internals");
    if (document.querySelector("#network").classList.indexOf("hide-internals") >= 0) {
      window._INTERNALS_HIDDEN = true;
    } else {
      window._INTERNALS_HIDDEN = false;
    }
  }

  function toggleSpaceViz(event) {
    const container = document.querySelector("#space-viz-container");
    container.classList.toggle("minimized");
    if (window._CONTINUE_RESAMPLE) window._CONTINUE_RESAMPLE = (container.classList.indexOf("minimized") >= 0);
  }


  /**
   * START SIMULATOR
   */
  window.currentDigits = [0,1,2,3,4,5,6,7,8,9];
  const _method_id = 2;
  window.METHOD = ["sigmoid", "relu", "tanh"][_method_id];
  window.RANGE = [[0, 1], [0,1000], [-1,1]][_method_id];
  updateCurrentDigits();
  window.mouseDown = false;
  window.drawMode = true;
  document.body.addEventListener("mousedown", () => window.mouseDown = true);
  document.body.addEventListener("mouseup", () => window.mouseDown = false);
  window.LEARNING_RATE = 1;

  let layers = [8, 8];
  if (window.location.search) {
    layers = window.location.search.substring(1).split(",").map(x => parseInt(x));
  }
  let network = new Network(784, layers, 10);
  window.network = network;
  let data = MNIST_TEST;
  restoreNetworkWeightsFromLocalStorage(network);
  loadRandomImage();


  /**
   * SETUP BUTTONS
   */
  document.getElementById('space-viz-toggle').addEventListener("click", toggleSpaceViz);
  document.getElementById('layer-viz-mode-toggle').addEventListener("click", toggleVizMode);
  document.getElementById("pause-training").addEventListener("click", () => window.STOP_SIGNAL = true);
  document.getElementById("load-random-image").addEventListener("click", loadRandomImage);
  document.getElementById("clear-image").addEventListener("click", clearImage);
  document.getElementById("reset-weights").addEventListener("click", resetWeights);
  document.getElementById("dampen-weights").addEventListener("click", dampenWeights);
  document.getElementById("training-rate").addEventListener("input", trainingRateChanged);
  document.getElementById("update-weights").addEventListener("click", () => updateWeights(1));
  document.getElementById("update-weights-1000").addEventListener("click", () => updateWeights(10000));
  document.getElementById("train-1").addEventListener("click", () => train(1));
  document.getElementById("train-1000").addEventListener("click", () => train(10000));
  document.getElementById("train-100k").addEventListener("click", () => train(100000));
  document.getElementById("train-1m").addEventListener("click", () => train(100000000));
  document.getElementById("draw-erase-toggle").addEventListener("click", toggleDrawErase);
  document.querySelectorAll("input[name=digit]").forEach((elem) => {
    elem.addEventListener("change", updateCurrentDigits);
  });
  document.getElementById("deselect-all-digits").addEventListener("click", () => {
    for (let elem of document.querySelectorAll("input[name=digit]")) {
      elem.checked = false;
    }
    updateCurrentDigits();
  });
  document.getElementById("select-all-digits").addEventListener("click", () => {
    for (let elem of document.querySelectorAll("input[name=digit]")) {
      elem.checked = true;
    }
    updateCurrentDigits();
  });

  document.getElementById("layers-input").placeholder = `comma-seporated layers (e.g., ${layers.join(",")})`;
  document.getElementById("layers-input").value = `${layers.join(",")}`;
  document.getElementById("layers-input").onkeydown = (e) => {
    document.getElementById("set-layers").disabled = false;
    if (e.keyCode === 13) {
      loadNewLayers();
    }
  }
  document.getElementById("set-layers").addEventListener("click", loadNewLayers);
  document.getElementById("save-checkpoint").addEventListener("click", () => saveCheckpoint(network));
  updateCheckpointList();

  await setSV(2);
  loadSpaceViz();
}