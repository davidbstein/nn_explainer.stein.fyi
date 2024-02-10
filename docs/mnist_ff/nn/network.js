class Network {
  constructor(inputCount, hiddenLayerSizes, outputCount) {
    this.inputCount = inputCount;
    this.outputCount = outputCount;
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

  dampenWeights() {
    for (let i = 0; i < this.layers.length; i++) {
      for (let j = 0; j < this.layers[i].neurons.length; j++) {
        this.layers[i].neurons[j].weights = this.layers[i].neurons[j].weights.map((w) => w * 0.9);
        this.layers[i].neurons[j].bias *= 0.5;
      }
    }
  }

  changeLayersButRetainWeights(newHiddenLayerSizes) {
    const hiddenLayerSizes = newHiddenLayerSizes.concat(this.outputCount);
    const old_layers = this.layers;
    this.layers = [];
    let prevLayerSize = this.inputCount;
    for (let i = 0; i < hiddenLayerSizes.length; i++) {
      const layer = new Layer(hiddenLayerSizes[i], prevLayerSize);
      console.log(layer, hiddenLayerSizes[i], prevLayerSize);
      const old_layer = old_layers[i];
      for (let j = 0; j < layer.neurons.length; j++){
        const neuron = layer.neurons[j];
        const old_neuron = old_layer?.neurons[j];
        neuron.bias = old_neuron?.bias || neuron.bias;
        neuron.weights = neuron.weights.map((weight, count) => {
          return old_neuron?.weights[count] || weight;
        })
      }
      this.layers.push(layer);
      prevLayerSize = hiddenLayerSizes[i];
    }
  }
}
