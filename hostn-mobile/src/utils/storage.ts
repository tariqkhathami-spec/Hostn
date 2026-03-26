import * as SecureStore from 'expo-secure-store';
import { MMKV } from 'react-native-mmkv';

// MMKV for non-sensitive app state (fast, synchronous)
export const mmkv = new MMKV({ id: 'hostn-app-storage' });

// SecureStore for sensitive data (tokens)
export const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('hostn_token');
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync('hostn_token', token);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync('hostn_token');
  },
};

// MMKV helpers for app state
export const appStorage = {
  getOnboardingComplete(): boolean {
    return mmkv.getBoolean('onboarding_complete') ?? false;
  },

  setOnboardingComplete(value: boolean): void {
    mmkv.set('onboarding_complete', value);
  },

  getLanguage(): string {
    return mmkv.getString('language') ?? 'en';
  },

  setLanguage(lang: string): void {
    mmkv.set('language', lang);
  },

  getUserJson(): string | undefined {
    return mmkv.getString('user_data');
  },

  setUserJson(json: string): void {
    mmkv.set('user_data', json);
  },

  removeUserJson(): void {
    mmkv.delete('user_data');
  },
};
