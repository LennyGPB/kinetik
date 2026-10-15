import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({ locales: ["en", "fr"], defaultLocale: "en", localePrefix: "always", localeCookie: { name: "KINETIK_LOCALE", maxAge: 31536000 } });
