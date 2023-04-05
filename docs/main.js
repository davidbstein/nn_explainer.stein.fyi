const neuronLookup = {};


function sigmoid(x) {
  return x > 0 ? x : 0;
}

function getCenterCoordinates(div) {
    const rect = div.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return { x, y };
}

function update_line(input_div, output_div, line_object) {
    // Calculate the center points of the divs
    const outputCenter = getCenterCoordinates(output_div);
    const inputCenter = getCenterCoordinates(input_div);

    // Update the line
    line_object
        .attr("x1", outputCenter.x + output_div.offsetWidth / 2)
        .attr("y1", outputCenter.y)
        .attr("x2", inputCenter.x - input_div.offsetWidth / 2)
        .attr("y2", inputCenter.y);
}

function connect_divs(input_div, output_div, callback) {
    // Calculate the center points of the divs
    const outputCenter = getCenterCoordinates(output_div);
    const inputCenter = getCenterCoordinates(input_div);

    // Create an SVG element if it doesn't exist
    let svg = d3.select("body").select(".connection-svg");
    if (svg.empty()) {
        svg = d3.select("body")
            .append("svg")
            .attr("class", "connection-svg")
            .attr("width", window.innerWidth)
            .attr("height", window.innerHeight)
            .style("position", "absolute")
            .style("top", 0)
            .style("left", 0)
            .style("pointer-events", "none");
    }

    // Draw the line
    const line = svg.append("line")
        .attr("x1", outputCenter.x + output_div.offsetWidth / 2)
        .attr("y1", outputCenter.y)
        .attr("x2", inputCenter.x - input_div.offsetWidth / 2)
        .attr("y2", inputCenter.y)
        .attr("stroke", "blue");

    attachCallbackToLine(line, callback);

    return line
}

function attachCallbackToLine(line, callback) {
    line
        .style("cursor", "pointer")
        .on("mouseover", () => {
            line.attr("stroke", "red");
        })
        .on("mouseout", () => {
            line.attr("stroke", "blue");
        })
        .on("click", () => {
            callback();
        });
}

class InputConnection {
  constructor(input_neuron, output_neuron){
    this.weight = 1;
    this.bias = 0;
    this.input_neuron = input_neuron;
    this.output_neuron = output_neuron;
    this.createUI();
    this.rerender = _.throttle(this.rerender, 50, {leading: true});
    this.rerender();
    this.drawConnections = _.throttle(this.drawConnection, 200, {leading: true})
    this.drawConnection()
    this.deleteConnection = this._deleteConnection.bind(this._deleteConnection, this);
  }

  _deleteConnection() {
    // Remove the connection from the input neuron's output_connections
    const inputOutputConnections = this.input_neuron.output_connections;
    const inputIndex = inputOutputConnections.indexOf(this);
    if (inputIndex > -1) {
      inputOutputConnections.splice(inputIndex, 1);
    }

    // Remove the connection from the output neuron's input_connections
    const outputInputConnections = this.output_neuron.input_connections;
    const outputIndex = outputInputConnections.indexOf(this);
    if (outputIndex > -1) {
      outputInputConnections.splice(outputIndex, 1);
    }

    // Remove the line from the SVG
    this.line.remove();

    // Remove the connection UI elements
    this.container.remove();
  }

  drawConnection() {
    const input_div = this.weightSlider.node()
    const output_div = this.input_neuron.output_view.node();
    if (this.line) update_line(input_div, output_div, this.line);
    else {
      this.line = connect_divs(input_div, output_div, this.deleteConnection);
    }
  }

  rerender() {
    //this.valueLabel.node().innerHTML = `value: ${this.input_neuron.output}`
    this.weightLabel.node().innerHTML = `<span class='incoming-val'>${this.input_neuron.output.toFixed(2)}</span> x ${this.weight.toFixed(2)}`;
  }

  getValue () {
    return this.weight * this.input_neuron.output;
  }

  propogate() {
    this.output_neuron.update();
    this.rerender();
  }

