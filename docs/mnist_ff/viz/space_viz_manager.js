load_module("./viz/space_viz.js")

const SpaceVizManager = {
/*

*/
  setSV: (dims) => {
    if (SpaceVizManager.space_viz) {
      delete SpaceVizManager.space_viz; //TODO: almost cert
      demoContent.querySelector("#space-viz").innerHTML = "";
    }
    const space_viz = new SpaceViz(demoContent.querySelector("#space-viz"), dims);
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
    if (SpaceVizManager.space_viz.images.length === 0) return;
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
      if (index_list.indexOf(im.index) >=0 ) break;
      index_list.push(im.index);
    }
    SpaceVizManager.space_viz.draw();
    if (window._CONTINUE_RESAMPLE) {
      setTimeout(
        () => SpaceVizManager.updateVectorCallback(index_list),
        SpaceVizManager.space_viz.dims == 3 ? 100 : 0
      );
    }
  },

  dimToggleSV: async function(){
    SpaceVizManager.setSV(SpaceVizManager.space_viz.dims === 2 ? 3 : 2);
    SpaceVizManager.space_viz.draw();
    demoContent.querySelector("#SV-dim-toggle").innerHTML = SpaceVizManager.getSVDims();
  },

  getSVDims: () => {
  	return `${SpaceVizManager.space_viz.dims}D`
  },

  loadSpaceViz: async function(getDigitCallback, getCurrentDigitCallback, updateVectorCallback){
    SpaceVizManager.getDigitCallback = getDigitCallback;
    SpaceVizManager.getCurrentDigitCallback = getCurrentDigitCallback;
    SpaceVizManager.updateVectorCallback = updateVectorCallback;
    demoContent.querySelector("#SV-add-current").addEventListener("click", 
      SpaceVizManager.getCurrentDigitCallback
    );
    demoContent.querySelector("#SV-add-random").addEventListener("click", 
      () => SpaceVizManager.getDigitCallback(1)
    );
    demoContent.querySelector("#SV-add-100").addEventListener("click",
      () => SpaceVizManager.getDigitCallback(100)
    );
    demoContent.querySelector("#SV-resample").addEventListener("click", 
      SpaceVizManager.resampleSV
    );
    demoContent.querySelector("#SV-reset").addEventListener("click", 
      () => {
        window._CONTINUE_RESAMPLE = false;
        SpaceVizManager.space_viz.reset();
      }
    );
    demoContent.querySelector("#SV-retrain").addEventListener("click", 
      SpaceVizManager.retrainSVProjections
    );
    demoContent.querySelector("#SV-dim-toggle").innerHTML = SpaceVizManager.getSVDims();
    demoContent.querySelector("#SV-dim-toggle").addEventListener("click", 
      SpaceVizManager.dimToggleSV
    );
    SpaceVizManager.dimToggleSV();
  }
}
