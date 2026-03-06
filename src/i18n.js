/**
 * RPM.ENERGY — i18next configuration
 * Supports: English (en), Hindi (hi)
 * Language detection order: localStorage → navigator → fallback 'en'
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';
import hi from './locales/hi/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Persist the user's choice in localStorage under key 'rpm_lang'
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'rpm_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
