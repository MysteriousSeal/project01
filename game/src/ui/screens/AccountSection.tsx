import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Account, AccountApi, AuthResult, EmailMode } from '../../services/account';
import { appleAvailable, appleIdToken } from '../../services/appleAuth';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { SectionLabel } from '../components/Page';
import { C, CARD, RADIUS } from '../theme';

type Props = { api: AccountApi; onSwitched: () => Promise<void>; beforeAuth: () => Promise<void> };

type Step = { kind: 'idle' } | { kind: 'busy' } | { kind: 'code'; email: string; mode: EmailMode };

const PROVIDER_NAMES: Record<string, string> = { apple: 'Apple', email: 'email', google: 'Google' };

export function AccountSection({ api, onSwitched, beforeAuth }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [apple, setApple] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    api.current().then((a) => alive && setAccount(a));
    appleAvailable().then((ok) => alive && setApple(ok));
    return () => {
      alive = false;
    };
  }, [api]);

  const finish = async (result: AuthResult) => {
    if (result.status === 'error') setMessage({ text: result.message, error: true });
    else if (result.status === 'linked') setMessage({ text: 'Account linked. Your progress is now safe in the cloud.', error: false });
    else if (result.status === 'switched') {
      await onSwitched();
      setMessage({ text: 'Signed in.', error: false });
    }
    setAccount(await api.current());
    setStep({ kind: 'idle' });
    setCode('');
  };

  const signInWithApple = async () => {
    setMessage(null);
    setStep({ kind: 'busy' });
    const token = await appleIdToken();
    if (token === 'cancelled') return setStep({ kind: 'idle' });
    if (!token) return finish({ status: 'error', message: "Apple didn't return a sign-in token. Try again." });
    await beforeAuth();
    await finish(await api.withApple(token));
  };

  const sendCode = async () => {
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setMessage({ text: "That email address doesn't look right.", error: true });
    setMessage(null);
    setStep({ kind: 'busy' });
    await beforeAuth();
    const sent = await api.sendEmailCode(address);
    if (sent.status === 'error') {
      setMessage({ text: sent.message, error: true });
      return setStep({ kind: 'idle' });
    }
    setStep({ kind: 'code', email: address, mode: sent.mode });
    setMessage({ text: `We sent a 6-digit code to ${address}.`, error: false });
  };

  const verify = async () => {
    if (step.kind !== 'code') return;
    if (!/^\d{6}$/.test(code.trim())) return setMessage({ text: 'Enter the 6-digit code from the email.', error: true });
    const { email: address, mode } = step;
    setStep({ kind: 'busy' });
    await finish(await api.verifyEmailCode(address, code, mode));
  };

  if (!account) return null;
  const busy = step.kind === 'busy';
  const linkedWith = account.providers.map((p) => PROVIDER_NAMES[p] ?? p).join(' and ');

  return (
    <>
      <SectionLabel>ACCOUNT</SectionLabel>
      <View style={styles.card}>
        <View style={styles.status}>
          <Icon name={account.guest ? 'user-astronaut' : 'check'} size={18} color={account.guest ? C.gold : C.mint} style={styles.icon} />
          <View style={styles.body}>
            <Text style={styles.label}>{account.guest ? 'Guest account' : `Linked with ${linkedWith}`}</Text>
            <Text style={styles.desc}>
              {account.guest
                ? 'Your progress is backed up, but only this phone can get it back. Link an account to keep it if you change phones.'
                : `${account.email ? `${account.email}. ` : ''}Sign in with the same account on a new phone to restore your progress.`}
            </Text>
          </View>
        </View>

        {apple && !account.providers.includes('apple') && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={RADIUS.md}
            style={styles.apple}
            onPress={busy ? () => {} : signInWithApple}
          />
        )}

        {step.kind === 'code' ? (
          <View style={styles.form}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              placeholderTextColor={C.dim}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              style={[styles.input, styles.codeInput]}
              accessibilityLabel="Email code"
            />
            <Button label="Verify" variant="sky" onPress={verify} style={styles.btn} />
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={account.guest ? 'Email to link' : 'Email of another account'}
              placeholderTextColor={C.dim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              autoCorrect={false}
              editable={!busy}
              style={styles.input}
              accessibilityLabel="Email address"
            />
            <Button label="Send code" variant={busy ? 'muted' : 'sky'} onPress={busy ? undefined : sendCode} style={styles.btn} />
          </View>
        )}

        {busy && <ActivityIndicator color={C.sky} />}
        {message && <Text style={[styles.message, message.error && { color: C.danger }]}>{message.text}</Text>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { ...CARD, padding: 14, gap: 12 },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 26, textAlign: 'center', marginTop: 2 },
  body: { flex: 1 },
  label: { color: C.text, fontSize: 15, fontWeight: '800' },
  desc: { color: C.dim, fontSize: 12, lineHeight: 17, marginTop: 3 },
  apple: { height: 46 },
  form: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, color: C.text, fontSize: 15, fontWeight: '700', paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.sm, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  codeInput: { letterSpacing: 6, fontVariant: ['tabular-nums'] },
  btn: { minWidth: 96, paddingVertical: 11 },
  message: { color: C.mint, fontSize: 12, fontWeight: '700', lineHeight: 17 },
});
