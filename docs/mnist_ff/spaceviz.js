
class SpaceViz {
  /**
   * visualizer that iteratively adds 28x28 digits into a 500px by 500px canvas in the target div
   * each image is placed on a location specified by x and y coordinates between 0 and 1, and is centered at that location
   * images are specified as a 784 number array between 0 and 1, representing an 28x28 image where 0 is black and 1 is white.
   * only non-zero pixels are drawn
   * each image is colored according to the label of the image, labels range from 0 to 9
   */
  constructor(target, n) {
    this.target = target;
    this.canvas = document.createElement("canvas");
    this.canvas.width = 500;
    this.canvas.height = 500;
    this.canvas.style = "width: 500px; height: 500px;";
    this.ctx = this.canvas.getContext("2d");
    this.target.appendChild(this.canvas);
    this.images = [];
    this.projectionMatrix = null;
  }

  getProjectionMatrix() {
    if (this.projectionMatrix === null)
      this.resetProjectionMatrix();
    return this.projectionMatrix;
  }

  resetProjectionMatrix() {
    const n = this.images[0]?.vector?.length;
    if (!n) return;
    let projectionMatrix = [];
    for (let i = 0; i < n; i++) {
      let row = [Math.random(), Math.random()];
      projectionMatrix.push(row);
    }
    this.projectionMatrix = projectionMatrix;
    console.log(`new projection matrix (n=${n}):`, this.projectionMatrix);
  }
  

  /**
   * add an image to the canvas
   * @param {*} image a 784 number array between 0 and 1, representing an 28x28 image where 0 is black and 1 is white
   * @param {*} label the label of the image, between 0 and 9
   * @param {*} x the x coordinate of the image, between 0 and 1
   * @param {*} y the y coordinate of the image, between 0 and 1
   * @param {*} scale the scale of the image, between 0 and 1, default to 1
   */
  addDigit(image, label, vector, scale = 1) {
    this.images.push({
      image: image,
      label: label,
      vector: vector,
      scale: scale
    });
  }

  /**
   * picks a HSV color where V=1, S=1, and H is determined by the label
   * converts to RGB and returns the color
   * @param {*} label a number between 0 and 9 
   * @returns [r, g, b]
   */
  getColor(label) {
    let h = 360 * label / 10;
    let s = 1;
    let v = 1;
    let c = v * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = v - c;
    let rgb = [0, 0, 0];
    if (0 <= h && h < 60) {
      rgb = [c, x, 0];
    } else if (60 <= h && h < 120) {
      rgb = [x, c, 0];
    } else if (120 <= h && h < 180) {
      rgb = [0, c, x];
    } else if (180 <= h && h < 240) {
      rgb = [0, x, c];
    } else if (240 <= h && h < 300) {
      rgb = [x, 0, c];
    } else if (300 <= h && h < 360) {
      rgb = [c, 0, x];
    }
    return [rgb[0] + m, rgb[1] + m, rgb[2] + m];
  }

  /**
   * draw all the images into the canvas
   * @param {*} clear whether to clear the canvas before drawing
   */
  draw(clear = true) {
    if (clear) {
      this.ctx.clearRect(0, 0, 500, 500);
    }
    for (let image of this.images) {
      this.drawDigit(image.image, image.label, image.vector, image.scale);
    }
  }

  drawDigit(image, label, vector, scale=.25) {
    const [x, y] = linearProjection(vector, this.getProjectionMatrix());
    const [r, g, b] = this.getColor(label);
    const imageWidth = 28 * scale;
    const imageHeight = 28 * scale;
    const xPos = x * (this.canvas.width - imageWidth) + imageWidth/2;
    const yPos = y * (this.canvas.height - imageHeight) + imageHeight/2;
    for (let i = 0; i < 28; i++) {
      for (let j = 0; j < 28; j++) {
        const pixelValue = image[i * 28 + j];  
        this.ctx.fillStyle = `rgb(${r * 255}, ${g * 255}, ${b * 255}, ${.2})`;
        if (pixelValue > 0) {
          const pixelX = xPos + j * scale;
          const pixelY = yPos + i * scale;
          const pixelSize = scale;
          this.ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize);
        }
      }
    }
  }
  
  reset() {
    this.images = [];
    this.draw();
  }
}