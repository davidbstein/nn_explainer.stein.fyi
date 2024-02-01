load_module("./nn/neuron.js")
load_module("./nn/layer.js")
load_module("./nn/network.js")


function dynamicLearningRate(loss, maxRate=.5, decayRate=1){
  // //exponential decay
  // const a = maxRate;
  // const b = decayRate;
  // const x = loss;
  // return a * Math.exp(-b * x);
  const rate = Math.min(loss * loss/decayRate, maxRate);
  if (window.OVERRIDE_RATE > 0) return rate * window.OVERRIDE_RATE;
  return rate;
}


// in window, the mnist_demo has created a network object

async function doBatch(network, batchSize, imageGetter) {
  // Initialize gradients for batch processing
  network.layers.forEach(layer => {
    layer.neurons.forEach(neuron => {
      neuron.weightGradientsSum = new Array(neuron.weights.length).fill(0);
      neuron.biasGradientSum = 0;
    });
  });

  // Process each example in the batch
  let averageLoss = 0;
  let count = 0;
  for (let j = 0; j < batchSize; j++) {
    const imageData = imageGetter();
    let input = imageData.image.map(x => x / 255);
    let label = imageData.label;

    // Backward pass, accumulate gradients
    let outputs = network.computeInternals(input);
    let outputGradients = [];
    for (let k = 0; k < outputs[outputs.length - 1].length; k++) {
      const output = outputs[outputs.length - 1][k];
      const target = k === label ? 1 : 0;
      outputGradients.push((output - target) * (output > 0 ? 1 : 0));
      // const target = k === label ? 1 : -1;
      // outputGradients.push(Math.abs(output - target));
    }
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
  console.info(`loss: ${averageLoss.toFixed(3)}`, `learning rate: ${learningRate.toFixed(3)}`, lossTextBar);
  network.layers.forEach(layer => {
    layer.neurons.forEach(neuron => {
      neuron.weights = neuron.weights.map((weight, index) => weight - learningRate * neuron.weightGradientsSum[index] / batchSize);
      neuron.bias -= learningRate * neuron.biasGradientSum / batchSize;
    });
  });
}


window.OVERRIDE_RATE = 2.5;