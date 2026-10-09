import { useEffect, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { formatClock } from '../../game/scoring';
import { now } from '../time';

type Props = { startedAt: number; frozenMs: number | null; style?: StyleProp<TextStyle> };

// Owns its own ticking so only this text re-renders every 250ms, not the whole board.
export function Clock({ startedAt, frozenMs, style }: Props) {
  const [nowMs, setNowMs] = useState(now);
  useEffect(() => {
    if (frozenMs !== null) return;
    const id = setInterval(() => setNowMs(now()), 250);
    return () => clearInterval(id);
  }, [frozenMs]);
  return <Text style={style}>{formatClock(frozenMs ?? nowMs - startedAt)}</Text>;
}
