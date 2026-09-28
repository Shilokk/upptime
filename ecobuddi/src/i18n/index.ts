import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'
import pt from './locales/pt.json'
import th from './locales/th.json'
import yo from './locales/yo.json'
import ml from './locales/ml.json'
import zh from './locales/zh.json'
import vi from './locales/vi.json'
import si from './locales/si.json'
import id from './locales/id.json'
import ne from './locales/ne.json'
import sw from './locales/sw.json'
import bn from './locales/bn.json'
import ko from './locales/ko.json'
import hr from './locales/hr.json'
import ta from './locales/ta.json'
import kk from './locales/kk.json'
import ru from './locales/ru.json'
import ur from './locales/ur.json'
import fr from './locales/fr.json'
import hi from './locales/hi.json'
import ar from './locales/ar.json'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    pt: { translation: pt },
    th: { translation: th },
    yo: { translation: yo },
    ml: { translation: ml },
    zh: { translation: zh },
    vi: { translation: vi },
    si: { translation: si },
    id: { translation: id },
    ne: { translation: ne },
    sw: { translation: sw },
    bn: { translation: bn },
    ko: { translation: ko },
    hr: { translation: hr },
    ta: { translation: ta },
    kk: { translation: kk },
    ru: { translation: ru },
    ur: { translation: ur },
    fr: { translation: fr },
    hi: { translation: hi },
    ar: { translation: ar },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
