class Neuron {
  constructor(inputCount) {
    this.weights = [];
    for (let i = 0; i < inputCount; i++) {
      this.weights.push((Math.random() * 2 - 1)/2);
    }
    this.bias = 0;
    this.forward= this.forwardSigmoid;
    this.backward= this.backwardSigmoid;
    // this.forward = this.forwardReLU;
    // this.backward = this.backwardReLU;
  }

  forwardSigmoid(inputs) {
    // sigmoid activation function
    let sum = 0;
    for (let i = 0; i < inputs.length; i++) {
      sum += inputs[i] * this.weights[i];
    }
    sum += this.bias;
    return 1 / (1 + Math.exp(-sum));
  }

  /**
   * @param {*} inputs - the values output by the neurons in the previous layer
   * @param {*} outputGradient - the gradient of the loss function with respect to the output of this neuron
   * @param {*} learningRate - the learning rate
   * @returns the gradient of the loss function with respect to the inputs of this neuron
   */
  backwardSigmoid(inputs, outputGradient, learningRate) {
    let weightedSum = inputs.reduce((sum, input, i) => sum + input * this.weights[i], this.bias);
    let sigmoidDerivative = (1 / (1 + Math.exp(-weightedSum))) * (1 - 1 / (1 + Math.exp(-weightedSum)));
    let weightedSumGradient = outputGradient * sigmoidDerivative;
    let biasGradient = weightedSumGradient;
    this.bias -= learningRate * biasGradient;
    let weightGradients = this.weights.map((_, i) => weightedSumGradient * inputs[i]);
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] -= learningRate * weightGradients[i];
    }
    let inputGradients = this.weights.map(weight => weightedSumGradient * weight);  
    return inputGradients;
  }

  forwardReLU(inputs) {
    let sum = 0;
    for (let i = 0; i < inputs.length; i++) {
      sum += inputs[i] * this.weights[i];
    }
    sum += this.bias;
    return Math.max(0, sum);
  }

  backwardReLU(inputs, outputGradient, learningRate) {
    let weightedSum = inputs.reduce((sum, input, i) => sum + input * this.weights[i], this.bias);
    let reluDerivative = weightedSum > 0 ? 1 : 0;
    let weightedSumGradient = outputGradient * reluDerivative;
    let biasGradient = weightedSumGradient;
    this.bias -= learningRate * biasGradient;
    let weightGradients = this.weights.map((_, i) => weightedSumGradient * inputs[i]);
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] -= learningRate * weightGradients[i];
    }
    let inputGradients = this.weights.map(weight => weightedSumGradient * weight);
    return inputGradients;
  }

  toString() {
    return JSON.stringify({
      weights: this.weights,
      bias: this.bias,
    });
  }
}

class Layer {
  constructor(neuronCount, inputCount) {
    this.neurons = [];
    for (let i = 0; i < neuronCount; i++) {
      let neuron = new Neuron(inputCount);
      this.neurons.push(neuron);
    }
  }

  forward(inputs) {
    let outputs = [];
    for (let i = 0; i < this.neurons.length; i++) {
      outputs.push(this.neurons[i].forward(inputs));
    }
    return outputs;
  }

  backward(inputs, outputGradients, learningRate) {
    let inputGradients = [];
    for (let i = 0; i < inputs.length; i++) {
      inputGradients.push(0);
    }
    for (let i = 0; i < this.neurons.length; i++) {
      let neuronInputGradients = this.neurons[i].backward(
        inputs,
        outputGradients[i],
        learningRate
      );
      for (let j = 0; j < inputs.length; j++) {
        inputGradients[j] += neuronInputGradients[j];
      }
    }
    return inputGradients;
  }

  toString() {
    let to_ret = `Layer <${this.neurons.length} neurons>`
    for (let i = 0; i < this.neurons.length; i++) {
      to_ret += this.neurons[i].toString()
    }
    return to_ret;
  }
}

class Network {
  constructor(inputCount, hiddenLayerSizes, outputCount) {
    this.layers = [];
    let prevLayerSize = inputCount;
    for (let i = 0; i < hiddenLayerSizes.length; i++) {
      let layer = new Layer(hiddenLayerSizes[i], prevLayerSize);
      this.layers.push(layer);
      prevLayerSize = hiddenLayerSizes[i];
    }
    this.layers.push(new Layer(outputCount, prevLayerSize));
  }

  computeInternals(inputs) {
    let to_ret = [inputs];
    let outputs = inputs;
    for (let i = 0; i < this.layers.length; i++) {
      outputs = this.layers[i].forward(outputs);
      to_ret.push(outputs);
    }
    return to_ret;
  }

  forward(inputs) {
    return this.computeInternals(inputs)[this.layers.length - 1];
  }

