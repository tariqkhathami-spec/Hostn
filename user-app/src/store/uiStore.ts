import { create } from 'zustand';
import { appStorage } from '../utils/storage';

interface UIState {
  onboardingSeen: boolean;
  locale: string;

  markOnboardingSeen: () => void;
  setLocale: (locale: string) => void;
  loadPreferences: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  onboardingSeen: false,
  locale: 'en',

  markOnboardingSeen: () => {
    appStorage.setOnboardingSeen(true);
    set({ onboardingSeen: true });
  },

  setLocale: (locale) => {
    appStorage.setLocale(locale);
    set({ locale });
  },

  loadPreferences: () => {
    set({
      onboardingSeen: appStorage.getOnboardingSeen(),
      locale: appStorage.getLocale(),
    });
  },
}));
