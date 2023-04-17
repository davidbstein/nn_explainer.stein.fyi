
function drawNeuronWeights(target, weights, width, height) {
  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ratio = height/width;
  canvas.style = `width: ${width}em; height: ${height}em;`
  let ctx = canvas.getContext("2d");
  let imageData = ctx.getImageData(0, 0, width, height);
  let data = imageData.data;
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      let index = (i + j * width) * 4;
      let weight = weights[i + j * width];
      let color = Math.floor(Math.abs(weight) * 255);
      if (weight > 0) {
        data[index + 0] = 0;
        data[index + 1] = 255;
        data[index + 2] = 0;
        data[index + 3] = color;
      } else {
        data[index + 0] = 255;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = color;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  target.appendChild(canvas);
}

/**
 * draw a neuron into the target div
 * the neuron is represented as a neuron of the "neuron-weight" class and a neuron of the "neuron-output" class
 * for the neuron-weight div:
 *  - if the neuron has 784 weights, draw it as a 28x28 image, where the color of each pixel is the weight of that pixel (green if positive, red if negative, white if 0)
 *  - otherwise, draw it as a 1x16 image, where the color of each pixel is the weight of that pixel (green if positive, red if negative, white if 0)
 * for the neuron-output div:
 *  - draw the output as a number between 0 and 1, formatted to 2 decimal places
 * otherwise, draw it 
 * @param {*} target 
 * @param {*} neuron 
 */
function drawNeuron(target, neuron, output) {
  let weightDiv = document.createElement("div");
  weightDiv.className = "neuron-weight";
  let outputDiv = document.createElement("div");
  outputDiv.className = "neuron-output";
  if (neuron.weights.length === 784) {
    drawNeuronWeights(weightDiv, neuron.weights, 28, 28);
  } else {
    drawNeuronWeights(weightDiv, neuron.weights, 1, neuron.weights.length);
  }
  weightDiv.style.borderColor = `rgb(${Math.floor(output * 255)}, ${Math.floor(output * 255)}, ${Math.floor(output * 255)})`;
  outputDiv.innerHTML = output.toFixed(2);
  target.appendChild(weightDiv);
  target.appendChild(outputDiv);
}

/**
 * append a div of class "hidden-layer" to the target div, and draw the neurons of the layer into that div
 * @param {*} target 
 * @param {*} layer 
 */
function drawHiddenLayer(target, layer, outputs) {
  let div = document.createElement("div");
  div.className = "hidden-layer";
  for (let i = 0; i < layer.neurons.length; i++) {
    let neuronDiv = document.createElement("div");
    drawNeuron(neuronDiv, layer.neurons[i], outputs[i]);
    div.appendChild(neuronDiv);
  }
  target.appendChild(div);
}

function normalizeOutputVal(val){
  const [minVal, maxVal] = window.RANGE;
  return (val - minVal) / (maxVal - minVal);
}

/**
 * draws the output of the network into the "output" div, represented as a column of 10 circles, colored black if the probability is 0, and white if the probability is 1.
 * each circle is labeled with the probability of that digit, formatted to 2 decimal places.
 * @param {*} outputs - a 10 number array between 0 and 1, representing the probability of each digit 
 */
function drawOutput(outputs) {
  target = document.getElementById("output");
  for (let i = 0; i < 10; i++) {
    let div = document.createElement("div");
    let val = Math.max(outputs[i], 0);
    let outputColor = Math.min(val, 1);
    outputColor = 1 - (1-outputColor) * (1-outputColor);
    outputColor *= 255;
    div.innerHTML = (`
      <div class='output-circle' style="background: rgb(${outputColor}, ${outputColor}, ${outputColor});">
        <span style='color:${outputColor < 128 ? "white" : "black"}'>${i}</span>
      </div>
      <div>${outputs[i].toFixed(2)}</div>`
    );
    target.appendChild(div);
  }
}

/**
 * given an index between 0 and 783, return the indices of the pixels in the 3x3 grid centered at idx.
 */
function getAdjacentPixels(idx){
  let validHorizontal = [0]
  let validVertical = [0]
  if (idx % 28 !== 0){
    validHorizontal.push(-1);
  }
  if (idx % 28 !== 27){
    validHorizontal.push(1);
  }
  if (idx >= 28){
    validVertical.push(-1);
  }
  if (idx <= 755){
    validVertical.push(1);
  }
  let adjacentPixels = [];
  for (let i of validHorizontal){
    for (let j of validVertical){
      adjacentPixels.push(0 + idx + i + j*28);
    }
  }
  return adjacentPixels;
}

/**
 * detect mouseover events on the input image, and update the input image to reflect the mouse position if the mouse is down
 */
function instrumentInputImage(){
  for (let elem of document.querySelectorAll(".input-pixel")) {
    elem.addEventListener("mouseover", (e) => {
      const mouseDown = window.mouseDown;
      const pixelData = window.currentInput;    
      const drawMode = window.drawMode;
      if (!mouseDown) return;
      let delta = drawMode ? 0.05 : -0.15;
      let rect = e.target.getBoundingClientRect();
      let pixelIdx = parseInt(e.target.dataset.pixelidx);
      pixelData[pixelIdx] = Math.max(0, Math.min(pixelData[pixelIdx]+delta, 1));
      for (let idx of getAdjacentPixels(pixelIdx)){
        pixelData[idx] = Math.max(0, Math.min(pixelData[idx]+delta, 1));
      }
      redraw();
    });
  }
}

/**
 * draw the image into the target div. Represent each pixel as a div with a background color between black and white, where black is 0 and white is 1.
 * @param {*} pixelData a 784 number array between 0 and 1, representing an 28x28 image where 0 is black and 1 is white
 */
function drawInputImage(target, pixelData) {
  for (let i = 0; i < 28; i++) {
    let row = document.createElement("div");
    row.className = "input-row";
    for (let j = 0; j < 28; j++) {
      let pixel = document.createElement("div");
      pixel.className = "input-pixel";
      pixel.dataset.pixelidx = i * 28 + j;
      pixel.style.backgroundColor = `rgb(${pixelData[i * 28 + j] * 255}, ${pixelData[i * 28 + j] * 255}, ${pixelData[i * 28 + j] * 255})`;
      row.appendChild(pixel);
    }
    target.appendChild(row);
  }
}

/**
 * draw the input layer into the #input-image div, 
 * computes the intermediate outputs for the hidden layers and draws them into the #hidden-layers div, 
 * draws the output layer into the #output div
 * 
 * @param {*} network 
 */
function drawNetwork(network, inputs) { 
  const inputTarget = document.getElementById("input-image");
  const inputLabelTarget = document.getElementById("input-label");
  const hiddenTarget = document.getElementById("hidden-layers");
  const outputTarget = document.getElementById("output");
  inputTarget.innerHTML = "";
  inputLabelTarget.innerHTML = window.currentLabel;
  hiddenTarget.innerHTML = "";
  outputTarget.innerHTML = "";
  drawInputImage(inputTarget, inputs);
  let layerOutputs = network.computeInternals(inputs);
  for (let i = 0; i < network.layers.length; i++) {
    drawHiddenLayer(hiddenTarget, network.layers[i], layerOutputs[i+1]);
  }
  drawOutput(layerOutputs[layerOutputs.length - 1]);
}


function saveCheckpoint(network) {
  console.log("saved!");
  const layers = _serializeNetwork(network);
  const checkpointID = Date.now();
  const layout = network.layers.map(layer => layer.neurons.length);
  const checkpoint = {
    id: checkpointID,
    layout: layout,
    layers: layers.slice(0, -1)
  };
  localStorage.setItem(`checkpoint-${checkpointID}`, JSON.stringify(checkpoint));
  updateCheckpointList();
}

function listCheckpoints() {
  let checkpoints = [];
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key.startsWith("checkpoint-")) {
      checkpoints.push(JSON.parse(localStorage.getItem(key)));
    }
  }
  return checkpoints;
}

