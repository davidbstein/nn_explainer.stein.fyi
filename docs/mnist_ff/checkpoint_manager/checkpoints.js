
const CheckpointManager = {

  listPreloads: () => {
    return [{
      size: [8,8],
    }, {
      size: [8,5,2,6,7],
    }, {
      size: [7,5,3,5,7],
    }]
  },

  saveCheckpoint: (network) =>  {
    console.log(network);
    const layers = CheckpointManager._serializeNetwork(network);
    const checkpointID = Date.now();
    const layout = network.layers.map(layer => layer.neurons.length);
    const checkpoint = {
      id: checkpointID,
      layout: layout,
      layers: layers
    };
    localStorage.setItem(`checkpoint-${checkpointID}`, JSON.stringify(checkpoint));
    CheckpointManager.updateCheckpointList();
  },

  listCheckpoints: () => {
    let checkpoints = [];
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key.startsWith("checkpoint-")) {
        checkpoints.push(JSON.parse(localStorage.getItem(key)));
      }
    }
    return checkpoints;
  },

  updateCheckpointList: () => {
    const checkpointDiv = document.getElementById("checkpoints");
    checkpointDiv.innerHTML = "";
    for (let checkpoint of CheckpointManager.listCheckpoints()) {
      const button = document.createElement("button");
      // checkpoint.id is a timestamp, convert to isodate
      button.innerHTML = CheckpointManager._formatCheckpoint(checkpoint);
      button.addEventListener("click", () => CheckpointManager.restoreCheckpoint(checkpoint.id));
      checkpointDiv.appendChild(button);
    }
    for (let preload of CheckpointManager.listPreloads()) {
      const button = document.createElement("button");
      // checkpoint.id is a timestamp, convert to isodate
      button.innerHTML = `Pretrained network: ${preload.size.join("x")}`;
      button.addEventListener("click", () => CheckpointManager.restorePretrained(preload));
      checkpointDiv.appendChild(button);
    }
  },

  restoreCheckpoint: (checkpointID) =>  {
    let checkpoint = JSON.parse(localStorage.getItem(`checkpoint-${checkpointID}`));
    if (!checkpoint) {
      console.log(`checkpoint ${checkpointID} not found`);
      return;
    }
    console.log("restoring", checkpoint);
    const layerSizes = checkpoint.layout.slice(0,-1).join(",");
    document.getElementById("layers-input").value = layerSizes;
    window.history.pushState({}, "", `?${layerSizes}`);
    CheckpointManager._emitNewNetwork(checkpoint);
    //_loadWeightsFromSerialized();
  },

  restorePretrained: async function (preload) {
    let checkpoint = await CheckpointManager.restoreNetworkWeightsFromPretrained(preload);
    const layout = checkpoint.layout.slice(0,-1);
    document.getElementById("layers-input").value = layout.join(",");
    window.history.pushState({}, "", `?${layout.join(",")}`);
    CheckpointManager._emitNewNetwork(checkpoint);
  },


  storeNetworkInLocalStorage: (network) =>  {
    localStorage.setItem("network", JSON.stringify(CheckpointManager._serializeNetwork(network)));
    console.log("STORED");
  },

  restoreNetworkWeightsFromPretrained: async function (preload){
    const name = `preload_${preload.size.join("_")}`;
    load_module(`./checkpoint_manager/${name}.js`);
    await delay(0);
    const get_fn = window[name];
    return get_fn();
  },


  restoreNetworkWeightsFromLocalStorage: () =>  {
    let layers = JSON.parse(localStorage.getItem("network"));
    return layers;
  },

  _formatCheckpoint: (checkpoint) =>  {
    const date = new Date(checkpoint.id)
    const localtime = date.toLocaleTimeString();
    const localdate = date.toLocaleDateString();
    return `${localdate} -- [${checkpoint.layout.slice(0,-1).join(",")}] <!-- ${checkpoint?.id} -->`;
  },

  _emitNewWeights: async function(layers) {
    window.setTimeout(()=> {
      console.log("emitting event loadNewNetworkWeights", layers);
      window.dispatchEvent(new CustomEvent(
        "loadNewNetworkWeights", 
        { detail: {layers} }
      ));
    }, 0);
  },

  _emitNewNetwork: async function(network) {
    window.setTimeout(()=> {
      console.log("emitting event loadNewNetwork", network);
      window.dispatchEvent(new CustomEvent(
        "loadNewNetwork", 
        { detail: {network} }
      ));
    }, 0);
  },

  _serializeNetwork: (network) => {
    let layers = [];
    for (let i = 0; i < network.layers.length; i++) {
      let layer = [];
      for (let j = 0; j < network.layers[i].neurons.length; j++) {
        layer.push({
          weights: network.layers[i].neurons[j].weights,
          bias: network.layers[i].neurons[j].bias
        });
      }
      layers.push(layer);
    }
    return layers
  }
}


function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
