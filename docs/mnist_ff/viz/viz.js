function easingFn(x) {
  const eased = -1 / 2 * (Math.cos(Math.PI * x) - 1);
  return Math.min(eased*1.3, 1);
};

function getColor(color_1, color_2, value, _easingFn=easingFn) {
  //let color = Math.floor(Math.abs(weight) * 255);
  let alpha = Math.floor(_easingFn(Math.abs(value))*255);
  //let color = Math.floor((weight * weight) * 255);
  const to_ret = [0,0,0,0];
  if (value > 0) {
    to_ret[0] = color_1[0];
    to_ret[1] = color_1[1];
    to_ret[2] = color_1[2];
    to_ret[3] = alpha;
  } else {
    to_ret[0] = color_2[0];
    to_ret[1] = color_2[1];
    to_ret[2] = color_2[2];
    to_ret[3] = alpha;
  }
  return to_ret;
}

function drawNeuronWeights(target, weights, width, height, color_1=[0,255,0], color_2=[255,0,0], _easingFn=easingFn) {
  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ratio = height/width;
  canvas.style = `width: ${width}em; height: ${height}em;`
  let ctx = canvas.getContext("2d");
  let imageData = ctx.createImageData(width, height);
  let data = imageData.data;
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      let index = (i + j * width) * 4;
      let weight = weights[i + j * width];
      let color = getColor(color_1, color_2, weight, _easingFn);
      data[index + 0] = color[0]
      data[index + 1] = color[1]
      data[index + 2] = color[2]
      data[index + 3] = color[3]
    }
  }
  ctx.putImageData(imageData, 0, 0);
  target.appendChild(canvas);
  return canvas;
}

