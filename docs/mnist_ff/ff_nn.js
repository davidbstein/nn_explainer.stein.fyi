class Neuron {
  constructor(inputCount) {
    this.weights = [];
    for (let i = 0; i < inputCount; i++) {
      this.weights.push((Math.random() * 2 - 1)/2);
    }
    this.bias = 0;
    if (window.METHOD=="sigmoid") {
      this.forward= this.forwardSigmoid;
      this.backward= this.backwardSigmoid;
    } else if (window.METHOD=="relu") {
      this.forward = this.forwardReLU;
      this.backward = this.backwardReLU;
    } else if (window.METHOD=="tanh") {
      this.forward = this.forwardTanh; // Use the forwardTanh activation function
      this.backward = this.backwardTanh; // Use the backwardTanh activation function
    } else {
      throw new Error("Invalid window.METHOD");
    }
  }

  forwardTanh(inputs) {
    // tanh activation function
    let sum = 0;
    for (let i = 0; i < inputs.length; i++) {
      sum += inputs[i] * this.weights[i];
    }
    sum += this.bias;
    return Math.tanh(sum);
  }

  backwardTanh(inputs, outputGradient, learningRate, accumulateGradients = false) {
    let weightedSum = inputs.reduce((sum, input, i) => sum + input * this.weights[i], this.bias);
    let tanhDerivative = 1 - Math.tanh(weightedSum) ** 2;
    let weightedSumGradient = outputGradient * tanhDerivative;
    let biasGradient = weightedSumGradient;
    let weightGradients = this.weights.map((_, i) => weightedSumGradient * inputs[i]);

    // Accumulate gradients if specified
    if (accumulateGradients) {
      this.weightGradientsSum = this.weightGradientsSum.map((sum, index) => sum + weightGradients[index]);
      this.biasGradientSum += biasGradient;
    } else {
      // Apply weight and bias updates directly
      for (let i = 0; i < this.weights.length; i++) {
        this.weights[i] -= learningRate * weightGradients[i];
      }
      this.bias -= learningRate * biasGradient;
    }

    let inputGradients = this.weights.map(weight => weightedSumGradient * weight);  
    return inputGradients;
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
  backwardSigmoid(inputs, outputGradient, learningRate, accumulateGradients = false) {
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

  backwardReLU(inputs, outputGradient, learningRate, accumulateGradients = false) {
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

  backward(inputs, outputGradients, learningRate, accumulateGradients = false) {
    let inputGradients = [];
    for (let i = 0; i < inputs.length; i++) {
      inputGradients.push(0);
    }
    for (let i = 0; i < this.neurons.length; i++) {
      let neuronInputGradients = this.neurons[i].backward(
        inputs,
        outputGradients[i],
        learningRate,
        accumulateGradients
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

  /**
   * @param {*} inputs a 784-element array of numbers between 0 and 1 representing a drawing of a digit
   * @returns a nested array of the outputs of each layer of the network (including the input layer)
   */
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

  resetWeights() {
    for (let i = 0; i < this.layers.length; i++) {
      for (let j = 0; j < this.layers[i].neurons.length; j++) {
        this.layers[i].neurons[j].weights = this.layers[i].neurons[j].weights.map(() => (Math.random() * 2 - 1)/2);
        this.layers[i].neurons[j].bias = 0;
      }
    }
  }

  changeLayersButRetainWeights(newHiddenLayerSizes) {
    console.log(newHiddenLayerSizes)
    let oldLayers = this.layers;
    this.layers = [];
    let prevLayerSize = oldLayers[0].neurons[0].weights.length;
    for (let i = 0; i < newHiddenLayerSizes.length; i++) {
      let layer = new Layer(newHiddenLayerSizes[i], prevLayerSize);
      this.layers.push(layer);
      prevLayerSize = newHiddenLayerSizes[i];
    }
    this.layers.push(new Layer(10, prevLayerSize));
    for (let i = 0; i < this.layers.length; i++) {
      for (let j = 0; j < this.layers[i].neurons.length; j++) {
        if (oldLayers.length > i && oldLayers[i].neurons.length > j) {
          this.layers[i].neurons[j].weights = oldLayers[i].neurons[j].weights;
          this.layers[i].neurons[j].bias = oldLayers[i].neurons[j].bias;
        }
      }
    }
  }
}

function dynamicLearningRate(loss, maxRate=10, decayRate=1){
  // //exponential decay
  // const a = maxRate;
  // const b = decayRate;
  // const x = loss;
  // return a * Math.exp(-b * x);
  return Math.min(loss * loss/decayRate, maxRate);
}

async function doBatch(batchSize, imageGetter) {
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
  learningRate = dynamicLearningRate(averageLoss, Math.log10(batchSize), .01);
  const lossTextBar = `*`.repeat(Math.round(averageLoss*100));
  console.log(`loss: ${averageLoss.toFixed(3)}`, `learning rate: ${learningRate.toFixed(3)}`, lossTextBar);
  network.layers.forEach(layer => {
    layer.neurons.forEach(neuron => {
      neuron.weights = neuron.weights.map((weight, index) => weight - learningRate * neuron.weightGradientsSum[index] / batchSize);
      neuron.bias -= learningRate * neuron.biasGradientSum / batchSize;
    });
  });
}
