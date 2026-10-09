import { StyleSheet, Text, View } from 'react-native';
import { Tappable } from '../components/Tappable';
import { C, GUTTER, RADIUS, softShadow } from '../theme';

type Props = { status: { streak: number; completedToday: boolean } | null; onPress: () => void };

function subtitle(status: Props['status']): string {
  if (!status) return 'A fresh puzzle every day';
  if (status.completedToday) return `Done for today · ${status.streak}-day streak`;
  if (status.streak > 0) return `${status.streak}-day streak — play today to keep it`;
  return 'A fresh puzzle every day';
}

export function DailyCard({ status, onPress }: Props) {
  return (
    <Tappable onPress={onPress} accessibilityLabel="Daily challenge" style={[styles.card, softShadow(0.1, 10, 3)]}>
      <Text style={styles.icon}>{status?.completedToday ? '✅' : '🔥'}</Text>
      <View style={styles.body}>
        <Text style={styles.title}>DAILY CHALLENGE</Text>
        <Text style={styles.subtitle}>{subtitle(status)}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginHorizontal: GUTTER,
    marginBottom: 28,
  },
  icon: { fontSize: 24 },
  body: { flex: 1 },
  title: { color: C.ink, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  subtitle: { color: C.inkDim, fontSize: 12, marginTop: 2 },
  chevron: { color: C.inkDim, fontSize: 22, fontWeight: '900' },
});
