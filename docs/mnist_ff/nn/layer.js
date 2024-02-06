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
