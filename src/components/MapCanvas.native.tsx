import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { concernColors, concernLabels } from '../../shared/safetyMap';
import { useAreaMap } from '../map/AreaProvider';
import { mapDocument, mapUpdateScript } from '../map/mapDocument';
import { colors } from '../theme';
import type { MapCanvasProps } from './MapCanvas.types';

export function MapCanvas({ detailed = false, onSelectArea, onSelectZone, selectedZoneId }: MapCanvasProps) {
  const { area, data, loading, error, refresh } = useAreaMap();
  const web = useRef<WebView>(null);
  const document = useMemo(() => ({ html: mapDocument(), baseUrl: 'https://tiles.openfreemap.org/' }), []);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (ready) web.current?.injectJavaScript(mapUpdateScript({ area, zones: data?.zones ?? [],
      selectedZoneId, visible: overlayVisible }));
  }, [ready, area, data, selectedZoneId, overlayVisible]);
  useEffect(() => {
    if (ready || mapError) return;
    const timer = setTimeout(() => setMapError('Map loading timed out. Check tiles.openfreemap.org on this phone.'), 35_000);
    return () => clearTimeout(timer);
  }, [ready, mapError, reload]);
  const retryMap = () => { setReady(false); setMapError(''); setReload((value) => value + 1); };
  return <View style={[styles.wrap, detailed && styles.detailed]}>
    <WebView key={reload} ref={web} source={document} style={StyleSheet.absoluteFill}
      originWhitelist={['*']} javaScriptEnabled domStorageEnabled scrollEnabled={false}
      nestedScrollEnabled setSupportMultipleWindows={false} mixedContentMode="never"
      allowFileAccess={false} allowUniversalAccessFromFileURLs={false} geolocationEnabled={false}
      accessibilityLabel={`Street map of ${area.name} with demo concern zones`}
      onShouldStartLoadWithRequest={(request) => {
        if (request.url === 'about:blank' || request.url === 'https://tiles.openfreemap.org/') return true;
        // Attribution links open externally; the map's tiles and scripts are subresources.
        if (request.url.startsWith('https://')) void Linking.openURL(request.url).catch(() => {});
        return false;
      }}
      onError={(event) => setMapError(event.nativeEvent.description || 'WebView failed to load.')}
      onHttpError={(event) => setMapError(`Map request returned HTTP ${event.nativeEvent.statusCode}.`)}
      androidLayerType="hardware"
      onContentProcessDidTerminate={retryMap}
      onMessage={(event) => {
        let message: unknown;
        try { message = JSON.parse(event.nativeEvent.data); } catch { return; }
        if (!message || typeof message !== 'object' || !('type' in message)) return;
        if (message.type === 'ready') setReady(true);
        if (message.type === 'map-error') setMapError('message' in message && typeof message.message === 'string'
          ? message.message.slice(0,240) : 'A map resource failed to load.');
        if (message.type === 'zone' && 'zoneId' in message) {
          const zone = overlayVisible ? data?.zones.find((item) => item.id === message.zoneId) : undefined;
          onSelectZone?.(zone ?? null);
          if (zone && !onSelectZone) onSelectArea?.();
        }
      }} />
    <View style={styles.topRow} pointerEvents="box-none">
      <View style={styles.badge}><Text style={styles.badgeText}>DEMO · APPROXIMATE LOCATIONS</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Recentre on selected suburb"
        onPress={() => web.current?.injectJavaScript('window.recentreIlwaMap && window.recentreIlwaMap(); true;')} style={styles.control}>
        <Text style={styles.controlText}>⌖</Text>
      </Pressable>
    </View>
    <View style={styles.legend}>
      {(Object.keys(concernLabels) as Array<keyof typeof concernLabels>).map((key) => <View key={key} style={styles.legendItem}>
        <View style={[styles.dot, { backgroundColor: `rgb(${concernColors[key]})` }]} />
        <Text style={styles.legendText}>{key === 'elevated' ? 'Elevated' : key === 'higher' ? 'Higher' : 'Lower'} concern</Text>
      </View>)}
      <Text style={styles.legendNote}>Uncoloured: insufficient data</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={overlayVisible ? 'Hide concern zones' : 'Show concern zones'}
        onPress={() => { setOverlayVisible(!overlayVisible); onSelectZone?.(null); }}>
        <Text style={styles.toggle}>{overlayVisible ? 'Hide zones' : 'Show zones'}</Text>
      </Pressable>
    </View>
    <View style={styles.status} pointerEvents="box-none">
      {mapError ? <Pressable accessibilityRole="button" onPress={retryMap} style={styles.statusCard}>
        <Text style={styles.statusText}>{mapError} · Tap to retry</Text></Pressable>
        : !ready ? <View style={styles.statusCard}><ActivityIndicator size="small" color={colors.navy} /><Text style={styles.statusText}>Loading street map…</Text></View>
        : loading ? <View style={styles.statusCard}><ActivityIndicator size="small" color={colors.navy} /><Text style={styles.statusText}>Loading reports…</Text></View>
        : error ? <Pressable accessibilityRole="button" onPress={refresh} style={styles.statusCard}><Text style={styles.statusText}>Reports unavailable · Tap to retry</Text></Pressable>
        : !data?.zones.length ? <View style={styles.statusCard}><Text style={styles.statusText}>No recent mapped reports for {area.name}</Text></View>
        : <View style={styles.statusCard}><Text style={styles.statusText}>30 days · Tap a zone for details</Text></View>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  wrap: { height: 360, overflow: 'hidden', backgroundColor: '#E9EEF3' }, detailed: { height: 350 },
  topRow: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { backgroundColor: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 6 },
  badgeText: { color: colors.navy, fontWeight: '900', fontSize: 9 },
  control: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  controlText: { color: colors.navy, fontSize: 25 },
  legend: { position: 'absolute', right: 10, top: 60, backgroundColor: 'rgba(255,255,255,0.94)', padding: 8, borderRadius: 8, gap: 5 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.ink, fontSize: 10 }, legendNote: { color: colors.muted, fontSize: 9 },
  toggle: { color: colors.green, fontWeight: '800', fontSize: 11, paddingVertical: 4 },
  // Keep the source attribution unobscured at the bottom of the map.
  status: { position: 'absolute', bottom: 44, left: 12, right: 12, alignItems: 'center' },
  statusCard: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 7 },
  statusText: { color: colors.ink, fontSize: 11, flexShrink: 1 },
});