  backward(inputs, label, learningRate) {
    let targetOutput = []
    for (let i = 0; i < 10; i++) {
      targetOutput.push(i===label ? 1 : 0);
    }
    let outputs = this.computeInternals(inputs);
    let outputGradients = [];
    for (let i = 0; i < outputs[outputs.length - 1].length; i++) {
      const output = outputs[outputs.length - 1][i];
      const target = targetOutput[i];
      outputGradients.push((output - target) * (output > 0 ? 1 : 0));
    }
    for (let i = this.layers.length - 1; i >= 0; i--) {
      outputGradients = this.layers[i].backward(
        outputs[i],
        outputGradients,
        learningRate
      );
    }
  }
}

function drawNeuronWeights(target, weights, width, height) {
  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
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

/**
 * draws the output of the network into the "output" div, represented as a column of 10 circles, colored black if the probability is 0, and white if the probability is 1.
 * each circle is labeled with the probability of that digit, formatted to 2 decimal places.
 * @param {*} outputs - a 10 number array between 0 and 1, representing the probability of each digit 
 */
function drawOutput(outputs) {
  target = document.getElementById("output");
  for (let i = 0; i < 10; i++) {
    let div = document.createElement("div");
    let outputColor = Math.min(outputs[i], 1);
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
 * @param {*} redraw callback to re-render the input image
 */
function instrumentInputImage(redraw){
  for (let elem of document.querySelectorAll(".input-pixel")) {
    elem.addEventListener("mouseover", (e) => {
      const mouseDown = window.mouseDown;
      const pixelData = window.currentInput;    
      let delta = -.15;
      if (mouseDown) {
        delta = 0.05;
      }
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
  const hiddenTarget = document.getElementById("hidden-layers");
  const outputTarget = document.getElementById("output");
  inputTarget.innerHTML = "";
  hiddenTarget.innerHTML = "";
  outputTarget.innerHTML = "";
  drawInputImage(inputTarget, inputs);
  let layerOutputs = network.computeInternals(inputs);
  for (let i = 0; i < network.layers.length; i++) {
    drawHiddenLayer(hiddenTarget, network.layers[i], layerOutputs[i+1]);
  }
  drawOutput(layerOutputs[layerOutputs.length - 1]);
}




window.onload = async function () {

  // setup a network that takes 784 inputs and outputs 10 values. 
  // By default has 2 hidden layers with 16 neurons each, but this can be overridden by including a comma separated list of numbers in the url (e.g. ?layers=8,8,8)
  let layers = [8, 8];
  if (window.location.search) {
    layers = window.location.search.substring(1).split(",").map(x => parseInt(x));
  }
  let network = new Network(784, layers, 10);

  // data is in a json file at /mnist_handwritten_train.json, which is a list of objects of the form {image: [784 ints, between 0 and 255], label: [int, between 0 and 9]}
  let data = MNIST_TEST;

  function loadRandomImage() {
    let index = Math.floor(Math.random() * data.length);
    window.currentInput = data[index].image.map(x => x / 255);
    window.currentLabel = data[index].label;
    redraw();
  }

  function clearImage() {
    let index = Math.floor(Math.random() * data.length);
    window.currentInput = data[index].image.map(x => 0);
    window.currentLabel = data[index].label;
    redraw();
  }

  function redraw(){
    drawNetwork(network, currentInput);
    instrumentInputImage(redraw);
  }

  function updateWeights(n) {
    for (let i = 0; i < n; i++) {
      let learningRate = window.LEARNING_RATE;
      network.backward(window.currentInput, window.currentLabel, learningRate);
    }
    redraw();
  }

  function train(n) {
    console.log(`training for ${n} iterations...`)
    for (q of document.querySelectorAll("button")) {
      q.disabled = true;
    }
    const progressbar = document.getElementById("progress-bar-filler");
    for (let i = 0; i < n; i++) {
      let index = Math.floor(Math.random() * data.length);
      let input = data[index].image.map(x => x / 255);
      let label = data[index].label;
      let learningRate = window.LEARNING_RATE;
      network.backward(input, label, learningRate);
    }
    loadRandomImage();
    redraw();

    for (q of document.querySelectorAll("button")) {
      q.disabled = false;
    }
    console.log("done training!")
  }

  window.mouseDown = false;
  document.body.addEventListener("mousedown", () => window.mouseDown = true);
  document.body.addEventListener("mouseup", () => window.mouseDown = false);

  document.getElementById("load-random-image").addEventListener("click", loadRandomImage);
  document.getElementById("clear-image").addEventListener("click", clearImage);
  document.getElementById("update-weights").addEventListener("click", () => updateWeights(1));
  document.getElementById("update-weights-1000").addEventListener("click", () => updateWeights(10000));
  document.getElementById("train-1").addEventListener("click", () => train(1));
  document.getElementById("train-1000").addEventListener("click", () => train(1000));
  document.getElementById("train-100000").addEventListener("click", () => train(10000));
  window.LEARNING_RATE = .1;
  loadRandomImage();
}