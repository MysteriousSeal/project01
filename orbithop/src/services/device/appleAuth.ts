import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export const appleAvailable = () => (Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync().catch(() => false) : Promise.resolve(false));

export async function appleIdToken(): Promise<string | null | 'cancelled'> {
  try {
    const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL] });
    return credential.identityToken ?? null;
  } catch (e) {
    return (e as { code?: string }).code === 'ERR_REQUEST_CANCELED' ? 'cancelled' : null;
  }
}
