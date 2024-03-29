importScripts(
  './nn/neuron.js',
  './nn/layer.js',
  './nn/network.js',
  './mnist_handwritten_test.js',
);

let network;
let currentInput;
let currentLabel;
let currentImageIndex;
let currentDigits = [0,1,2,3,4,5,6,7,8,9];
let OVERRIDE_RATE = 2.5;
let _OVERRIDE_ADJUSTMENT = 1;
let STOP_SIGNAL = false;
// Handler for messages received from the main thread
self.onmessage = async function(event) {
  const { type, data } = event.data;
  console.debug("worker received:", type, data);
  switch (type) {
    case 'initialize':
      initializeNetwork(data);
      break;
    case 'trainBatch':
      STOP_SIGNAL = false;
      await trainBatched(data.n, data.batchSize, data.randomizeImages);
      break;
    case 'requestRandomImage':
      loadRandomImage();
      computeBackpropScores();
      break;
    case 'setCurrentDigits':
      currentDigits = data.currentDigits;
      break;
    case 'requestReset':
      resetWeights();
      break;
    case 'requestDampen':
      dampenWeights();
      break;
    case 'requestImages':
      getSVImages(data.n);
      break;
    case 'requestCurrentImage':
      getCurrentSVImage();
      break;
    case 'requestVectors':
      getVectors(data.index_list);
      break;
    case 'changeWeights':
      break;
    case 'loadSavedNetwork':
      loadSavedNetwork(data.layers);
      break;
    case 'provideImageFromUser':
      adjustInputs(data.pixelData);
      computeBackpropScores();
      break;
    case 'pauseTraining':
      console.warn("STOPPED");
      STOP_SIGNAL = true;
      break;
    case 'chageLayersButRetainWeights':
      changeLayersButRetainWeights(data.layers);
      break;
    case 'changeNetwork':
      initializeNetwork(data);
      break;
    case 'requestBackProp':
      computeBackpropScores();
      break;
    case 'changeTrainingRate':
      OVERRIDE_RATE = data.rate;
      break;
  }
};


function initializeNetwork(data){
  console.log(data);
  network = new Network(data.inputCount, data.hiddenLayerSizes, data.outputCount);
  network.chageWeightsButRetainLayers(data.layers);
  const randomImage = getRandomImage();
  currentInput = randomImage.image;
  currentLabel = randomImage.label;
  currentImageIndex = randomImage.index;
  self.postMessage({
    type: 'networkLoaded',
    data: {
      network: serializeNetworkForFrontend(network), 
      inputs: currentInput, 
      label: currentLabel
    }
  });
}

function broadcastNetworkUpdate(){
  self.postMessage({
    type: 'networkReady',
    data: {
      network: serializeNetworkForFrontend(network), 
      inputs: currentInput, 
      label: currentLabel
    }
  });
}

function loadRandomImage() {
  const randomImage = getRandomImage();
  currentInput = randomImage.image;
  currentLabel = randomImage.label;
  currentImageIndex = randomImage.index;
  broadcastNetworkUpdate();
}

function adjustInputs(pixelData){
  currentInput = pixelData;
  broadcastNetworkUpdate();
}

function resetWeights(){
  network.resetWeights();
  broadcastNetworkUpdate();
}

function dampenWeights(){
  network.dampenWeights();
  broadcastNetworkUpdate();
}

function changeLayersButRetainWeights(layers){
  network.changeLayersButRetainWeights(layers);
  broadcastNetworkUpdate();
}

async function broadcastProgressUpdate(num, denom, startTime, scores, step){
  self.postMessage({
    type: 'trainingProgressUpdate',
    data: [num, denom, startTime, scores, step]
  });
}

function broadcastTrainingComplete(){
  self.postMessage({
    type: 'trainingRoundComplete',
    data: {
      network: serializeNetworkForFrontend(network), 
      inputs: currentInput, 
      label: currentLabel
    }
  });
}

function computeBackpropScores(){
  self.postMessage({
    type: 'currentBackpropData',
    data: getBackProp(network, currentInput, currentLabel),
  });
}

/** SPACE VIZ **/
function getCurrentSVImage(){
  const images = []
  const im = getCurrentImage();
  im.vec = imageToSVVec(im.image);
  images.push(im)
  self.postMessage({
    type: 'spaceVizImageData',
    data: {images}
  });
}

function getSVImages(n){
  const images = [];
  for (let i = 0; i++<n;){
    images.push(getRandomImage());
  }
  self.postMessage({
    type: 'spaceVizImageData',
    data: {images}
  });
}