function _formatCheckpoint(checkpoint) {
  const date = new Date(checkpoint.id)
  const localtime = date.toLocaleTimeString();
  const localdate = date.toLocaleDateString();
  return `${localdate} ${localtime} -- [${checkpoint.layout.slice(0,-1).join(",")}]`;
}

function updateCheckpointList(){
  const checkpointDiv = document.getElementById("checkpoints");
  for (let checkpoint of listCheckpoints()) {
    const button = document.createElement("button");
    // checkpoint.id is a timestamp, convert to isodate
    button.innerHTML = _formatCheckpoint(checkpoint);
    button.addEventListener("click", () => restoreCheckpoint(checkpoint.id));
    checkpointDiv.appendChild(button);
  }
}

function restoreCheckpoint(checkpointID) {
  const network = window.network;
  let checkpoint = JSON.parse(localStorage.getItem(`checkpoint-${checkpointID}`));
  if (!checkpoint) {
    console.log(`checkpoint ${checkpointID} not found`);
    return;
  }
  console.log("restoring", checkpoint);
  const layout = checkpoint.layout.slice(0,-1);
  document.getElementById("layers-input").value = layout.join(",");
  window.history.pushState({}, "", `?${layout.join(",")}`);
  network.changeLayersButRetainWeights(layout);
  _loadWeightsFromSerialized(checkpoint.layers);
  console.log(`RESTORED checkpoint ${checkpointID}`);
  redraw();
}

