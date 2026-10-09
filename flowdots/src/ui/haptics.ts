import * as Haptics from 'expo-haptics';

export type HapticKind = 'step' | 'connect' | 'solved' | 'tap';

// Haptics are best-effort: unsupported devices/web reject, and that must never surface.
export function haptic(kind: HapticKind): void {
  const play =
    kind === 'solved'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : kind === 'connect'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : Haptics.selectionAsync();
  play.catch(() => {});
}
