load_module("./viz/space_viz.js")

const SpaceVizManager = {
  imageToVec: (input, label) => {
    const outputs = network.computeInternals(input);
    let layer = null;
    for (let i = 0; i < outputs.length; i++) {
      let currentLayer = outputs[i];
      if (layer === null || currentLayer.length <= layer.length) {
        layer = currentLayer;
      }
    }
    return layer;
  },

  setSV: (dims) => {
    if (SpaceVizManager.space_viz) {
      delete SpaceVizManager.space_viz; //TODO: almost cert
      document.getElementById("space-viz").innerHTML = "";
    }
    const space_viz = new SpaceViz(document.getElementById("space-viz"), dims);
    SpaceVizManager.space_viz = space_viz;
    return space_viz;
  },


  addSVDigit: async function(should_redraw, image, label){
    if (image === undefined || label === undefined) {
      const imageData = getRandomImage();
      image = imageData.image;
      label = imageData.label;
    }
    const vec = imageToVec(image, label);
    await SpaceVizManager.space_viz.addDigit(image, label, vec);
    if (should_redraw != false) SpaceVizManager.space_viz.draw();
  },


  retrainSVProjections: () => {
    SpaceVizManager.space_viz.resetProjection();
    SpaceVizManager.space_viz.draw();
  },

  resampleSV: async function(){
    window._CONTINUE_RESAMPLE = !window._CONTINUE_RESAMPLE;
    setTimeout(continueResampleSV, SAMPLE_RATE);
  },


  continueResampleSV: async function(){
    for (let i = 0; i < SAMPLE_N; i++) {
      const cur = RESAMPLE_POINTER.n++ % SpaceVizManager.space_viz.images.length
      const im = SpaceVizManager.space_viz.images[cur];
      im.vector = imageToVec(im.image, im.label);
      im.projectedVector = undefined;
    }
    SpaceVizManager.space_viz.draw(false);
    if (window._CONTINUE_RESAMPLE) {
      setTimeout(continueResampleSV, SAMPLE_RATE);
    }
  },

  dimToggleSV: async function(){
    setSV(SpaceVizManager.space_viz.dims === 2 ? 3 : 2);
    SpaceVizManager.space_viz.draw();
    document.getElementById("SV-dim-toggle").innerHTML = SpaceVizManager.getSVDims();
  },

  getSVDims: () => {
  	return `${SpaceVizManager.space_viz.dims}D`
  },

  loadSpaceViz: async function(){
    document.getElementById("SV-add-current").addEventListener("click", () => {
      SpaceVizManager.addSVDigit(false, window.currentInput, window.currentLabel);
    });
    document.getElementById("SV-add-random").addEventListener("click", 
      SpaceVizManager.addSVDigit
    );
    document.getElementById("SV-add-100").addEventListener("click",
      () => {
      	for (let i = 0; i < 100; i++) addSVDigit(false); SpaceVizManager.space_viz.draw();
      }
    );
    document.getElementById("SV-resample").addEventListener("click", 
      SpaceVizManager.resampleSV
    );
    document.getElementById("SV-reset").addEventListener("click", 
      () => {
        window._CONTINUE_RESAMPLE = false;
        SpaceVizManager.space_viz.reset();
      }
    );
    document.getElementById("SV-retrain").addEventListener("click", 
      SpaceVizManager.retrainSVProjections
    );
    document.getElementById("SV-dim-toggle").innerHTML = SpaceVizManager.getSVDims();
    document.getElementById("SV-dim-toggle").addEventListener("click", 
      SpaceVizManager.dimToggleSV
    );
  }
}