function _serializeNetwork(network){
  let layers = [];
  for (let i = 0; i < network.layers.length; i++) {
    let layer = [];
    for (let j = 0; j < network.layers[i].neurons.length; j++) {
      layer.push({
        weights: network.layers[i].neurons[j].weights,
        bias: network.layers[i].neurons[j].bias
      });
    }
    layers.push(layer);
  }
  return layers
}

function _loadWeightsFromSerialized(layers){
  let count = 0;
  if (!layers) return;
  for (let i = 0; i < network.layers.length; i++) {
    if (layers.length <= i) continue;
    for (let j = 0; j < network.layers[i].neurons.length; j++) {
      if (layers[i].length <= j) continue;
      count++;
      const overlapSize = Math.max(layers[i][j].weights.length, network.layers[i].neurons[j].weights.length);
      for (let k = 0; k < overlapSize; k++) {
        network.layers[i].neurons[j].weights[k] = layers[i][j].weights[k] || network.layers[i].neurons[j].weights[k];
      }
      network.layers[i].neurons[j].bias = layers[i][j].bias;
    }
    console.log(`RESTORED ${count} neurons`);
  }
}

function storeNetworkInLocalStorage() {
  const network = window.network;
  localStorage.setItem("network", JSON.stringify(_serializeNetwork(network)));
  console.log("STORED");
}

function restoreNetworkWeightsFromLocalStorage(network) {
  let layers = JSON.parse(localStorage.getItem("network"));
  _loadWeightsFromSerialized(layers);
}

function secondsToString(secs) {
  secs = Math.floor(secs);
  let hours = Math.floor(secs / 3600);
  let minutes = Math.floor(secs / 60) % 60;
  let seconds = secs % 60;
  const hstring = hours ? `${hours.toString().padStart(2, "0")}h ` : "";
  const mstring = minutes ? `${minutes.toString().padStart(2, "0")}m ` : "";
  const sstring = seconds ? `${seconds.toString().padStart(2, "0")}s` : "00";
  return `${hstring}${mstring}${sstring}`;
}

async function updateProgressBar(num, denom, startTime, scores){
  num = Math.round(num);
  denom = Math.round(denom);
  const progress = num / denom;
  const elapsed = Date.now() - startTime;
  const remaining = elapsed / progress - elapsed;
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  const progressLabel = document.getElementById("progress-label");
  //set width of progress bar
  progressBar.style.width = `${progress * 100}%`;
  //set text of progress bar
  let scoreStr = scores ? [
    `accuracy: ${(scores.accuracy*100).toFixed(2)}%`,
  ].join(", ") : "";
  progressLabel.innerHTML = `${(progress*100).toFixed(1)}% (${num} / ${denom}) ETA: ${secondsToString(remaining/1000)}  (${scoreStr}))`;
  //clear progress bar
  progressContainer.style.display = "block";
}

function clearProgressBar(){
  const progressContainer = document.getElementById("progress-container");
  progressContainer.style.display = "none";
}