function imageToSVVec(input) {
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

function getVectors(index_list){
  vectors = {}
  for (let idx of index_list){
    const im = getImageByIndex(idx);
    if (im) vectors[idx] = imageToSVVec(im.image);
  }
  self.postMessage({
    type: 'spaceVizVectorData',
    data: {vectors}
  });
}

/** TRAINING **/

function dynamicLearningRate(loss, maxRate=.2, decayRate=1){
  const a = maxRate;
  const b = decayRate * 5;
  const x = (1-loss);
  // //exponential decay
  // let rate = a * Math.exp(-b * x);
  // // quadratic decay
  let rate = Math.min(loss * loss/(decayRate/2), maxRate);
  rate = Math.min(rate, maxRate);
  // console.log(loss.toFixed(2), rate.toFixed(2));
  if (OVERRIDE_RATE > 0) 
    return Math.min(.5, rate * (OVERRIDE_RATE * _OVERRIDE_ADJUSTMENT));
  return rate;
}


async function trainBatched(n, batchSize=1, randomizeImages=true) {
  if (batchSize===1){
    console.log(`training for ${n} iterations...`)
    for (let i = 0; i < n; i++) {
      const imageData = getRandomImage();
      let input = imageData.image.map(x => x / 255);
      let label = imageData.label;
      let learningRate = window.LEARNING_RATE;
      network.backward(input, label, learningRate);
    }
    broadcastTrainingComplete();
    return;
  }
  console.log(`training for ${n} iterations with batch size ${batchSize}...`)
  imageGetter = randomizeImages ? getRandomImage : getCurrentImage;
  let scores = estimateScores();
  const startTime = Date.now();
  let last_update_preview = 0;
  let last_update_score = 0;
  for (let i = 0; i < n; i++) {
    let ts = Math.floor((Date.now() - startTime)/500);
    if (last_update_preview != ts){
      last_update_preview = ts;
      const im = imageGetter();
      currentInput = im.image;
      currentLabel = im.label;
      currentImageIndex = im.index;
      broadcastNetworkUpdate();
    }
    ts = Math.floor((Date.now() - startTime)/2500);
    if (last_update_score != ts){
      last_update_score = ts;
      scores = estimateScores();
    }
    broadcastProgressUpdate(i*batchSize, n*batchSize, startTime, scores, i);
    await doBatch(network, batchSize, imageGetter);
    await delay(0); // necessary to allow for interrupt with STOP_SIGNAL, this add the continuation to the queue.
    if (STOP_SIGNAL) {
      STOP_SIGNAL = false;
      console.warn("Stop signal received");
      break;
    }
  }
  broadcastTrainingComplete();
}

async function doBatch(network, batchSize, imageGetter) {
  // Initialize gradients for batch processing
  network.layers.forEach(layer => {
    layer.neurons.forEach(neuron => {
      neuron.weightGradientsSum = new Array(neuron.weights.length).fill(0);
      neuron.biasGradientSum = 0;
      neuron.countGradientUpdates = 0;
    });
  });

  // Process each example in the batch
  let averageLoss = 0;
  let count = 0;
  for (let j = 0; j < batchSize; j++) {
    const imageData = imageGetter();
    let input = imageData.image;
    let label = imageData.label;

    // Backward pass, accumulate gradients
    let outputs = network.computeInternals(input);
    let outputGradients = _computeFinalLossGradient(outputs, label);
    /*    
    let outputGradients = [];
    for (let k = 0; k < outputs[outputs.length - 1].length; k++) {
      const output = outputs[outputs.length - 1][k];
      const target = k === label ? 1 : 0;
      outputGradients.push((output - target) * (output > 0 ? 1 : 0));
      // const target = k === label ? 1 : -1;
      // outputGradients.push(Math.abs(output - target));
    }
    */    
    const loss = outputGradients.reduce((sum, gradient) => sum + gradient ** 2, 0) / 2;
    averageLoss = (loss / ++count) + (averageLoss * (count - 1) / count);
    for (let k = network.layers.length - 1; k >= 0; k--) {
      const layer = network.layers[k];
      // NOTE: the `true` in the following line means accumulate gradients, don't apply them
      outputGradients = layer.backward(outputs[k], outputGradients, null/*learning rate*/, true);
    }
  }
  // Update weights and biases based on accumulated gradients
  const learningRate = dynamicLearningRate(averageLoss, Math.log10(batchSize));
  const lossTextBar = `*`.repeat(Math.round(averageLoss*100));
  //console.debug(`loss: ${averageLoss.toFixed(3)}`, `learning rate: ${learningRate.toFixed(3)}`, lossTextBar);
  network.layers.forEach(layer => {
    layer.neurons.forEach(neuron => {
      neuron.weights = neuron.weights.map((weight, index) => weight - learningRate * neuron.weightGradientsSum[index] / neuron.countGradientUpdates);
      neuron.bias -= learningRate * neuron.biasGradientSum / neuron.countGradientUpdates;
    });
  });
}

function getBackProp(network, input, label) {
  // Initialize gradients for "batch" processing
  network.layers.forEach(layer => {
    layer.neurons.forEach(neuron => {
      neuron.weightGradientsSum = new Array(neuron.weights.length).fill(0);
      neuron.biasGradientSum = 0;
    });
  });

  // Backward pass, accumulate gradients
  let outputs = network.computeInternals(input);
  let outputGradients = _computeFinalLossGradient(outputs, label);
  const loss = outputGradients.reduce((sum, gradient) => sum + gradient ** 2, 0) / 2;
  for (let k = network.layers.length - 1; k >= 0; k--) {
    const layer = network.layers[k];
    // NOTE: the `true` in the following line means accumulate gradients, don't apply them
    outputGradients = layer.backward(outputs[k], outputGradients, null/*learning rate*/, true);
  }
  const to_ret = []
  network.layers.forEach((layer) => {
    const ret_layer = [];
    to_ret.push(ret_layer);
    layer.neurons.forEach((neuron) => {
      ret_layer.push({
        weight_grads: neuron.weightGradientsSum,
        bias_grad: neuron.biasGradientSum,
      })
    });
  });
  return {
    loss:loss, gradients:to_ret
  };
}


function _computeFinalLossGradient(outputs, label) {
  const lossGradient = [];
  //pressure should be between -1 (output irrelevant) to 1 (all values relevant)
  const correct_pressure = .25;
  const incorrect_pressure = .25;
  const n = 5
  _OVERRIDE_ADJUSTMENT = 1 / (1 + (n * correct_pressure) + (n * incorrect_pressure))
  for (let i = 0; i < outputs[outputs.length - 1].length; i++) {
    const output = outputs[outputs.length - 1][i];
    let target, value, diffrence;
    if (i === label) {
      target = 1+correct_pressure;
      value = Math.max(0, output + correct_pressure);
      difference = (value-target)/(1 + correct_pressure);
    } else {
      target = 0;
      value = Math.max(0, output + incorrect_pressure);
      difference = (value-target)/(1 + incorrect_pressure);
    }
    // setting pressure to 0 definately works. turing up incorrect pressurea bit makes for more obvious neuron inner workings.
    // lossGradient.push(difference);
    lossGradient.push(difference);
  }
  //console.log(lossGradient.map((e) => e.toFixed(2)));
  return lossGradient;
}


/* STORAGE */

function loadSavedNetwork(layers){
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
  }
  console.log("loaded new network weights", layers, network);
}


