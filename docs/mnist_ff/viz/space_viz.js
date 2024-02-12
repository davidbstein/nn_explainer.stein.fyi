const SAMPLE_RATE = 500;
const SAMPLE_N = 50;
const RESAMPLE_POINTER = {n: 0}

class SpaceViz {
  /**
   * visualizer that iteratively adds 28x28 digits into a 500px by 500px canvas in the target div
   * each image is placed on a location specified by x and y coordinates between 0 and 1, and is centered at that location
   * images are specified as a 784 number array between 0 and 1, representing an 28x28 image where 0 is black and 1 is white.
   * only non-zero pixels are drawn
   * each image is colored according to the label of the image, labels range from 0 to 9
   */
  constructor(target, dims=3) {
    console.log(`new projection: ${dims}d`)
    this.target = target;
    this.starttime = Date.now();
    this.images = [];
    this.tsne;
    this.dims = dims;
    if (dims == 3) this.setup3d();
    if (dims == 2) this.setup2d();
  }

  setup2d() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 500;
    this.canvas.height = 500;
    this.canvas.style = "width: 500px; height: 500px;";
    this.ctx = this.canvas.getContext("2d");
    this.target.appendChild(this.canvas);
  }

  async resetProjection() {
    if (this.images.length === 0) return;
    if (this.images[0]?.vector?.length === this.dims) {
      console.log(`projection: already ${this.dims}d`);
      this.tsne = 1;
      return;
    }
    console.log("retraining projection")
    const vectors = this.images.map((img) => img.vector);
    const tsne = new TSNE({
      dim: this.dims,
      perplexity: 2,
      earlyExaggeration: 1,
      learningRate: 200,
      nIter: 100,
      metric: "euclidean",
    });
    this.tsne = tsne;
    tsne.init({
      data: vectors,
      type: "dense",
    });
    let [error, iter] = tsne.run();
    let points = tsne.getOutputScaled().map((point) => point.map((x) => (x/2)+.5));
    this.images.forEach((img, idx) => {
      img.projectedVector = points[idx];
    });
  }

  projectVector(vector) {
    if (!this.tsne || this.countdown_to_rebalance-- <= 0) {
      this.resetProjection();
      this.countdown_to_rebalance = this.images.length;
    }
    if (vector.length === this.dims) {
      return vector.map((x) => (x/2)+.5);
    }
    const projectedPoint = this.images.find((img) => img.vector === vector)?.vector;
    if (projectedPoint) return projectedPoint;

    // reuse the projection of the nearest existing vector
    const nearestVector = this.images.reduce((nearest, img) => {
      const dist = vector.reduce((sum, val, idx) => sum + Math.abs(val - img.vector[idx]), 0);
      return dist < nearest.dist ? { dist: dist, vector: img.vector } : nearest;
    }, { dist: Infinity, vector: null }).vector;
    const projectedNewVector = this.tsne.project(nearestVector, vector);

    // Normalize the projected point to be between 0 and 1
    const normalizedNewVector = [
      (projectedNewVector[0] - Math.min(...this.images.map((img) => img.vector[0]))) /
        (Math.max(...this.images.map((img) => img.vector[0])) -
          Math.min(...this.images.map((img) => img.vector[0]))),
      (projectedNewVector[1] - Math.min(...this.images.map((img) => img.vector[1]))) /
        (Math.max(...this.images.map((img) => img.vector[1])) -
          Math.min(...this.images.map((img) => img.vector[1]))),
    ];

    return normalizedNewVector;
  }

  /**
   * add an image to the canvas
   * @param {*} image a 784 number array between 0 and 1, representing an 28x28 image where 0 is black and 1 is white
   * @param {*} label the label of the image, between 0 and 9
   * @param {*} x the x coordinate of the image, between 0 and 1
   * @param {*} y the y coordinate of the image, between 0 and 1
   * @param {*} scale the scale of the image, between 0 and 1, default to 1
   */
  addDigit(image, label, vector) {
    const to_add = {
      image: image,
      label: label,
      vector: vector,
    };
    this.images.push(to_add);
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
  async draw(clear = true) {
    if (this.dims === 2) {
      await this.draw2d(clear);
    } else if (this.dims === 3) {
      await this.draw3d(clear);
      this.animate3D();
    }
  }

  async draw2d(clear = true) {
    if (clear) {
      this.ctx.clearRect(0, 0, 500, 500);
    }
    if (!this.tsne || this.countdown_to_rebalance-- <= 0) {
      await this.resetProjection();
    }
    const scale = 2 / Math.min((Math.max(1, Math.log10(this.images.length)-1)),4);
    //console.log(scale);
    for (let image of this.images) {
      if (!image.projectedVector) {
        image.projectedVector = this.projectVector(image.vector);
      }
      this.drawDigit2d(image.image, image.label, image.projectedVector, scale);
    }
  }

  async drawDigit2d(image, label, projectedVector, scale) {
    const [x, y] = projectedVector;
    const [r, g, b] = this.getColor(label);
    const imageWidth = 28 * scale;
    const imageHeight = 28 * scale;
    const xPos = x * (this.canvas.width - imageWidth) + imageWidth/2;
    const yPos = y * (this.canvas.height - imageHeight) + imageHeight/2;
    for (let i = 0; i < 28; i++) {
      for (let j = 0; j < 28; j++) {
        const pixelValue = image[i * 28 + j];
        this.ctx.fillStyle = `rgb(${r * 255}, ${g * 255}, ${b * 255}, ${pixelValue/4})`;
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







  ///// 3D STUFF /////


  setup3d(target) {
    this.camera = null;
    this.scene = null;
    this.renderer = null;
    const width = 500;
    const height = 500;

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 15;

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.target.appendChild(this.renderer.domElement);
    console.log("new 3d scene:", this.scene);
  }


  async draw3d(clear = false) {
    if (clear) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
    }
    if (!this.tsne || this.countdown_to_rebalance-- <= 0) {
      await this.resetProjection();
    }
    const scale = 1 / Math.min((Math.max(1, Math.log10(this.images.length) - 1)), 2);
    for (let image of this.images) {
      if (!image.projectedVector) {
        image.projectedVector = this.projectVector(image.vector);
        if (image.sprite) {
          this.scene.remove(image.sprite);
          console.log()
        }
        this.drawDigit3d(image.image, image.label, image.projectedVector, scale);
      }
    }
  }


  drawDigit3d(image, label, projectedVector, scale, useDots=false) {
    const [x, y, z] = projectedVector;
    const [r, g, b] = this.getColor(label);
    const position = [x * 10 - 5, y * 10 - 5, z * 10 - 5];
    const newPosition = new THREE.Vector3(...position); // Target position as a

    if (!image.sprite) {
      console.log("adding a new image");
      if (useDots) {
        const geometry = new THREE.SphereGeometry(scale / 2, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
        const ball = new THREE.Mesh(geometry, material);
        material.transparent = true;
        material.opacity = 0.2;
        ball.position.set(...position);
        this.scene.add(sprite);
        image.sprite = ball;
      } else {
        const imageWidth = 28 * scale;
        const imageHeight = 28 * scale;
        const texture = new THREE.CanvasTexture(this.imageToCanvas(image, r, g, b, scale));
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(imageWidth / 10, imageHeight / 10, 1);
        sprite.position.set(...position);
        this.scene.add(sprite);
        image.sprite = sprite;
      }
    } else {
      this.animateSpritePosition(image.sprite, newPosition);
    }
  }

  imageToCanvas(image, r, g, b, scale) {
    const canvas = document.createElement('canvas');
    canvas.width = 28 * scale;
    canvas.height = 28 * scale;
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < 28; i++) {
      for (let j = 0; j < 28; j++) {
        const pixelValue = image[i * 28 + j];
        ctx.fillStyle = `rgb(${r * 255}, ${g * 255}, ${b * 255}, ${pixelValue / 2})`;
        if (pixelValue > 0) {
          const pixelX = j * scale;
          const pixelY = i * scale;
          const pixelSize = scale;
          ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize);
        }
      }
    }

    return canvas;
  }

  animate3D(height=7.5, radius=15, speed=40 /*sec per rotation*/) {
    const center = [.5, .5, .5];
    const elapsedTime = Date.now() - this.starttime;
    const angle = (elapsedTime % (speed * 1000)) / (speed * 1000) * Math.PI * 2;
    const x = center[0] + radius * Math.cos(angle);
    const z = center[1] + radius * Math.sin(angle);
    const y = height;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(...center);

    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.animate3D());
  }


  animateSpritePosition(sprite, targetPosition, duration = 1000) {
    const startPosition = sprite.position.clone();
    const startTime = performance.now(); // Use high-resolution time if available

    function animate(now) {
      const elapsedTime = now - startTime;
      const fraction = elapsedTime / duration;

      if (fraction < 1) {
        // Linearly interpolate position for the duration of the animation
        const currentPosition = startPosition.clone().lerp(targetPosition, fraction);
        sprite.position.set(currentPosition.x, currentPosition.y, currentPosition.z);
        requestAnimationFrame(animate);
      } else {
        sprite.position.set(targetPosition.x, targetPosition.y, targetPosition.z); // Ensure final position
      }

      // Optionally, update your rendering here if it's not done elsewhere
    }

    requestAnimationFrame(animate);
  }
}