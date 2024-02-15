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


  addSVDigit: async function(should_redraw, index, image, label, vec){
    alert("TODO: replace addSVDigit calls with requests to backend")
    await SpaceVizManager.space_viz.addDigit(index, image, label, vec);
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


  continueResampleSV: async function(vecsToUpdate){
    for (let [idx, vec] of vecsToUpdate) {
      const im = console.log("NEED TO FIND SpaceVizManager.space_viz.images[n].index == idx");
      im.vector = vec;
      im.projectedVector = undefined;
    }
    const index_list = []
    for (let i = 0; i < SAMPLE_N; i++) {
      const cur = RESAMPLE_POINTER.n++ % SpaceVizManager.space_viz.images.length
      const im = SpaceVizManager.space_viz.images[cur];
      index_list.append(im.index);
    }
    SpaceVizManager.space_viz.draw(false);
    if (window._CONTINUE_RESAMPLE) {
      requestSpaceVizUpdates(index_list);
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

  loadSpaceViz: async function(){
    document.getElementById("SV-add-current").addEventListener("click", () => {
      SpaceVizManager.addSVDigit(false, window.currentInput, window.currentLabel);
    });
    document.getElementById("SV-add-random").addEventListener("click", 
      SpaceVizManager.addSVDigit
    );
    document.getElementById("SV-add-100").addEventListener("click",
      () => {
      	for (let i = 0; i < 100; i++) {
          SpaceVizManager.addSVDigit(false); SpaceVizManager.space_viz.draw();
        }
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
