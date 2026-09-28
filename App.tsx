import { useState } from 'react';
import { Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AreaScreen } from './src/screens/AreaScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { colors } from './src/theme';

export type Route = 'home' | 'area' | 'feed' | 'report';

export default function App() {
  const [route, setRoute] = useState<Route>('home');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        {route === 'home' && <HomeScreen navigate={setRoute} />}
        {route === 'area' && <AreaScreen navigate={setRoute} />}
        {route === 'feed' && <FeedScreen navigate={setRoute} />}
        {route === 'report' && <ReportScreen navigate={setRoute} />}
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0,
    backgroundColor: colors.navy,
  },
  app: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
