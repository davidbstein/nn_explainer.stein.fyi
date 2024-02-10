let METHOD = 'tanh';

class Neuron {
  constructor(inputCount) {
    this.weights = [];
    for (let i = 0; i < inputCount; i++) {
      this.weights.push((Math.random() * 2 - 1)/2);
    }
    this.bias = 0;
    if (METHOD=="sigmoid") {
      this.forward= this.forwardSigmoid;
      this.backward= this.backwardSigmoid;
    } else if (METHOD=="relu") {
      this.forward = this.forwardReLU;
      this.backward = this.backwardReLU;
    } else if (METHOD=="tanh") {
      this.forward = this.forwardTanh; // Use the forwardTanh activation function
      this.backward = this.backwardTanh; // Use the backwardTanh activation function
    } else {
      throw new Error("Invalid METHOD");
    }
  }

  forwardTanh(inputs) {
    // tanh activation function
    // if you forgot to serialize the network, this is the line that shows up in the logs, because it's the first function to be unserializable.
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