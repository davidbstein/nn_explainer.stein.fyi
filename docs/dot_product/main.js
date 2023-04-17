class VectorVisualizer {
  constructor() {
    this.origin = createVector(width / 2, height / 2);
    this.orangeVector = createVector(150, -80);
    this.blueVector = createVector(-50, 120);
    this.isDrawing = false;
    this.currentVector = null;
  }

  draw() {
    background(0);
    this.drawCoordinatePlane();

    const overOrangeVector = dist(mouseX, mouseY, this.origin.x + this.orangeVector.x, this.origin.y + this.orangeVector.y) < 10;
    const overBlueVector = dist(mouseX, mouseY, this.origin.x + this.blueVector.x, this.origin.y + this.blueVector.y) < 10;

    if (overOrangeVector || overBlueVector) {
      cursor(MOVE);
    } else {
      cursor(ARROW);
    }

    if (this.isDrawing && this.currentVector) {
      this.currentVector.x = mouseX - this.origin.x;
      this.currentVector.y = mouseY - this.origin.y;
    }

    this.drawArrow(this.origin, p5.Vector.add(this.origin, this.orangeVector), color(255, 165, 0));
    this.drawArrow(this.origin, p5.Vector.add(this.origin, this.blueVector), color(0, 0, 255));

    strokeWeight(1);
    this.drawTriangle(this.orangeVector, this.blueVector, 2, [255, 165, 0]);
    this.drawTriangle(this.blueVector, this.orangeVector, 2, [0, 0, 255]);
    this.drawNumbers();
  }

  drawTriangle(v1, v2, weight, rgb) {
    const projection = p5.Vector.mult(v2, v1.dot(v2) / v2.magSq());
    const a = projection;
    const b = v1;
    const c = this.origin;
    stroke(color(rgb[0], rgb[1], rgb[2], 128));
    strokeWeight(weight);
    line(a.x + c.x, a.y + c.y, b.x + c.x, b.y + c.y);

    // stroke(color(rgb[0], rgb[1], rgb[2]));
    stroke(color(255, 0, 0, 128))
    line(c.x, c.y, a.x + c.x, a.y + c.y);
  }

  drawNumbers() {
    const ov_x = parseInt(this.orangeVector.x);
    const bv_x = parseInt(this.blueVector.x);
    const ov_y = -parseInt(this.orangeVector.y);
    const bv_y = -parseInt(this.blueVector.y);
    document.querySelector('#orange-x-val').innerHTML = ov_x;
    document.querySelector('#orange-y-val').innerHTML = ov_y;
    document.querySelector('#blue-x-val').innerHTML = bv_x;
    document.querySelector('#blue-y-val').innerHTML = bv_y;
    document.querySelector('#dp-val').innerHTML = (ov_x * bv_x) + (ov_y * bv_y);
  }

  drawCoordinatePlane() {
    stroke(255); // white pen
    strokeWeight(1);
    line(width / 2, 0, width / 2, height);
    line(0, height / 2, width, height / 2);
  }

  drawArrow(base, vec, col, weight=4, arrow=true) {
    stroke(col);
    strokeWeight(weight);
    line(base.x, base.y, vec.x, vec.y);
    if (!arrow) return;
    push();
    translate(vec.x, vec.y);
    let angle = atan2(vec.y - base.y, vec.x - base.x);
    rotate(angle);
    let arrowSize = 10;
    fill(col);
    triangle(-arrowSize, arrowSize / 2, -arrowSize, -arrowSize / 2, 0, 0);
    pop();
  }

  mousePressed() {
    if (dist(mouseX, mouseY, this.origin.x + this.orangeVector.x, this.origin.y + this.orangeVector.y) < 10) {
      this.currentVector = this.orangeVector;
      this.isDrawing = true;
    } else if (dist(mouseX, mouseY, this.origin.x + this.blueVector.x, this.origin.y + this.blueVector.y) < 10) {
      this.currentVector = this.blueVector;
      this.isDrawing = true;
    }
  }

  mouseReleased() {
    this.isDrawing = false;
  }
}

let vectorVisualizer;

function setup() {
  const canvas = createCanvas(600, 600);
  canvas.parent('target');
  vectorVisualizer = new VectorVisualizer();
}

function draw() {
  vectorVisualizer.draw();
}

function mousePressed() {
  vectorVisualizer.mousePressed();
}

function mouseReleased() {
  vectorVisualizer.mouseReleased();
}
