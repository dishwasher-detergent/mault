import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import adminDe from "@/locales/de/admin.json";
import authDe from "@/locales/de/auth.json";
import binsDe from "@/locales/de/bins.json";
import buildDe from "@/locales/de/build.json";
import calibrationDe from "@/locales/de/calibration.json";
import cardsDe from "@/locales/de/cards.json";
import collectionsDe from "@/locales/de/collections.json";
import commonDe from "@/locales/de/common.json";
import companiesDe from "@/locales/de/companies.json";
import gamesDe from "@/locales/de/games.json";
import landingDe from "@/locales/de/landing.json";
import notificationsDe from "@/locales/de/notifications.json";
import scannerDe from "@/locales/de/scanner.json";
import settingsDe from "@/locales/de/settings.json";
import adminEn from "@/locales/en/admin.json";
import authEn from "@/locales/en/auth.json";
import binsEn from "@/locales/en/bins.json";
import buildEn from "@/locales/en/build.json";
import calibrationEn from "@/locales/en/calibration.json";
import cardsEn from "@/locales/en/cards.json";
import collectionsEn from "@/locales/en/collections.json";
import commonEn from "@/locales/en/common.json";
import companiesEn from "@/locales/en/companies.json";
import gamesEn from "@/locales/en/games.json";
import landingEn from "@/locales/en/landing.json";
import notificationsEn from "@/locales/en/notifications.json";
import scannerEn from "@/locales/en/scanner.json";
import settingsEn from "@/locales/en/settings.json";

export const SUPPORTED_LANGUAGES = ["en", "de"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NATIVE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  de: "Deutsch",
};

const LANGUAGE_STORAGE_KEY = "language";

const resources = {
  en: {
    common: commonEn,
    landing: landingEn,
    build: buildEn,
    auth: authEn,
    collections: collectionsEn,
    scanner: scannerEn,
    bins: binsEn,
    calibration: calibrationEn,
    cards: cardsEn,
    companies: companiesEn,
    notifications: notificationsEn,
    admin: adminEn,
    games: gamesEn,
    settings: settingsEn,
  },
  de: {
    common: commonDe,
    landing: landingDe,
    build: buildDe,
    auth: authDe,
    collections: collectionsDe,
    scanner: scannerDe,
    bins: binsDe,
    calibration: calibrationDe,
    cards: cardsDe,
    companies: companiesDe,
    notifications: notificationsDe,
    admin: adminDe,
    games: gamesDe,
    settings: settingsDe,
  },
};

function getInitialLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(stored ?? "")) {
    return stored as SupportedLanguage;
  }
  return navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
}

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  ns: Object.keys(resources.en),
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
});

export default i18n;
