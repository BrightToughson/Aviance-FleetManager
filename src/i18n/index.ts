import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import tw from './locales/tw.json';
import ga from './locales/ga.json';
import ha from './locales/ha.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  tw: { translation: tw },
  ga: { translation: ga },
  ha: { translation: ha },
  fr: { translation: fr },
  ar: { translation: ar },
  es: { translation: es },
};

const LANGUAGE_STORE_KEY = '@app_language';

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORE_KEY);

  if (!savedLanguage) {
    const deviceLanguage = Localization.getLocales()[0].languageCode;
    savedLanguage = resources[deviceLanguage as keyof typeof resources] ? deviceLanguage : 'en';
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage || 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // react already safes from xss
      },
    });
};

initI18n();

export default i18n;
