import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AdminScreen } from './src/screens/AdminScreen';
import { AreaScreen } from './src/screens/AreaScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { colors } from './src/theme';

export type Route = 'home' | 'area' | 'feed' | 'report' | 'admin';

export default function App() {
  const [route, setRoute] = useState<Route>('home');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        {route === 'home' && <HomeScreen navigate={setRoute} />}
        {route === 'area' && <AreaScreen navigate={setRoute} />}
        {route === 'feed' && <FeedScreen navigate={setRoute} />}
        {route === 'report' && <ReportScreen navigate={setRoute} />}
        {route === 'admin' && <AdminScreen navigate={setRoute} />}

        {route !== 'admin' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Admin Dashboard"
            onPress={() => setRoute('admin')}
            style={({ pressed }) => [styles.adminFloatingBtn, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="shield-account" size={16} color={colors.white} />
            <Text style={styles.adminFloatingText}>Admin</Text>
          </Pressable>
        ) : null}
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
  adminFloatingBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 999,
    backgroundColor: 'rgba(6, 43, 69, 0.85)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  adminFloatingText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
});

