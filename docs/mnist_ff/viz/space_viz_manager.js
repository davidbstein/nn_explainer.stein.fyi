load_module("./viz/space_viz.js")

const SpaceVizManager = {
/*

*/
  setSV: (dims) => {
    if (SpaceVizManager.space_viz) {
      delete SpaceVizManager.space_viz; //TODO: almost cert
      document.getElementById("space-viz").innerHTML = "";
    }
    const space_viz = new SpaceViz(document.getElementById("space-viz"), dims);
    SpaceVizManager.space_viz = space_viz;
    return space_viz;
  },


  retrainSVProjections: () => {
    SpaceVizManager.space_viz.resetProjection();
    SpaceVizManager.space_viz.draw();
  },

  resampleSV: async function(){
    window._CONTINUE_RESAMPLE = !window._CONTINUE_RESAMPLE;
    SpaceVizManager.continueResampleSV({});
  },

  addSVDigits: async function(images) {
    for (let im of images) {
      SpaceVizManager.space_viz.addDigit(im.index, im.image, im.label, im.vec);
    }
    SpaceVizManager.space_viz.draw()
  },

  continueResampleSV: async function(vecsToUpdate){
    for (let im of SpaceVizManager.space_viz.images) {
      const vec = vecsToUpdate[im.index];
      if (vec) {
        im.vector = vec;
        im.projectedVector = undefined;
      }
    }
    const index_list = []
    for (let i = 0; i < SAMPLE_N; i++) {
      const cur = RESAMPLE_POINTER.n++ % SpaceVizManager.space_viz.images.length
      const im = SpaceVizManager.space_viz.images[cur];
      index_list.push(im.index);
    }
    SpaceVizManager.space_viz.draw();
    if (window._CONTINUE_RESAMPLE) {
      setTimeout(
        () => SpaceVizManager.updateVectorCallback(index_list),
        SpaceVizManager.space_viz.dims == 3 ? 250 : 0
      );
    }
  },

  dimToggleSV: async function(){
    SpaceVizManager.setSV(SpaceVizManager.space_viz.dims === 2 ? 3 : 2);
    SpaceVizManager.space_viz.draw();
    document.getElementById("SV-dim-toggle").innerHTML = SpaceVizManager.getSVDims();
  },

  getSVDims: () => {
  	return `${SpaceVizManager.space_viz.dims}D`
  },

  loadSpaceViz: async function(getDigitCallback, updateVectorCallback){
    SpaceVizManager.getDigitCallback = getDigitCallback;
    SpaceVizManager.updateVectorCallback = updateVectorCallback;
    document.getElementById("SV-add-current").addEventListener("click", () => {
      SpaceVizManager.addSVDigit(false, window.currentInput, window.currentLabel);
    });
    document.getElementById("SV-add-random").addEventListener("click", 
      () => SpaceVizManager.getDigitCallback(1)
    );
    document.getElementById("SV-add-100").addEventListener("click",
      () => SpaceVizManager.getDigitCallback(100)
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
    SpaceVizManager.dimToggleSV();
  }
}
