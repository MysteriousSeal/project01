import { Alert } from 'react-native';
import type { Save } from '../../game/meta/save';
import { progressSummary, recommendedSource, SaveSource } from '../../game/meta/sync';

const describe = (s: Save) => {
  const p = progressSummary(s);
  return `Level ${p.level} · ${p.wallet} coins · best ${p.best} · ${p.games} games`;
};

/** Asks which progress to keep when signing in to an account that already has some. */
export const chooseProgress = (local: Save, remote: Save) =>
  new Promise<SaveSource>((resolve) => {
    const best = recommendedSource(local, remote);
    Alert.alert(
      'Choose your progress',
      `This account already has progress.\n\nAccount: ${describe(remote)}\nThis phone: ${describe(local)}\n\nThe other one will be replaced.`,
      [
        { text: best === 'local' ? 'Keep this phone (recommended)' : 'Keep this phone', onPress: () => resolve('local') },
        { text: best === 'remote' ? 'Use account progress (recommended)' : 'Use account progress', onPress: () => resolve('remote'), style: 'default' },
      ],
      { cancelable: false },
    );
  });
