import * as SecureStore from 'expo-secure-store';
import { createMMKV, type MMKV } from 'react-native-mmkv';

let storage: MMKV;

function getStorage(): MMKV {
  if (!storage) {
    storage = createMMKV({ id: 'hostn-user-app' });
  }
  return storage;
}

// SecureStore - for sensitive data (tokens)
export const secureStorage = {
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync('hostn_user_token');
  },
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync('hostn_user_token', token);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync('hostn_user_refresh_token');
  },
  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync('hostn_user_refresh_token', token);
  },
  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync('hostn_user_token');
    await SecureStore.deleteItemAsync('hostn_user_refresh_token');
  },
};

// MMKV - for non-sensitive preferences
export const appStorage = {
  getOnboardingSeen(): boolean {
    return getStorage().getBoolean('onboarding_seen') ?? false;
  },
  setOnboardingSeen(seen: boolean): void {
    getStorage().set('onboarding_seen', seen);
  },
  getLocale(): string {
    return getStorage().getString('locale') ?? 'en';
  },
  setLocale(locale: string): void {
    getStorage().set('locale', locale);
  },
  getString(key: string): string | undefined {
    return getStorage().getString(key);
  },
  setString(key: string, value: string): void {
    getStorage().set(key, value);
  },
  remove(key: string): void {
    getStorage().remove(key);
  },
};
