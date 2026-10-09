import { StyleSheet, Text, View } from 'react-native';
import { C } from '../../game/theme';

export function StarRow({ stars, size = 18 }: { stars: 0 | 1 | 2 | 3; size?: number }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3].map((n) => (
        <Text key={n} style={{ fontSize: size, color: n <= stars ? '#F2C94C' : C.line }}>
          ★
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});
