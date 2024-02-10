
function saveCheckpoint() {
  alert("TODO: copy over over localstorage");
  console.log("saved!");
  const layers = _serializeNetwork(network);
  const checkpointID = Date.now();
  const layout = network.layers.map(layer => layer.neurons.length);
  const checkpoint = {
    id: checkpointID,
    layout: layout,
    layers: layers
  };
  localStorage.setItem(`checkpoint-${checkpointID}`, JSON.stringify(checkpoint));
  updateCheckpointList();
}

function listCheckpoints() {
  let checkpoints = [];
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key.startsWith("checkpoint-")) {
      checkpoints.push(JSON.parse(localStorage.getItem(key)));
    }
  }
  return checkpoints;
}

function _formatCheckpoint(checkpoint) {
  const date = new Date(checkpoint.id)
  const localtime = date.toLocaleTimeString();
  const localdate = date.toLocaleDateString();
  return `${localdate} -- [${checkpoint.layout.slice(0,-1).join(",")}] <!-- ${checkpoint?.id} -->`;
}

function updateCheckpointList(){
  const checkpointDiv = document.getElementById("checkpoints");
  checkpointDiv.innerHTML = "";
  for (let checkpoint of listCheckpoints()) {
    const button = document.createElement("button");
    // checkpoint.id is a timestamp, convert to isodate
    button.innerHTML = _formatCheckpoint(checkpoint);
    button.addEventListener("click", () => restoreCheckpoint(checkpoint.id));
    checkpointDiv.appendChild(button);
  }
  for (let preload of listPreloads()) {
    const button = document.createElement("button");
    // checkpoint.id is a timestamp, convert to isodate
    button.innerHTML = `Pretrained network: ${preload.size.join("x")}`;
    button.addEventListener("click", () => restorePretrained(preload));
    checkpointDiv.appendChild(button);
  }
}

function restoreCheckpoint(checkpointID) {
  let checkpoint = JSON.parse(localStorage.getItem(`checkpoint-${checkpointID}`));
  if (!checkpoint) {
    console.log(`checkpoint ${checkpointID} not found`);
    return;
  }
  console.log("restoring", checkpoint);
  const layout = checkpoint.layout.slice(0,-1);
  document.getElementById("layers-input").value = layout.join(",");
  window.history.pushState({}, "", `?${layout.join(",")}`);
  network.changeLayersButRetainWeights(layout);
  _loadWeightsFromSerialized(checkpoint.layers);
  console.log(`RESTORED checkpoint ${checkpointID}`);
  redraw();
}

async function restorePretrained(preload) {
  let checkpoint = await restoreNetworkWeightsFromPretrained(preload);
  const layout = checkpoint.layout.slice(0,-1);
  document.getElementById("layers-input").value = layout.join(",");
  window.history.pushState({}, "", `?${layout.join(",")}`);
  network.changeLayersButRetainWeights(layout);
  _loadWeightsFromSerialized(checkpoint.layers);
  redraw();
}


function storeNetworkInLocalStorage(network) {
  localStorage.setItem("network", JSON.stringify(_serializeNetwork(network)));
  console.log("STORED");
}


function listPreloads(){
  return [{
    size: [10,10,10],
  }]
}


async function restoreNetworkWeightsFromPretrained(preload){
  const name = `preload_${preload.size.join("_")}`;
  importScripts(`./checkpoint_manager/${name}.js`);
  return await (async function(name){
    const get_fn = window[name];
    return get_fn();
  })(name);
}


function restoreNetworkWeightsFromLocalStorage() {
  let layers = JSON.parse(localStorage.getItem("network"));
  return layers;
}

function _serializeNetwork(network){
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
