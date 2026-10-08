import { FontAwesome6 } from '@expo/vector-icons';
import { StyleProp, TextStyle } from 'react-native';
import { C } from '../theme';

export type IconName =
  | 'house'
  | 'cart-shopping'
  | 'gear'
  | 'coins'
  | 'check'
  | 'chevron-right'
  | 'fire'
  | 'bullseye'
  | 'skull'
  | 'gem'
  | 'bolt'
  | 'heart-crack'
  | 'shield-halved'
  | 'magnet'
  | 'ghost'
  | 'calendar-day'
  | 'rocket'
  | 'gift'
  | 'tag'
  | 'box-open'
  | 'layer-group'
  | 'trophy'
  | 'rotate-right'
  | 'wifi'
  | 'user-astronaut'
  | 'earth-americas'
  | 'compass'
  | 'meteor'
  | 'gamepad'
  | 'ranking-star'
  | 'chevron-left'
  | 'volume-high';

type Props = { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> };

export function Icon({ name, size = 16, color = C.text, style }: Props) {
  return <FontAwesome6 name={name} size={size} color={color} solid style={style} />;
}

export function Coin({ size = 13, color = C.gold, style }: { size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Icon name="coins" size={size} color={color} style={style} />;
}