// computer accuracy, recall, and f1 score
function estimateScores() {
  const sampleSize = 1000;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;
  for (let i = 0; i < sampleSize; i++) {
    let {image, label} = getRandomImage();
    let outputs = window.network.forward(image);
    let prediction = outputs.indexOf(Math.max(...outputs));
    if (outputs[prediction] > 0) {
      // "detection"
      if (prediction === label) {
        truePositives++;
      } else {
        falsePositives++;
      }
    } else {
      falseNegatives++;
    }
  }
  return ({accuracy: (truePositives) / sampleSize})
}

async function trainBatched(n, batchSize=100, imageGetter, render_update_callback, update_step=10) {
  console.log(`training for ${n} iterations with batch size ${batchSize}...`)

  document.getElementById("pause-training").hidden = false;
  document.getElementById("pause-training").disabled = false;
  let scores = estimateScores();
  const startTime = Date.now();
  for (let i = 0; i < n; i++) {
    if (Math.floor(startTime - Date.now()/1000) % 10 === 0) {
      scores = estimateScores();
    }
    await updateProgressBar(i*batchSize, n*batchSize, startTime, scores);
    if (i % update_step == 0 && render_update_callback) {
      render_update_callback();
    }
    await doBatch(batchSize, imageGetter);
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
  document.getElementById("pause-training").addEventListener("click", () => window.STOP_SIGNAL = true);
  document.getElementById("load-random-image").addEventListener("click", loadRandomImage);
  document.getElementById("clear-image").addEventListener("click", clearImage);
  document.getElementById("reset-weights").addEventListener("click", resetWeights);
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

  
  /**
   * SPACE VIZ
   */
  
  function imageToVec(input, label){
    const outputs = network.computeInternals(input);
    let layer = null;
    for (let i = 0; i < outputs.length; i++) {
      let currentLayer = outputs[i];
      if (layer === null || currentLayer.length <= layer.length) {
        layer = currentLayer;
      }
    }
    return layer;
  }

  function setSV(dims){
    if (window.space_viz) {
      delete window.space_viz; //TODO: almost cert
      document.getElementById("space-viz").innerHTML = "";
    }
    const space_viz = new SpaceViz(document.getElementById("space-viz"), dims);
    window.space_viz = space_viz;
    return space_viz;
  }
  setSV(3);
  async function addSVDigit(should_redraw, image, label){
    if (image === undefined || label === undefined) {
      const imageData = getRandomImage();
      image = imageData.image;
      label = imageData.label;
    }
    const vec = imageToVec(image, label);
    await window.space_viz.addDigit(image, label, vec);
    if (should_redraw != false) window.space_viz.draw();
  }
  function retrainSVProjections(){
    window.space_viz.resetProjection();
    window.space_viz.draw();
  }

  const SAMPLE_RATE = 500;
  const SAMPLE_N = 10;
  async function resampleSV(){
    window._CONTINUE_RESAMPLE = !window._CONTINUE_RESAMPLE;
    setTimeout(continueResampleSV, SAMPLE_RATE);
  }
  async function continueResampleSV(){
    for (let i = 0; i < SAMPLE_N; i++) {
      window.space_viz.images.shift()
      await addSVDigit(false);
    }
    window.space_viz.draw();
    if (window._CONTINUE_RESAMPLE) {
      setTimeout(continueResampleSV, SAMPLE_RATE);
    }
  }
  document.getElementById("SV-add-current").addEventListener("click", () => {
    addSVDigit(false, window.currentInput, window.currentLabel);
  });
  document.getElementById("SV-add-random").addEventListener("click", addSVDigit);
  document.getElementById("SV-add-100").addEventListener("click", 
    () => {for (let i = 0; i < 100; i++) addSVDigit(false); window.space_viz.draw();}
  );
  document.getElementById("SV-resample").addEventListener("click", resampleSV);
  document.getElementById("SV-reset").addEventListener("click", () => {
    window._CONTINUE_RESAMPLE = false;
    window.space_viz.reset();
  });
  document.getElementById("SV-retrain").addEventListener("click", retrainSVProjections);
  document.getElementById("SV-dim-toggle").addEventListener("click", (e) => {
    setSV(window.space_viz.dims === 2 ? 3 : 2);
    e.target.innerHTML = window.space_viz.dims === 2 ? "2D" : "3D";
  });
}