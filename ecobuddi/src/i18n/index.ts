import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'
import hi from './locales/hi.json'
import ar from './locales/ar.json'
import fr from './locales/fr.json'
import pt from './locales/pt.json'
import th from './locales/th.json'
import yo from './locales/yo.json'
import ml from './locales/ml.json'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    hi: { translation: hi },
    ar: { translation: ar },
    fr: { translation: fr },
    pt: { translation: pt },
    th: { translation: th },
    yo: { translation: yo },
    ml: { translation: ml },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
