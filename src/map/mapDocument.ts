// Pinned renderer; the mobile WebView loads public street tiles, never database credentials.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export const MAP_RENDERER_VERSION = '5.12.0';

export function mapDocument() {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@${MAP_RENDERER_VERSION}/dist/maplibre-gl.css" onerror="this.onerror=null;this.href='https://unpkg.com/maplibre-gl@${MAP_RENDERER_VERSION}/dist/maplibre-gl.css'">
<style>html,body,#map{margin:0;width:100%;height:100%;background:#e9eef3;overflow:hidden}
.maplibregl-ctrl-attrib{font:10px sans-serif}.maplibregl-ctrl-bottom-right{max-width:90%}</style>
</head><body><div id="map"></div><script>
(function () {
  var map, loaded = false, state = null, lastArea = null;
  function emit(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  function distance(a, b) {
    var r = Math.PI / 180, dy = (b.latitude-a.latitude)*r, dx = (b.longitude-a.longitude)*r;
    var h = Math.sin(dy/2)**2 + Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dx/2)**2;
    return 6371000*2*Math.asin(Math.sqrt(Math.min(1,h)));
  }
  function ring(zone, radius) {
    var lat = zone.latitude*Math.PI/180, lon = zone.longitude*Math.PI/180, d = radius/6371000;
    var points = [];
    for (var i=0;i<=64;i++) {
      var bearing = i/64*2*Math.PI;
      var lat2 = Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(bearing));
      var lon2 = lon+Math.atan2(Math.sin(bearing)*Math.sin(d)*Math.cos(lat), Math.cos(d)-Math.sin(lat)*Math.sin(lat2));
      points.push([lon2*180/Math.PI,lat2*180/Math.PI]);
    }
    return points;
  }
  function render() {
    if (!loaded || !state) return;
    if (lastArea !== state.area.id) {
      lastArea = state.area.id;
      map.easeTo({center:[state.area.longitude,state.area.latitude],zoom:14,duration:500});
    }
    var features = [], colors = {lower:'#27875B',elevated:'#D39A16',higher:'#D93B37'};
    if (state.visible) (state.zones || []).forEach(function (zone) {
      for (var i=0;i<12;i++) features.push({type:'Feature', properties:{
        zoneId:zone.id,color:colors[zone.concern],opacity:i===0?0.035:0.055,
        selected:zone.id===state.selectedZoneId && i===0
      },geometry:{type:'Polygon',coordinates:[ring(zone,zone.radiusMeters*(1-i/13))]}});
    });
    map.getSource('concern-zones').setData({type:'FeatureCollection',features:features});
  }
  window.updateIlwaMap = function (next) { state=next; render(); };
  window.recentreIlwaMap = function () {
    if (map && state) map.easeTo({center:[state.area.longitude,state.area.latitude],zoom:14,duration:500});
  };
  // v5's classic bundle retains WebGL1 support and avoids module-worker requirements.
  function loadRenderer() {
    var urls = [
      'https://cdn.jsdelivr.net/npm/maplibre-gl@${MAP_RENDERER_VERSION}/dist/maplibre-gl.js',
      'https://unpkg.com/maplibre-gl@${MAP_RENDERER_VERSION}/dist/maplibre-gl.js'
    ];
    return new Promise(function (resolve,reject) {
      function attempt(index) {
        if (index >= urls.length) { reject(new Error('Map renderer download failed. Try another network.')); return; }
        var script=document.createElement('script'), settled=false;
        var timer=setTimeout(function () { next(); },12000);
        function next() { if (settled) return; settled=true; clearTimeout(timer); script.remove(); attempt(index+1); }
        script.src=urls[index];
        script.onload=function () {
          if (settled) return;
          if (!window.maplibregl) { next(); return; }
          settled=true; clearTimeout(timer); resolve(window.maplibregl);
        };
        script.onerror=next; document.head.appendChild(script);
      }
      attempt(0);
    });
  }
  loadRenderer().then(function (lib) {
    if (typeof lib.supported === 'function' && !lib.supported()) {
      throw new Error('WebGL unavailable in this phone WebView. Update Android System WebView / browser.');
    }
    map = new lib.Map({container:'map',style:'${MAP_STYLE_URL}',center:[28.0341,-26.1929],zoom:14,
      pitch:0,attributionControl:false,dragRotate:false,touchPitch:false});
    map.touchZoomRotate.disableRotation();
    map.addControl(new lib.AttributionControl({compact:false,customAttribution:'OpenFreeMap'}),'bottom-right');
    map.on('load',function () {
      map.addSource('concern-zones',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
      var labels = map.getStyle().layers.find(function (layer) { return layer.type==='symbol'; });
      map.addLayer({id:'concern-glow',type:'fill',source:'concern-zones',paint:{
        'fill-color':['get','color'],'fill-opacity':['get','opacity'],'fill-antialias':true
      }},labels && labels.id);
      map.addLayer({id:'concern-selection',type:'line',source:'concern-zones',filter:['==',['get','selected'],true],
        paint:{'line-color':['get','color'],'line-width':2}},labels && labels.id);
      loaded=true; render(); emit({type:'ready'});
    });
    map.on('error',function (event) { emit({type:'map-error',message:String(event.error && event.error.message || 'Map resource failed to load.').slice(0,240)}); });
    map.on('click',function (event) {
      var point={latitude:event.lngLat.lat,longitude:event.lngLat.lng};
      var matches=state && state.visible ? state.zones.filter(function (zone) { return distance(point,zone)<=zone.radiusMeters; }) : [];
      matches.sort(function (a,b) { return distance(point,a)-distance(point,b); });
      emit({type:'zone',zoneId:matches.length?matches[0].id:null});
    });
    window.addEventListener('resize',function () { map.resize(); });
  }).catch(function (error) { emit({type:'map-error',message:String(error && error.message || 'Could not start the map renderer.').slice(0,240)}); });
})();
</script></body></html>`;
}

export function mapUpdateScript(value: unknown) {
  const json = JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `window.updateIlwaMap && window.updateIlwaMap(${json}); true;`;
}
