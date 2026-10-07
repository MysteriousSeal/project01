import { StyleSheet, Text, View } from 'react-native';
import { isDone, Mission, missionLabel } from '../../game/missions';
import { C, F, RADIUS } from '../theme';
import { ProgressBar } from './ProgressBar';
import { Coin, Icon } from './Icon';

export function MissionsCard({ missions }: { missions: Mission[] }) {
  const pot = missions.filter((m) => !isDone(m)).reduce((a, m) => a + m.reward, 0);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Missions</Text>
        {pot > 0 && <Text style={styles.pot}><Coin size={11} /> {pot} to earn</Text>}
      </View>
      {missions.map((m) => {
        const done = isDone(m);
        return (
          <View key={m.id} style={styles.row} accessible accessibilityLabel={`${missionLabel(m)}, ${done ? 'completed' : `${m.progress} of ${m.target}`}`}>
            <ProgressBar value={m.progress / m.target} width={36} />
            <Text style={[styles.label, done && styles.doneTxt]} numberOfLines={1}>{done && <><Icon name="check" size={12} color={C.mint} /> </>}{missionLabel(m)}</Text>
            <Text style={[styles.num, done && styles.doneTxt]}>{done ? <>+{m.reward} <Coin size={11} /></> : `${m.progress}/${m.target}`}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', backgroundColor: '#151b3dcc', borderRadius: RADIUS.lg, padding: 12, gap: 9, borderWidth: 1, borderColor: C.line },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { color: C.text, fontSize: 15, fontWeight: '800' },
  pot: { color: C.gold, fontFamily: F.mono, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { flex: 1, color: '#ffffffdd', fontSize: 13, fontWeight: '600' },
  num: { color: C.dim, fontFamily: F.mono, fontSize: 12 },
  doneTxt: { color: C.mint, fontWeight: '800' },
});
