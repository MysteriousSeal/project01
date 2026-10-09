import { StyleSheet, Text, View } from 'react-native';
import { Stars } from '../../game/scoring';
import { C } from '../theme';

export function StarRow({ stars, size = 18 }: { stars: Stars | 0; size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${stars} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Text key={n} style={{ fontSize: size, lineHeight: size * 1.15, color: n <= stars ? C.star : C.line }}>
          ★
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});
