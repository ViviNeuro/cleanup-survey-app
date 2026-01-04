// src/i18n/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// IMPORTANT: use require for Expo compatibility
const en = require("./locales/en.json");
const id = require("./locales/id.json");

export async function initI18n() {
  if (i18n.isInitialized) return;

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        id: { translation: id },
      },
      lng: "en",          // default language
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
    });
}

export default i18n;