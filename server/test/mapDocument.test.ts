import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { mapDocument, mapUpdateScript } from '../../src/map/mapDocument';

test('map updates safely serialize text that could otherwise close an HTML script', () => {
  const input = { area: { name: '</script><script>bad()</script>\u2028' }, zones: [] };
  const script = mapUpdateScript(input);
  assert.equal(script.includes('</script>'), false);
  let output: unknown;
  vm.runInNewContext(script, { window: { updateIlwaMap: (value: unknown) => { output = value; } } });
  assert.equal(JSON.stringify(output), JSON.stringify(input));
});

test('map bridge handles delayed updates, selection, clearing and metre-based fading polygons', async () => {
  const messages: Array<{ type: string; zoneId?: string | null }> = [];
  const handlers: Record<string, (event?: unknown) => void> = {};
  let features: Array<{ geometry: { coordinates: number[][][] }; properties: Record<string, unknown> }> = [];
  const camera: unknown[] = [];
  const fakeMap = {
    touchZoomRotate: { disableRotation() {} }, addControl() {}, addSource() {}, addLayer() {},
    getStyle: () => ({ layers: [{ type: 'symbol', id: 'labels' }] }),
    getSource: () => ({ setData: (data: { features: typeof features }) => { features = data.features; } }),
    easeTo: (value: unknown) => camera.push(value), on: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; }, resize() {},
  };
  const window: Record<string, unknown> = { ReactNativeWebView: { postMessage: (value: string) => messages.push(JSON.parse(value)) }, addEventListener() {} };
  const html = mapDocument();
  const inline = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(inline);
  // Substitute only the remote module; exercise the actual bridge/geometry implementation.
  vm.runInNewContext(inline.replace('loadRenderer().then', 'Promise.resolve(lib).then'), {
    window, lib: { Map: function () { return fakeMap; }, AttributionControl: function () {} },
  });
  await Promise.resolve();
  const update = window.updateIlwaMap as (value: unknown) => void;
  const zone = { id: 'park', latitude: -26.1987, longitude: 28.0414, radiusMeters: 200, concern: 'higher' };
  const state = { area: { id: 'braamfontein', latitude: -26.1929, longitude: 28.0341 }, zones: [zone], visible: true };
  update(state);
  assert.equal(features.length, 0); // The update is buffered until the map loads.
  handlers.load?.();
  assert.equal(features.length, 12);
  assert.equal(features[0]?.geometry.coordinates[0]?.length, 65);
  assert.equal(features[0]?.properties.color, '#D93B37');
  assert.ok(messages.some((message) => message.type === 'ready'));
  handlers.click?.({ lngLat: { lat: zone.latitude, lng: zone.longitude } });
  assert.equal(messages.at(-1)?.zoneId, 'park');
  update({ ...state, zones: [], area: { ...state.area, id: 'melville' } });
  assert.equal(features.length, 0);
  assert.equal(camera.length, 2);
  update({ ...state, visible: false });
  assert.equal(features.length, 0);
  handlers.click?.({ lngLat: { lat: zone.latitude, lng: zone.longitude } });
  assert.equal(messages.at(-1)?.zoneId, null);
  handlers.error?.({ error: { message: 'Tile host unreachable' } });
  assert.equal(messages.at(-1)?.type, 'map-error');
  assert.equal((messages.at(-1) as unknown as { message: string }).message, 'Tile host unreachable');
});
