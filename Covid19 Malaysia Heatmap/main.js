var map = null, areas = null, largest = null, heatMapData = null, heatmap = null;
const sort = [(largest, value) => value > largest ? value : largest, -Infinity];
const parseArea = ({ yStart, yEnd, xStart, xEnd, step, data }, mapper = _ => _) => {
  const heatMapData = [];
  for(let yOffset = yStart, y = 0; yOffset <= yEnd; yOffset = +(yOffset + step).toFixed(5), ++y){
    const row = data[y];
    if(row === 0) continue;
    for(let xOffset = xStart, x = 0; xOffset <= xEnd; xOffset = +(xOffset + step).toFixed(5), ++x){
      if(row[x] === 0){
        const repeat = row[x + 1];
        xOffset += step * repeat;
        continue;
      }
      const weight = mapper(row[x]);
      if(weight === 0) continue;
      heatMapData.push({
        location: new google.maps.LatLng(yOffset, xOffset),
        weight
      });
    }
  }
  return heatMapData;
}
const fetchAPI = api => {
  return fetch(`./data/${api}.json`)
    .then(res => res.json());
}
var updateHeatmap = async () => {
  areas = await Promise.all(
    'east,west'.split(',').map(area => fetchAPI(area))
  );
  largest = areas.map(({ data }) => data
      .filter((row, index) => row !== 0)
      .map(row => row
        .filter((val, index) => !(val === 0 || row[index - 1] === 0))
        .reduce(...sort))
      .reduce(...sort))
    .reduce(...sort);
  heatMapData = areas.map(area =>
    parseArea(area, val => {
      return val;
//      const weight = Math.log(val) / Math.log(largest);
      const weight = val / largest;
      if(weight === -Infinity) return 0;
      return weight;
    })
  ).reduce((output, list) => (output.push(...list), output));
  if(heatmap) heatmap.setMap(null);
  heatmap = new google.maps.visualization.HeatmapLayer({
    data: heatMapData, dissipating: false, radius: 0.05
  });
  document.getElementById('lastUpdateAt').innerText = `Last update at: ${new Date().toLocaleString()}`;
  document.getElementById('eastUpdatedAt').innerText = `East Malaysia last updated on: ${new Date(areas[0].updatedAt).toLocaleString()}`;
  document.getElementById('westUpdatedAt').innerText = `West Malaysia last updated on: ${new Date(areas[1].updatedAt).toLocaleString()}`;
  if(document.getElementById('heatmapButton').textContent === 'Hide Heatmap') heatmap.setMap(map);
}
let userLocation = undefined;
var locationButton = async () => {
  const button = document.getElementById('locationButton');
  switch(button.textContent){
    case 'Show Location': {
      if(userLocation !== undefined) return;
      userLocation = null;
      const location = await new Promise((rs, rj) => navigator.geolocation.getCurrentPosition(rs, rj))
        .catch(err => void(alert(`Error occurred: ${err.message}`)));
      if(location === undefined) {
        userLocation = undefined;
        return;
      }
      const center = {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      };
      userLocation = {
        pointer: new google.maps.Marker({
          position: center,
          map: map
        }),
        circle: new google.maps.Circle({
          strokeColor: '#addfff',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#addfff',
          fillOpacity: 0.3,
          map,
          center: center,
          radius: location.coords.accuracy,
        })
      }
      button.textContent = 'Hide Location';
    } break;
    case 'Hide Location': {
      userLocation.pointer.setMap(null);
      userLocation.circle.setMap(null);
      userLocation = undefined;
      button.textContent = 'Show Location';
    } break;
  }
}
var heatmapButton = () => {
  if(map === null || heatmap === null) return;
  const button = document.getElementById('heatmapButton');
  switch(button.textContent){
    case 'Show Heatmap': {
      heatmap.setMap(map);
      button.textContent = 'Hide Heatmap';
    } break;
    case 'Hide Heatmap': {
      heatmap.setMap(null);
      button.textContent = 'Show Heatmap';
    } break;
  }
}

var initMap = async () => {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 4.3, lng: 109.5 },
    zoom: 6, controlSize: 50,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    streetViewControl: false
  });
  updateHeatmap();
}