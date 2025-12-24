import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import zhTranslation from './locales/zh.json';

// i18n 配置
i18n
  // 语言检测器：自动检测用户语言偏好
  .use(LanguageDetector)
  // 绑定到 react-i18next
  .use(initReactI18next)
  // 初始化配置
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      zh: {
        translation: zhTranslation
      }
    },
    fallbackLng: 'en', // 默认回退语言
    interpolation: {
      escapeValue: false // React 已经自带 XSS 防护
    },
    detection: {
      // 语言检测优先级：localStorage -> navigator
      order: ['localStorage', 'navigator'],
      // 存储到 localStorage 的 key
      lookupLocalStorage: 'i18nextLng',
      // 缓存用户选择的语言
      caches: ['localStorage']
    }
  });

export default i18n;
