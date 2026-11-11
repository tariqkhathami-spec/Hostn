import React, { createContext, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

// How much top padding this wrapper added for the status bar. HeaderBar reads
// it to stretch its own colour up behind the status bar; without that, iOS
// showed a white strip above the purple header with invisible white clock
// and battery icons.
const TopInsetContext = createContext(0);
export const useWrapperTopInset = () => useContext(TopInsetContext);

/** True for colours dark enough to need light status bar icons. */
function isDark(color: string): boolean {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (!hex) return false;
  const n = parseInt(hex[1], 16);
  const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luminance < 0.6;
}

export default function ScreenWrapper({ children, backgroundColor = Colors.background, edges }: Props) {
  const insets = useSafeAreaInsets();
  const padsTop = edges?.includes('top') !== false;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
        padsTop && { paddingTop: insets.top },
        edges?.includes('bottom') && { paddingBottom: insets.bottom },
      ]}
    >
      {/* Icons contrast with this screen's background; a coloured HeaderBar
          rendered below overrides it with light icons. */}
      <StatusBar style={isDark(backgroundColor) ? 'light' : 'dark'} />
      <TopInsetContext.Provider value={padsTop ? insets.top : 0}>{children}</TopInsetContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
