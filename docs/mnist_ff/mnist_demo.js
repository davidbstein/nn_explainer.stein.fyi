//load_module("./ff_nn.js")
load_module("./checkpoint_manager/checkpoints.js")
load_module("./viz/viz.js")
load_module("./viz/space_viz_manager.js")
const networkWorker = new Worker('./networkWorker.js');


window.onload = async function () {
  let network;

  networkWorker.onmessage = function(event) {
    const { type, data } = event.data;
    console.debug("front-end received:", type, data);
    switch (type) {
      case 'networkLoaded':
      case 'networkReady':
        hideBackprop();
        network = data.network;
        updateNetworkViz(data.network, data.inputs, data.label);
        break;
      case 'trainingProgressUpdate':
        updateProgressBar(...data);
        break;
      case 'trainingRoundComplete':
        clearProgressBar();
        disableButtons(false);
        CheckpointManager.storeNetworkInLocalStorage(data.network);
        document.getElementById("pause-training").hidden = true;
        break;
      case 'batchComplete':
        // Handle completion of a single batch
        break;
      case 'imageReady':
        break;
      case 'spaceVizImageData':
        processSpaceVizImageData(data);
        break;
      case 'spaceVizVectorData':
        processSpaceVizVectorData(data);
        break;
      case 'currentBackpropData':
        showBackprop(data);
        break;
    }
  };

  window.addEventListener(
    "loadNewNetworkWeights",
    (e) => {
      const layers = e.detail.layers;
      networkWorker.postMessage({
        type: 'changeWeights',
        data: { layers }
      });
    },
  );

  window.addEventListener(
    "loadNewNetwork",
    (e) => {
      //data.inputCount, data.hiddenLayerSizes, data.outputCount
      const network = e.detail.network;
      networkWorker.postMessage({
        type: 'changeNetwork',
        data: { 
          inputCount: network.layers[0][0].weights.length,
          hiddenLayerSizes: network.layout.slice(0,-1),
          outputCount: network.layers[network.layers.length-1].length,
          layers: network.layers,
        }
      });
    },
  );

  function startTraining(n, batchSize) {
    document.getElementById("pause-training").hidden = false;
    document.getElementById("pause-training").disabled = false;
    networkWorker.postMessage({
      type: 'trainBatch',
      data: { n, batchSize }
    });
  }

  function drawingCallback(){
    console.log("drawingCallback NOT IMPLEMENTED");
  }

  function updateNetworkViz(network, inputs, label){
    window.currentInput = inputs;
    window.currentLabel = label;
    drawNetwork(network, inputs, label);
    instrumentInputImage(provideImageFromUser);
  }

  function provideImageFromUser(pixelData){
    networkWorker.postMessage({
      type: 'provideImageFromUser',
      data: { pixelData }
    });
  }


  function drawImage(imageData, network) {
    window.currentInput = imageData.image.map(x => x / 255);
    window.currentLabel = imageData.label;
    redraw();
  }

  function clearImage() {
    window.currentInput = Array(784).fill(0);
    window.currentLabel = -1;
    redraw();
  }

  function resetWeights(){
    networkWorker.postMessage({
      type: 'requestReset'
    });
  }
  function dampenWeights(){
    networkWorker.postMessage({
      type: 'requestDampen'
    });
  }
  // function updateWeights(n) {
  //   for (let i = 0; i < n; i++) {
  //     let learningRate = window.LEARNING_RATE;
  //     alert("FIXME mnist_demo.js:updateWeights(n)")
  //     //network.backward(window.currentInput, window.currentLabel, learningRate);
  //   }
  //   redraw();
  // }
  function computeBackprop(){
    networkWorker.postMessage({
      type: 'requestBackProp'
    });
  }

  function trainingRateChanged(event) {
    const rate = event.target.value / 10;
    document.querySelector("#training-rate-label").innerHTML = rate;
    networkWorker.postMessage({
      type: 'changeTrainingRate',
      data: { rate }
    });
  }

  function loadNewLayers() {
    const layers = document.getElementById("layers-input").value.split(",").map(x => parseInt(x));
    window.history.pushState({}, "", `?${layers.join(",")}`);
    networkWorker.postMessage({
      type: 'chageLayersButRetainWeights',
      data: {layers}
    });
    document.getElementById("layers-input").classList.remove("changed");
    document.getElementById("set-layers").disabled = true;
  }

  function loadRandomImage(){
    networkWorker.postMessage({
      type: 'requestRandomImage',
    });
  }

  function processSpaceVizImageData(data){
    SpaceVizManager.addSVDigits(data.images);
  }

  function processSpaceVizVectorData(data){
    SpaceVizManager.continueResampleSV(data.vectors);
  }

  function disableButtons(disable){
    for (q of document.getElementById("config-container").querySelectorAll("button")) {
      q.disabled = disable;
    }
  }
  async function train(n, batch_size=30) {
    disableButtons(true);
    startTraining(n / batch_size, batch_size);
/*    if (batch_size===1){
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

    for (q of document.querySelectorAll("button")) {
      q.disabled = false;
    }
    console.log("done training!");*/
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
    const imageContainer = document.getElementById("input-image");
    if (window.drawMode) {
      imageContainer.classList.add("draw-mode");
    } else {
      imageContainer.classList.remove("draw-mode");
    }
  }

  function toggleVizMode(event) {
    const toggleButton = event.target;
    document.querySelector("#network-container").classList.toggle("hide-internals");
    if (document.querySelector("#network-container").classList.contains("hide-internals") >= 0) {
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

  function pauseTraining(){
    networkWorker.postMessage({
      type: 'pauseTraining'
    });
  }

  function hideBackprop(){
    document.getElementById("backprop-preview").classList.add("hidden");
  }

  function showBackprop(data){
    const container = document.getElementById("backprop-preview");
    container.classList.remove("hidden");
    drawNeuronGradients(
      container.querySelector("#all-backprop-layers"),
      data.loss, data.gradients
    );
  }

  function requestSVUpdates(index_list) {
    networkWorker.postMessage({
      type: 'requestVectors',
      data: { index_list }
    });
  }


  function requestSVDigits(n) {
    networkWorker.postMessage({
      type: 'requestImages',
      data: { n }
    });
  }
  /**
   * START SIMULATOR
   */
  window.currentDigits = [0,1,2,3,4,5,6,7,8,9];
  const _method_id = 2;
  //window.METHOD = ["sigmoid", "relu", "tanh"][_method_id];
  //window.RANGE = [[0, 1], [0,1000], [-1,1]][_method_id];
  updateCurrentDigits();
  window.mouseDown = false;
  window.drawMode = true;
  document.body.addEventListener("mousedown", () => window.mouseDown = true);
  document.body.addEventListener("mouseup", () => window.mouseDown = false);
  //window.LEARNING_RATE = 1;

  let layers = [8, 8];
  if (window.location.search) {
    layers = window.location.search.substring(1).split(",").map(x => parseInt(x));
  }
  networkWorker.postMessage({
    type: 'initialize',
    data: {
      inputCount: 784,
      hiddenLayerSizes: layers,
      outputCount: 10,
      layers: CheckpointManager.restoreNetworkWeightsFromLocalStorage()
    }
  });

  /**
   * SETUP BUTTONS
   */
  document.getElementById('space-viz-toggle').addEventListener("click", 
    toggleSpaceViz
  );
  document.getElementById('layer-viz-mode-toggle').addEventListener("click", 
    toggleVizMode
  );
  document.getElementById("pause-training").addEventListener("click", 
    pauseTraining
  );
  document.getElementById("load-random-image").addEventListener("click", 
    loadRandomImage
  );
  document.getElementById("clear-image").addEventListener("click", 
    clearImage
  );
  document.getElementById("reset-weights").addEventListener("click", 
    resetWeights
  );
  document.getElementById("dampen-weights").addEventListener("click", 
    dampenWeights
  );
  document.getElementById("training-rate").addEventListener("input", 
    trainingRateChanged
  );
  document.getElementById("update-weights").addEventListener("click", 
    () => updateWeights(1)
  );
  document.getElementById("update-weights-1000").addEventListener("click", 
    () => updateWeights(10000)
  );
  document.getElementById("train-1").addEventListener("click", 
    () => train(1)
  );
  document.getElementById("train-1000").addEventListener("click", 
    () => train(10000)
  );
  document.getElementById("train-100k").addEventListener("click", 
    () => train(100000)
  );
  document.getElementById("train-1m").addEventListener("click", 
    () => train(100000000)
  );
  document.getElementById("draw-erase-toggle").addEventListener("click", 
    toggleDrawErase
  );
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
  document.getElementById('backprop-button').addEventListener("click",
    computeBackprop
  );

  document.getElementById("layers-input").placeholder = `comma-seporated layers (e.g., ${layers.join(",")})`;
  document.getElementById("layers-input").value = `${layers.join(",")}`;
  document.getElementById("layers-input").onkeydown = (e) => {
    document.getElementById("set-layers").disabled = false;
    if (e.keyCode === 13) {
      loadNewLayers();
    }
  }
  document.getElementById("set-layers").addEventListener("click", 
    loadNewLayers
  );
  document.getElementById("save-checkpoint").addEventListener("click", 
    () => CheckpointManager.saveCheckpoint(network)
  );
  CheckpointManager.updateCheckpointList();

  await SpaceVizManager.setSV(2);
  SpaceVizManager.loadSpaceViz(requestSVDigits, requestSVUpdates);
}