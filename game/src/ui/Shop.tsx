import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Save } from '../game/save';
import { Skin, SKINS } from '../game/skins';
import { TopBar } from './Screens';

export function Shop({ save, onChange, onClose }: { save: Save; onChange: (s: Save) => void; onClose: () => void }) {
  const tapSkin = (k: Skin) => {
    if (save.owned.includes(k.id)) onChange({ ...save, skin: k.id });
    else if (save.wallet >= k.price) onChange({ ...save, wallet: save.wallet - k.price, owned: [...save.owned, k.id], skin: k.id });
  };
  return (
    <View style={styles.full}>
      <TopBar save={save} />
      <Text style={styles.title}>SKINS</Text>
      <ScrollView contentContainerStyle={styles.grid}>
        {SKINS.map((k) => {
          const owned = save.owned.includes(k.id);
          const equipped = save.skin === k.id;
          const afford = save.wallet >= k.price;
          return (
            <Pressable key={k.id} onPress={() => tapSkin(k)} style={[styles.card, equipped && styles.equipped, !owned && !afford && { opacity: 0.45 }]}>
              <View style={styles.preview}>
                <View style={[styles.dot, { width: 10, height: 10, backgroundColor: k.trail, opacity: 0.4 }]} />
                <View style={[styles.dot, { width: 16, height: 16, backgroundColor: k.trail, opacity: 0.7 }]} />
                <View style={[styles.dot, { width: 28, height: 28, backgroundColor: k.ball, borderWidth: k.id === 'void' ? 2 : 0, borderColor: '#fff' }]} />
              </View>
              <Text style={styles.name}>{k.name}</Text>
              <Text style={[styles.price, owned && { color: equipped ? '#7dffb2' : '#ffffffaa' }]}>{equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `● ${k.price}`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable style={styles.back} onPress={onClose}>
        <Text style={styles.backTxt}>BACK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0b1026', paddingTop: 110, alignItems: 'center' },
  title: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: 4, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 30 },
  card: { width: 104, alignItems: 'center', backgroundColor: '#ffffff10', borderRadius: 16, paddingVertical: 14, borderWidth: 2, borderColor: 'transparent' },
  equipped: { borderColor: '#7dffb2' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34 },
  dot: { borderRadius: 20 },
  name: { color: '#fff', fontWeight: '800', marginTop: 8 },
  price: { color: '#ffd34d', fontWeight: '900', marginTop: 4, fontSize: 13 },
  back: { marginBottom: 40, marginTop: 10, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30, backgroundColor: '#ffffff18' },
  backTxt: { color: '#fff', fontWeight: '900', letterSpacing: 2 },
});
