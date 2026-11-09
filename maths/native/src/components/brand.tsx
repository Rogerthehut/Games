import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { palette } from '@/theme';

export function Brand() {
  return (
    <View style={styles.brand} accessibilityLabel="Quarter">
      <View style={styles.mark}>
        <View style={[styles.square, { backgroundColor: '#F5D071' }]} />
        <View style={[styles.square, { backgroundColor: '#F38EB3' }]} />
        <View style={[styles.square, { backgroundColor: '#818DDE' }]} />
        <View style={[styles.square, { backgroundColor: '#65D2B1' }]} />
      </View>
      <View style={styles.wordmark}>
        <Text style={styles.word}>qua</Text>
        <Svg width={11.5} height={16.5} viewBox="0 0 14 20" accessible={false}>
          <Path fill="#dd7697" d="M1 19 5.8 1H9L7.4 7.1C9 4.8 11 4 13.5 4.7l-.9 3.4c-2.7-1-4.9.2-6.2 3.1L4.3 19Z" />
        </Svg>
        <Text style={styles.word}>ter</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  mark: { width: 34, height: 34, borderRadius: 9, backgroundColor: palette.ink, padding: 5, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  square: { width: 10.5, height: 10.5, borderRadius: 2.5 },
  word: { color: palette.ink, fontFamily: 'ui-serif', fontSize: 24, fontWeight: '800', letterSpacing: -0.7 },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
});