  createUI() {
    // add sliders
    const output_node_container = this.output_neuron.input_container
    const container = output_node_container.append("div").attr("class", "input-weight-view")
    this.container = container;
    this.valueLabel = container.append('div')
          .attr('class', 'value-label');

    const weightSlider = container.append("div")
      .attr("class", "slider-container");

    weightSlider.append('input')
      .attr('type', 'range')
      .attr('class', 'slider')
      .attr('min', -50)
      .attr('max', 50)
      .attr('value', this.bias)
      .on('input', (event) => {
        this.weight = +event.target.value / 10;
        this.output_neuron.update();
        this.rerender();
      });

    this.weightLabel = container.append('div')
      .attr('class', 'slider-label');

    weightSlider.on('mousedown', (event) => {
      event.stopPropagation();
    });
    this.weightSlider = weightSlider;
  }
}

// Define the Neuron class
class Neuron {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.input_connections = [];
    this.output_connections = [];
    this.output = 0;
    this.input_container;
    this.id = `neuron-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    neuronLookup[this.id] = this;
    this.bias = Math.floor(Math.random() * 10) - 5;
    this.createUI();
    this.rerender = _.throttle(this.rerender, 200, {leading: true});
    this.drawConnections = _.throttle(this.drawConnections, 500, {leading: true})
    this.update();
  }

  drawConnections() {
    this.input_connections.map((connection) => connection.drawConnection());
    this.output_connections.map((connection) => connection.drawConnection());
  }

  rerender() {
    //TODO: update after a drag event or recomputation.
    // rate-limited to avoid issues using underscore.js
    this.graph.selectAll('*').remove();
    drawSigmoidGraph(this.graph, this.calculateInput());
    const sign = this.bias == 0 ? "" : this.bias > 0 ? "+" : "-";
    this.biasLabel.node().innerHTML = `Shift by ${sign} ${Math.abs(this.bias)}`;
    this.output_view.node().innerHTML = (`output: ${this.output.toFixed(2)}`)
  }

  // Create the neuron UI elements
  createUI() {
    // Create the neuron box
    const neuron = d3.select('#neuron-container')
      .append('div')
      .attr('class', 'neuron connectable')
      .style('left', this.x + 'px')
      .style('top', this.y + 'px');


    // Create the sigmoid graph
    this.input_connections_view = neuron.append("div").attr("class", "inputs-view")
    this.input_container = this.input_connections_view.append("div").attr("class", "input-connections-container");
    this.input_connections_view.insert('button')
      .attr('class', 'input-connection-button')
      .attr('data-neuron-id', this.id)
      .text('connect here')
      .style('display', 'none');
    const biasSlider = this.input_connections_view.append("div")
      .attr("class", "slider-container");

    biasSlider.append('input')
      .attr('type', 'range')
      .attr('class', 'slider')
      .attr('min', -10)
      .attr('max', 10)
      .attr('value', this.bias)
      .on('input', (event) => {
        this.bias = +event.target.value/2;
        this.update();
      });

    this.biasLabel = biasSlider.append('div')
      .attr('class', 'slider-label')
      .text('offset');

    biasSlider.on('mousedown', (event) => {
      event.stopPropagation();
    });

    const output_container = neuron.append("div").attr("class", "output-container")
    const graph = output_container.append('svg')
      .attr('class', 'graph')
      .attr('viewBox', '0 0 100 100');
    this.graph = graph;
    this.output_container = output_container;
    this.output_view = output_container.append("div").attr("class", "output-view")

    const line = d3.line()
      .x((d, i) => i)
      .y((d, i) => d);

    const data = d3.range(100).map((d, i) => {
      const x = i / 100 * 10 - 5;
      const y = sigmoid(this.calculateInput + this.bias) * 100;
      return [x, y];
    });

    graph.append('path')
      .datum(data)
      .attr('d', line);

    // Add drag behavior to the neuron
    const drag = d3.drag()
      .on('drag', (event) => {
        this.x += event.dx;
        this.y += event.dy;
        neuron.style('left', this.x + 'px')
              .style('top', this.y + 'px');
        this.drawConnections();
      })
      .on('end', sortInputConnectionsByY)

    neuron.call(drag);

    this.createConnectionButtons()
  }

  isAncestorOrSelf(neuron) {
    if (!neuron) {
      return false;
    }
    if (neuron === this) return true;
    for (const outputConnection of neuron.output_connections) {
        if (this.isAncestorOrSelf(outputConnection.output_neuron)) {
            return true;
        }
    }
    for (const inputConnection of neuron.input_connections) {
      if (inputConnection.input_neuron === this) return true;
    }
    return false;
  }

  createConnectionButtons() {
    // Add an outgoing connection button next to output
    const outputButton = this.output_container.append('button')
      .attr('class', 'output-connection-button')
      .attr('data-neuron-id', this.id) // Add the data-neuron-id attribute here
      .text('connect')
      .on('click', () => {
        // Hide all other output buttons
        d3.selectAll('.output-connection-button')
            .filter(btn => btn !== outputButton.node())
            .attr('disabled', 'disabled');

        // Add the "highlighted" class to the output button
        outputButton
          .classed('highlighted', true)
          .style('display', 'block');

        // Clicking an "input" button creates a new connection
        d3.selectAll('.input-connection-button')
          .filter((d, i, nodes) => {
            const button = nodes[i];
            const neuronId = button.getAttribute('data-neuron-id');
            const inputNeuron = neuronLookup[neuronId];
            return !this.isAncestorOrSelf(inputNeuron);
          })
          .style('display', 'block') // Show allowed input buttons
          .on('click', (event) => {
            const inputNeuron = neuronLookup[event.target.attributes['data-neuron-id'].value];
            inputNeuron.connectInput(this);

            // Reset buttons to steady state
            outputButton.classed('highlighted', false);
            d3.selectAll('.output-connection-button')
              .style('display', 'block')
              .attr('disabled', null);
            d3.selectAll('.input-connection-button')
              .style('display', 'none');
          });
      });

  }

  // Connect an input neuron to this neuron
  connectInput(inputNeuron) {
    const connection = new InputConnection(inputNeuron, this);
    this.input_connections.push(connection);
    inputNeuron.connectOutput(connection);
    this.update();
    this.drawConnections();
  }

  //connect an output neuron to this neuron
  connectOutput(output_connection) {
    this.output_connections.push(output_connection);
    // new output doesn't require an update, just a new input.
  }

  // Calculate the output of this neuron based on its inputs
  calculateOutput() {
    this.output = sigmoid(this.calculateInput());
    return this.output;
  }

  calculateInput() {
    const weighted_inputs = d3.sum(this.input_connections.map(input => input.getValue())) || 0;
    return weighted_inputs + this.bias;
  }

  // Update the UI elements of this neuron
  update() {
    const graph = d3.select(this.el).select('.graph');

    const data = d3.range(100).map((d, i) => {
      const x = i / 100 * 10 - 5;
      const y = sigmoid(x, this.weight, this.bias) * 100;
      return [x, y];
    });

    const line = d3.line()
    .x((d, i) => i)
    .y((d, i) => d);

    graph.select('path').datum(data).attr('d', line);

    this.output = this.calculateOutput();
    this.output_connections.forEach(output_connection => output_connection.propogate());

    this.rerender();
  }

}

function sortInputConnectionsByY() {
  //TODO
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

_c = 50;

function createNeuron() {
  const n = 200;
    const height = window.innerHeight * (3/4);
    const y = _c % height;
    const x = Math.floor(_c / height) * n;
    _c+=n;
    return new Neuron(x,y);
}


window.onload = function() {
  const container = d3.select('#neuron-container');
  document.querySelector("#neuron-container").innerHTML="<button id='add-neuron'>add neuron</button><button id='reset'>reset</button>";

  const neurons = [];

  for (let i=0; i<4; i++){
    neurons.push(createNeuron());
  }

  // Add a button to create new neurons
  d3.select('#add-neuron').on('click', () => {
    neurons.push(createNeuron());
  });

  // Add a button to reset the neurons and connections
  d3.select('#reset').on('click', () => {
    container.selectAll('.connection').remove();
  });
};
