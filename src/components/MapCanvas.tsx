// Metro selects MapCanvas.native.tsx on Android/iOS. Keep browser imports native-free.
import { StyleSheet, Text, View } from 'react-native';
import type { MapCanvasProps } from './MapCanvas.types';
export function MapCanvas(_props: MapCanvasProps) {
  return <View style={styles.message}><Text>The street map is available in the Android and iPhone builds.</Text></View>;
}
const styles = StyleSheet.create({ message: { height: 300, padding: 24, justifyContent: 'center', backgroundColor: '#E9EEF3' } });
