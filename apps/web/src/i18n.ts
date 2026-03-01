import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import hiCommon from './locales/hi/common.json';
import knCommon from './locales/kn/common.json';
import frCommon from './locales/fr/common.json';
import deCommon from './locales/de/common.json';
import esCommon from './locales/es/common.json';
import zhCommon from './locales/zh/common.json';

const resources = {
  en: { translation: enCommon },
  hi: { translation: hiCommon },
  kn: { translation: knCommon },
  fr: { translation: frCommon },
  de: { translation: deCommon },
  es: { translation: esCommon },
  zh: { translation: zhCommon },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'kn', 'fr', 'de', 'es', 'zh'],

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'vidya-language'
    },

    interpolation: { escapeValue: false },
    react: { useSuspense: false }
  });

export default i18n;