function resetWeights() {
  network.resetWeights();
  broadcastNetworkUpdate();
}

function dampenWeights() {
  network.dampenWeights();
  broadcastNetworkUpdate();
}


/* IMAGE STORAGE */

function getCurrentImage() {
  return {
    image: currentInput,
    label: currentLabel,
    index: currentImageIndex,
  }
}

function getImageByIndex(index){
  if (index < 0 || index >= MNIST_TEST.length) return;
  const im = MNIST_TEST[index].image.map((x)=>x/255);
  return {
    image: im,
    label: MNIST_TEST[index].label,
    index: index,
    vec: imageToSVVec(im)
  }
}

function getRandomImage() {
  const validDigits = currentDigits;
  if (validDigits.length === 0) {
    return {
      image: Array(784).fill(0),
      label: -1
    }
  }
  let index = Math.floor(Math.random() * MNIST_TEST.length);
  while (!validDigits.includes(MNIST_TEST[index].label)) {
    index = Math.floor(Math.random() * MNIST_TEST.length);
  }
  return getImageByIndex(index);
}


/* UTIL */

// compute accuracy, recall, and f1 score
function estimateScores() {
  const sampleSize = 100;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;
  for (let i = 0; i < sampleSize; i++) {
    let {image, label} = getRandomImage();
    let outputs = network.computeInternals(image)[network.layers.length];
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
  return ({accuracy: (truePositives + trueNegatives) / sampleSize})
}


function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



function serializeNetworkForFrontend(network){
  const net = {}
  net.layers = []
  for (let layer of network.layers){
    const l = {};
    l.neurons = [];
    for (let neuron of layer.neurons){
      const n = {
        weights: neuron.weights,
        bias: neuron.bias,
        inputCount: neuron.inputCount,
      }
      l.neurons.push(n);
    }
    net.layers.push(l);
  }
  net.internals = network.computeInternals(currentInput)
  return net;
}