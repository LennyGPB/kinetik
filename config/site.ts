export const siteConfig = {
  name: "Kinetik",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  social: {
    x: "https://x.com",
    instagram: "https://instagram.com",
    youtube: "https://youtube.com",
    discord: "https://discord.com",
  },
} as const;
