
function _drawSigmoidGraph(svg, x) {
  // Get the container dimensions
  const container = svg.node().parentNode;
  const containerRect = container.getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;

  // Calculate aspect ratio
  const aspectRatio = 1;
  const viewBoxWidth = 100;
  const viewBoxHeight = 100 * aspectRatio;



  // Define margins, scales, and line generator
  const _m = 0;
  const margin = { top: _m, right: _m, bottom: _m, left: _m };


  const rightBound = viewBoxWidth * aspectRatio - margin.right;


  const xDomain = [-5 * aspectRatio, 5 * aspectRatio];
  const xScale = d3.scaleLinear().domain(xDomain).range([margin.left, rightBound]);
  const yScale = d3.scaleLinear().domain([-0.1, 5.5]).range([viewBoxHeight - margin.bottom, margin.top]);

  const lineGenerator = d3.line()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  // Generate the data points for the sigmoid function
  const data = d3.range(-10 * aspectRatio, 10 * aspectRatio, 0.1).map((input) => {
    return { x: input, y: sigmoid(input) };
  });

  // Create and update the SVG elements for the graph
    svg = d3.select(container)
    .selectAll("svg")
    .data([data])
    .join("svg")
    .attr("width", width)
    .attr("height", height);


  // Draw axes
  const yTickValues = d3.range(0, 5, .5);
  const xAxis = d3.axisBottom(xScale).tickSize(2); // Set tick size to 0
  const yAxis = d3.axisLeft(yScale).tickValues(yTickValues).tickSize(2); // Set tick size to 0

  // Move the x-axis to the center of the graph and style it
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${yScale(0)})`)
    .call(xAxis)
    .selectAll("text")
    .remove();

  // Move the y-axis to the center of the graph and style it
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${xScale(0)}, 0)`)
    .call(yAxis)
    .selectAll("text")
    .remove();


  svg.selectAll(".axis path") // Select axis lines
    .attr("stroke", "grey") // Set the stroke color to faint grey
    .attr("stroke-width", 1); // Set the stroke width


  // Draw the sigmoid curve
  svg.append("path")
    .attr("class", "sigmoid-curve")
    .attr("d", lineGenerator(data))
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 1);

  // Draw the blue vertical line for the input value x
  svg.append('line')
    .attr("class", "input-line")
    .attr('x1', xScale(x))
    .attr('y1', yScale(0))
    .attr('x2', xScale(x))
    .attr('y2', yScale(5))
    .attr('stroke', 'blue')
    .attr('stroke-width', 2);

  // Draw the faint red horizontal line for the output value
  const output = sigmoid(x);
  svg.append("line")
    .attr("class", "output-line")
    .attr("x1", margin.left)
    .attr("y1", yScale(output))
    .attr("x2", rightBound)
    .attr("y2", yScale(output))
    .attr("stroke", "red")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.5);
}


//const drawSigmoidGraph = _.throttle(_drawSigmoidGraph, 50);
const drawSigmoidGraph = _drawSigmoidGraph;