function drawNeuronGradients(target, loss, gradients){
  // loss is a number
  // gradients is of form [{weight_grads: (784), bias_grad: n}, ...]
  // works with drawNeuronWeights(target, weight_grads, width, height, ...)
  target.innerHTML = "";
  const colors = [[196,128,255], [128, 216, 255], (x) => {
    xx = Math.min(1, x);
    return 1 - ((1 - xx) ** 10)
  }];
  for (let layer of gradients) {
    const layerDiv = document.createElement("div");
    layerDiv.className = "backprop-layer";
    for (let neuron of layer) {
      const neuronDiv = document.createElement("div");
      neuronDiv.className = "backprop-neuron";
      let weightDiv = document.createElement("div");
      weightDiv.className = "neuron-weight";
      if (neuron.weight_grads.length === 784) {
        drawNeuronWeights(weightDiv, neuron.weight_grads, 28, 28, ...colors);
      } else {
        drawNeuronWeights(weightDiv, neuron.weight_grads, 1, neuron.weight_grads.length, ...colors);
      }
      neuronDiv.append(weightDiv);
      layerDiv.append(neuronDiv);
    }
    target.append(layerDiv);
  }
  const lossDiv = document.createElement("div");
  lossDiv.className="total-loss";
  lossDiv.innerHTML=`Loss: <span id='loss-num'>${loss.toFixed(3)}</span>`;
  target.append(lossDiv);
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
function drawNeuron(target, weights, bias, output, inputs) {
  let weightDiv = document.createElement("div");
  weightDiv.className = "neuron-weight";
  let internalsDiv = document.createElement("div");
  internalsDiv.className = "neuron-internals";
  let outputDiv = document.createElement("div");
  outputDiv.className = "neuron-output";

  if (weights.length === 784) {
    drawNeuronWeights(weightDiv, weights, 28, 28);
  } else {
    drawNeuronWeights(weightDiv, weights, 1, weights.length);
  }
  target.appendChild(weightDiv);

  if (inputs) {
    drawNeuronInternals(internalsDiv, weights, bias, output, inputs);
    target.appendChild(internalsDiv);
  }
  //weightDiv.style.borderColor = `rgb(${Math.floor(output * 255)}, ${Math.floor(output * 255)}, ${Math.floor(output * 255)})`;

  if (output) {
    outputDiv.innerHTML = output.toFixed(2);
    const outputColor = getColor([128, 255, 128], [255,128,128], output);
    const bgColor = `rgb(${outputColor.slice(0, 3).map((n) => Math.abs(Math.floor(n * output))).join(',')})`;
    const fgColor = `rgb(${outputColor.slice(0, 3).map((n) => n/2).join(',')}`;
    outputDiv.setAttribute("style", `background-color: ${bgColor}; color: ${fgColor}`);
    target.appendChild(outputDiv);
  }
}

function drawNeuronInternals(target, weights, bias, output, inputs) {
  const scaled = inputs.map((weight, idx) => weight * weights[idx]);
  let inputDiv = document.createElement("div");
  inputDiv.className = "neuron-inputs";
  let valueDiv = document.createElement("div");
  valueDiv.className = "neuron-values";

  const inputColors = [[255, 128, 128], [128, 255, 128]];
  const valueColors = [[255, 64, 64], [64, 255, 64]];

  if (inputs.length === 784) {
    drawNeuronWeights(inputDiv, inputs, 28, 28, inputColors[1], inputColors[0]);
  } else {
    const canvas = drawNeuronWeights(inputDiv, inputs, 1, inputs.length, inputColors[1], inputColors[0]);
    canvas.style.width = ".25em";
  }

  if (scaled.length === 784) {
    drawNeuronWeights(valueDiv, scaled, 28, 28, valueColors[1], valueColors[0], Math.abs);
  } else {
    const canvas = drawNeuronWeights(valueDiv, scaled, 1, scaled.length, valueColors[1], valueColors[0], (w) => (10+Math.abs(w))/10);
    canvas.style.width = ".25em";
  }


  let timesSpan = document.createElement("div");
  timesSpan.innerHTML = "x"
  target.appendChild(timesSpan);
  target.appendChild(inputDiv);
  let eqSpan = document.createElement("div");
  eqSpan.innerHTML = "="
  target.appendChild(eqSpan);
  target.appendChild(valueDiv);
  let biasDiv = document.createElement("div");
  biasDiv.className = "neuron-bias";
  biasDiv.innerHTML = `${bias < 0 ? '+' : '-'}${Math.abs(bias).toFixed(2)}`;
  target.appendChild(biasDiv);
}

/**
 * append a div of class "hidden-layer" to the target div, and draw the neurons of the layer into that div
 * @param {*} target
 * @param {*} layer
 */
function drawHiddenLayer(target, layer, outputs, inputs) {
  let div = document.createElement("div");
  div.className = "hidden-layer";
  for (let i = 0; i < layer.neurons.length; i++) {
    let neuronDiv = document.createElement("div");
    neuronDiv.className = "neuron-viz";
    drawNeuron(neuronDiv, layer.neurons[i].weights, layer.neurons[i].bias, outputs[i], inputs);
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
function drawOutput(target, layer, outputs, inputs) {
  for (let i = 0; i < 10; i++) {
    let div = document.createElement("div");
    let circleDiv = document.createElement("div");
    let val = Math.max(outputs[i], 0);
    let outputColor = Math.min(val, 1);
    outputColor = 1 - (1-outputColor) * (1-outputColor);
    outputColor *= 255;
    drawNeuron(div, layer.neurons[i].weights, layer.neurons[i].bias, outputs[i], inputs);
    circleDiv.innerHTML = (`
      <div class='output-circle' style="background: rgb(${outputColor}, ${outputColor}, ${outputColor});">
        <span style='color:${outputColor < 128 ? "white" : "black"}'>${i}</span>
      </div>
      <div>${outputs[i].toFixed(2)}</div>`
    );
    circleDiv.classList.add("output-circle-container");
    div.append(circleDiv);
    target.append(div);
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
function instrumentInputImage(callback){
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
      callback(pixelData);
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
      pixel.style = `--bgColor: rgb(${pixelData[i * 28 + j] * 255}, ${pixelData[i * 28 + j] * 255}, ${pixelData[i * 28 + j] * 255})`;
      row.appendChild(pixel);
    }
    target.appendChild(row);
  }
}

function fixScalingIssue(){
  const boxHeight = document.getElementById("hidden-layers").clientHeight;
  for (let layerDiv of document.querySelectorAll(".hidden-layer")) {
    const ratio = .9 * boxHeight / layerDiv.clientHeight;
    if (ratio < 1) layerDiv.style.transform = `scale(${ratio})`;
  }
  const outBoxHeight = document.getElementById("hidden-layers-container").clientHeight;
  for (let layerDiv of document.querySelectorAll("#output")) {
    const ratio = .9 * outBoxHeight / layerDiv.clientHeight;
    if (ratio < 1) layerDiv.style.transform = `scale(${ratio})`;

  }
}

window.addEventListener("resize", fixScalingIssue);


/**
 * draw the input layer into the #input-image div,
 * computes the intermediate outputs for the hidden layers and draws them into the #hidden-layers div,
 * draws the output layer into the #output div
 *
 * @param {*} network
 */
function drawNetwork(network, inputs, label) {
  const inputTarget = document.getElementById("input-image");
  const inputLabelTarget = document.getElementById("input-label-value");
  const hiddenTarget = document.getElementById("hidden-layers");
  const outputTarget = document.getElementById("output");
  inputTarget.innerHTML = "";
  inputLabelTarget.innerHTML = label;
  hiddenTarget.innerHTML = "";
  outputTarget.innerHTML = "";
  drawInputImage(inputTarget, inputs);
  let layerOutputs = network.internals;
  for (let i = 0; i < network.layers.length-1; i++) {
    drawHiddenLayer(hiddenTarget, network.layers[i], layerOutputs[i+1], layerOutputs[i]);
  }
  const outputDiv = document.createElement("div");
  drawOutput(outputTarget, network.layers[network.layers.length-1], layerOutputs[layerOutputs.length - 1], layerOutputs[layerOutputs.length - 2]);
  fixScalingIssue();
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
  const progressLabel = document.getElementById("progress-label-n");
  const progressETA = document.getElementById("progress-label-eta");
  //set width of progress bar
  progressBar.style.width = `${progress * 100}%`;
  //set text of progress bar
  let scoreStr = scores ? [
    `accuracy: ${(scores.accuracy*100).toFixed(0)}%`,
  ].join(", ") : "";
  progressLabel.innerHTML = `${(progress*100).toFixed(1)}% (${num} / ${denom})`;
  progressETA.innerHTML = `ETA: ${secondsToString(remaining/1000)}  (${scoreStr}))`;
  //clear progress bar
  progressContainer.style.display = "block";
}

function clearProgressBar(){
  const progressContainer = document.getElementById("progress-container");
  progressContainer.style.display = "none";
}
