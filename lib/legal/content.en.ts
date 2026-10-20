import type { LegalData } from "./data";
import type { LegalDoc, LegalSlug } from "./types";

export function legalEn(d: LegalData): Record<LegalSlug, LegalDoc> {
  const vat = d.vatExempt ? "VAT not applicable, article 293 B of the French General Tax Code." : "";
  // Médiateur de la consommation : affiché seulement une fois renseigné dans config/legal.ts
  const mediator = d.mediator && `${d.mediator.name}, ${d.mediator.address} — [${d.mediator.url}](${d.mediator.url})`;

  return {
    legal: {
      title: "Legal notice",
      description: "Publisher, host and intellectual property of the Kinetik website.",
      sections: [
        {
          title: "Publisher",
          blocks: [
            "The Kinetik website and service are published by:",
            { list: [
              `${d.name}, ${d.status}`,
              `Address: ${d.address}`,
              `SIRET (French business ID): ${d.siret}`,
              ...(vat ? [vat] : []),
              `Email: ${d.contactEmail}`,
            ] },
            `Publication director: ${d.name}.`,
          ],
        },
        {
          title: "Hosting",
          blocks: [
            `The website is hosted by ${d.host.name}, ${d.host.address} — [${d.host.url.replace("https://", "")}](${d.host.url}).`,
            "Service data is stored with the providers listed in the [privacy policy](/privacy).",
          ],
        },
        {
          title: "Intellectual property",
          blocks: [
            "The Kinetik brand, logo, website, code, copy, visuals, video templates and music library are protected by intellectual property law. Any reproduction or reuse, in whole or in part, without written permission is prohibited, except as permitted by the [terms](/terms) for videos created with the service.",
          ],
        },
        {
          title: "Contact",
          blocks: [
            `For any question: ${d.contactEmail}. For your personal data: ${d.privacyEmail}.`,
          ],
        },
      ],
    },

    terms: {
      title: "Terms of use and sale",
      description: "Rules for using Kinetik, plans, credits, payment, withdrawal and liability.",
      intro: [
        `These terms (the "Terms") govern the use of the Kinetik service and purchases made on it. They are entered into between ${d.name}, ${d.status} (the "Publisher", "we") and any person who creates an account (the "User", "you").`,
        "By creating an account or placing an order, you accept the Terms in force on that date. Some clauses only apply to consumers (people acting outside their business) or only to businesses, and are marked as such. This English version is provided for convenience; the French version prevails in case of discrepancy.",
      ],
      sections: [
        {
          title: "1. The service",
          blocks: [
            "Kinetik is online software that uses artificial intelligence to generate motion design videos from the information you provide: description, copy, logos, images, website captures. You can then edit the video (including by chatting with the assistant), export it as MP4 and share it via a link.",
            "The service evolves regularly. We may add, change or remove features, without significantly reducing an active paid plan.",
          ],
        },
        {
          title: "2. Account",
          blocks: [
            "You must be at least 15 to create an account, and an adult (or authorised by a legal guardian) to make a purchase. You can sign up with an email address and password, or with Google or Discord.",
            "You agree to provide accurate information, keep your credentials confidential and not share your account. Only one free account is allowed per person. Any action taken from your account is deemed to be taken by you.",
            "You can delete your account at any time from Settings. Deletion is permanent: your projects, videos and remaining credits are lost, and any active subscription ends without refund, unless the right of withdrawal applies (section 7).",
          ],
        },
        {
          title: "3. Plans and credits",
          blocks: [
            "The service runs on credits, used for each paid action:",
            { list: [
              `Generating a motion design video or an animated signature: ${d.costs.generation} credits`,
              `Edit requested from the assistant: ${d.costs.edit} credits`,
              `Translating the copy: ${d.costs.translation} credit`,
              `Exporting a video of up to ${d.costs.shortMaxSeconds} seconds: ${d.costs.exportShort} credits; longer export: ${d.costs.exportLong} credits. Re-exporting the same project costs half price.`,
              `Pitch deck to video: ${d.costs.pitchAnalysis} credits to analyze the document, then ${d.costs.pitchCreation} credits to create the motion`,
              `Voiceover: ${d.costs.voicePerUnit} credit${d.costs.voicePerUnit > 1 ? "s" : ""} per ${d.costs.voiceCharacters} characters, per scene; script suggestion: ${d.costs.voiceScript} credit${d.costs.voiceScript > 1 ? "s" : ""}`,
              `Screen demo: ${d.costs.recordingImport} credits when the recording is imported`,
              `Instagram post or carousel: ${d.costs.post.generationBase} credits + ${d.costs.post.generationPerImage} credit${d.costs.post.generationPerImage > 1 ? "s" : ""} per image; edit: ${d.costs.post.edit} credit${d.costs.post.edit > 1 ? "s" : ""}; export: ${d.costs.post.exportPerImage} credit${d.costs.post.exportPerImage > 1 ? "s" : ""} per image`,
              `App Store and Google Play screenshots: ${d.costs.store.generationBase} credits + ${d.costs.store.generationPerPage} credit${d.costs.store.generationPerPage > 1 ? "s" : ""} per page; edit: ${d.costs.store.edit} credit${d.costs.store.edit > 1 ? "s" : ""}; export: ${d.costs.store.exportPerPage} credit${d.costs.store.exportPerPage > 1 ? "s" : ""} per page (iPhone and Android screenshot, banner included)`,
              "Re-exporting the same post or screenshots also costs half price.",
              "Restoring a previous version: free",
            ] },
            "The cost of an action is shown before you confirm it. If a paid action fails on our side, the credits are automatically refunded to your balance.",
            `Free plan: ${d.signupCredits} credits on sign-up, no card required. Videos exported on the free plan carry a Kinetik watermark and are limited to 720p.`,
            "Subscriptions (no watermark):",
            { list: d.paidPlans.map((p) => `${p.name}: ${p.credits} credits per month, export up to ${p.quality} — ${p.monthly} per month, or ${p.yearly} per year (${p.yearlyPerMonth} per month)`) },
            "Credit packs (one-off purchase):",
            { list: d.packs.map((p) => `${p.credits} credits: ${p.price}`) },
            "Credit rules:",
            { list: [
              "Subscription credits are granted at the start of each monthly period and expire at its end. Unused credits do not roll over.",
              "Sign-up credits and pack credits do not expire as long as your account exists.",
              "Subscription credits are used first.",
              "Credits are personal. They cannot be transferred, exchanged for cash or refunded, except when exercising the right of withdrawal or where the law provides otherwise.",
            ] },
          ],
        },
        {
          title: "4. Prices and payment",
          blocks: [
            `Prices are in euros, all taxes included. ${vat} The applicable prices are those shown when you order.`,
            "Payments are processed by Stripe, our payment provider. We never have access to your card numbers. Subscriptions are charged automatically at the start of each period (monthly or yearly). An invoice is available after each payment.",
            "If a payment fails, the subscription may be suspended until it is settled. Credits already granted remain usable until they expire.",
            "We may change our prices. A new price never applies to a period already paid. Subscribers are notified by email at least 30 days before it applies and can cancel before that date.",
          ],
        },
        {
          title: "5. Term, renewal and cancellation",
          blocks: [
            "Subscriptions run for one month or one year, as you choose, and renew automatically for the same term.",
            "You can cancel at any time from your Credits page in a few clicks. Cancellation takes effect at the end of the current period: you keep access and your credits until then, and no further payment is taken. Started periods are not refunded, except when exercising the right of withdrawal.",
            "Consumers on a yearly plan: we remind you by email, between three months and one month before renewal, that you can choose not to renew (article L215-1 of the French Consumer Code).",
            "We may suspend or close an account for breach of the Terms after a notice that has remained without effect for 8 days, or immediately for a serious breach (fraud, unlawful content, attack on the security of the service).",
          ],
        },
        {
          title: "6. Ordering",
          blocks: [
            "To order, you choose a plan, check its content and price, then confirm payment on Stripe's secure page. The order is confirmed by email. Credits are added to your account as soon as payment is confirmed.",
          ],
        },
        {
          title: "7. Right of withdrawal (consumers)",
          blocks: [
            "As a consumer, you have 14 days from your purchase (subscription or pack) to withdraw, without giving a reason.",
            "Credits are available immediately. By confirming your order, you expressly request that the service start before the withdrawal period ends. If you withdraw, we refund the amount paid, minus the value of the credits from that purchase you have already used, calculated pro rata to the price paid (article L221-25 of the French Consumer Code). If all the credits from the purchase have been used, the service has been fully performed and you can no longer withdraw (article L221-28, 1°).",
            `To withdraw, send us a clear statement at ${d.contactEmail}, for example using the template below. The refund is made within 14 days, using the same payment method.`,
            `Template: "To ${d.name}, ${d.address}, ${d.contactEmail}. I hereby give notice that I withdraw from the contract for [the subscription / the credit pack] ordered on [date]. Name: […]. Account email: […]. Date: […]."`,
          ],
        },
        {
          title: "8. Your content",
          blocks: [
            "You keep ownership of the material you upload or enter into Kinetik (copy, logos, images, sounds, website captures, briefs).",
            "You warrant that you hold the necessary rights to this material, and in particular that you only use website capture for sites you own or are authorised to reproduce. You will hold us harmless against any third-party claim in this respect.",
            "You grant us a free, non-exclusive, worldwide licence to host, reproduce, adapt and transmit this material to our technical providers (including the artificial intelligence provider), solely to provide the service and for as long as necessary.",
          ],
        },
        {
          title: "9. The videos you create",
          blocks: [
            "The videos you create belong to you. We assign to you, worldwide and for the full term of the rights, any rights we may hold in the elements generated for you. You may use your videos freely, including for commercial and advertising purposes.",
            "Templates, fonts and music from the Kinetik library may be used within your videos, but not extracted or redistributed separately. The watermark on free-plan videos must not be removed.",
            "AI-generated elements may not be protected by copyright and may resemble content produced for other users: we do not guarantee their exclusivity.",
            `Showcase: you allow us to feature your videos as examples on the Kinetik website and our social media, free of charge and without exclusivity. You can object at any time by writing to ${d.contactEmail}: we then stop any new use within 30 days. We never feature a video whose share link is disabled, or one that contains personal data, without your express consent.`,
          ],
        },
        {
          title: "10. Share links",
          blocks: [
            "You can create a public share link for a video. Anyone with the link can then watch it. You are responsible for sharing it and can disable it at any time from the editor.",
          ],
        },
        {
          title: "11. Acceptable use",
          blocks: [
            "You may not use Kinetik to:",
            { list: [
              "create or distribute content that is unlawful, hateful, violent, defamatory, pornographic or involves minors;",
              "infringe third-party rights (copyright, trademarks, image rights, privacy) or impersonate a person or brand;",
              "produce misleading advertising or false claims;",
              "circumvent the limits of the service (multiple accounts to obtain free credits, removing the watermark, bypassing quotas);",
              "disrupt the service, attempt unauthorised access, scrape it, resell access to it or extract its code.",
            ] },
            "In case of breach, we may remove the content concerned, and suspend or close the account (section 5). To report unlawful content: " + d.contactEmail + ".",
          ],
        },
        {
          title: "12. Artificial intelligence",
          blocks: [
            "Videos and copy are produced automatically and may contain errors, approximations or unsuitable elements. Review each video before publishing it: you are responsible for its content, the commercial claims it makes and compliance with the rules that apply to its distribution, including any obligation to disclose AI-generated content.",
          ],
        },
        {
          title: "13. Availability",
          blocks: [
            "We make our best efforts to keep the service available at all times, but cannot guarantee it. It may be interrupted for maintenance, updates or a provider outage. Remember to download your videos: the service is not an archiving tool.",
          ],
        },
        {
          title: "14. Warranties and liability",
          blocks: [
            "Consumers: you benefit from the legal guarantee of conformity for digital content and services (articles L224-25-1 et seq. of the French Consumer Code) for as long as the service is supplied. If there is a defect, write to us: we will bring the service into conformity or, failing that, you may obtain a price reduction or terminate the contract.",
            "Businesses: the service is provided as is, under a best-efforts obligation. Our liability is limited to direct and foreseeable damage, and capped at the amount you paid in the 12 months preceding the event giving rise to the claim.",
            "We are not responsible for how you use your videos or for the content you provide. Nothing in the Terms limits our liability for gross negligence or wilful misconduct, or where the law prohibits it.",
          ],
        },
        {
          title: "15. Personal data",
          blocks: [
            "How we process your data is described in the [privacy policy](/privacy) and the [cookie policy](/cookies).",
          ],
        },
        {
          title: "16. Changes to the Terms",
          blocks: [
            "We may change the Terms, for example to reflect changes to the service or the law. Significant changes are notified by email or in the app at least 30 days before they take effect. If you do not accept them, you can cancel your subscription before that date.",
          ],
        },
        {
          title: mediator ? "17. Complaints and mediation" : "17. Complaints",
          blocks: [
            `For any complaint, write to us at ${d.contactEmail}. We reply within 15 business days.`,
            ...(mediator ? [`Consumers: if the dispute is not resolved, you can refer it free of charge to the consumer mediator, within one year of your written complaint: ${mediator}.`] : []),
          ],
        },
        {
          title: "18. Governing law",
          blocks: [
            "The Terms are governed by French law. Consumers residing in another European Union country keep the protection of the mandatory rules of their country of residence.",
            "In case of dispute, consumers may bring proceedings before the court of their place of residence or that of the Publisher. For businesses, the courts with jurisdiction over the Publisher's place of residence have exclusive jurisdiction.",
          ],
        },
      ],
    },

    privacy: {
      title: "Privacy policy",
      description: "What data Kinetik collects, why, who it is shared with, how long it is kept and your rights.",
      intro: [
        "This policy explains what personal data we process when you use Kinetik and how to exercise your rights. We do not sell your data or use it for advertising.",
      ],
      sections: [
        {
          title: "1. Data controller",
          blocks: [
            `${d.name}, ${d.status}, ${d.address} (SIRET ${d.siret}). Contact for your data: ${d.privacyEmail}.`,
          ],
        },
        {
          title: "2. Data we collect",
          blocks: [
            { list: [
              "Account: name, email address, password (stored with irreversible hashing), profile picture and identifier if you sign in with Google or Discord.",
              "Content: projects, descriptions, messages exchanged with the assistant, video versions, brand kit, uploaded files (logos, images, sounds), website captures and exported videos.",
              "Purchases: plan, credit history, customer ID and payment status sent by Stripe. We never receive your card numbers.",
              "Technical data: IP address, browser and device (for sessions), security logs.",
              "Correspondence: messages you send us by email.",
            ] },
          ],
        },
        {
          title: "3. Purposes and legal bases",
          blocks: [
            { list: [
              "Providing the service (account, generating, editing, exporting and sharing videos): performance of the contract.",
              "Managing payments, credits and invoicing: performance of the contract and legal accounting obligations.",
              "Securing the service and preventing abuse (rate limiting by IP address, detecting disposable emails, bots and multiple accounts): legitimate interest.",
              "Sending emails about your account and purchases (confirmations, renewal reminders, changes to the Terms): performance of the contract and legal obligation.",
              "Answering your requests: legitimate interest.",
              "Measuring site traffic in aggregate (page views, country, device type), without cookies: legitimate interest.",
              "Featuring some videos as examples (see the [terms](/terms), section 9): legitimate interest, with the right to object at any time.",
            ] },
            "If we ever send promotional emails, it will be with your consent, or about offers similar to those you have bought, with an unsubscribe link in every email.",
          ],
        },
        {
          title: "4. Recipients and providers",
          blocks: [
            "Your data is only accessible to the Publisher and to the technical providers that help run the service, each for its own task:",
            { list: [
              "Vercel (United States): hosting of the website and app, and cookieless traffic measurement (Vercel Web Analytics).",
              "Neon (database hosted in London, United Kingdom): accounts, projects, credit history.",
              "Cloudflare (R2 storage): uploaded files, captures and media.",
              "Amazon Web Services (Frankfurt, Germany): rendering of exported videos.",
              "Anthropic (United States): the artificial intelligence that generates and edits videos. It receives the content of your requests and the copy and images needed for generation.",
              "Upstash: rate limiting (IP address and technical identifiers, kept for a few hours at most).",
              "Stripe (Ireland and United States): payment and invoicing.",
              "Google and Discord: only if you choose to sign in with them.",
            ] },
            "Some providers are located outside the European Union. These transfers are covered by an adequacy decision of the European Commission (including the Data Privacy Framework for certified US companies, and the decision on the United Kingdom) or by the Commission's standard contractual clauses.",
            "We may also disclose data to authorities where required by law.",
          ],
        },
        {
          title: "5. Retention periods",
          blocks: [
            { list: [
              "Account and content: as long as your account exists. An account inactive for 3 years is deleted, after a warning email.",
              "After account deletion: your data is erased from our database immediately, and your files within 30 days. Technical backups are overwritten within 30 days at most.",
              "Accounting records (invoices, payments): 10 years, as required by the French Commercial Code.",
              "Sign-in sessions: 30 days.",
              "Security data and technical logs: 12 months at most.",
              "Correspondence with us: as long as needed to handle your request, then the applicable limitation period where necessary.",
            ] },
          ],
        },
        {
          title: "6. Your rights",
          blocks: [
            "You have the right to access, rectify, erase, restrict, port and object to the processing of your data, and to set instructions for what happens to it after your death.",
            `You can edit your profile and delete your account directly from Settings. For other requests, write to ${d.privacyEmail}. We reply within one month. We may ask you to prove your identity if in doubt.`,
            "If you believe your rights are not respected, you can lodge a complaint with the CNIL, the French data protection authority ([cnil.fr](https://www.cnil.fr)), or with the authority of your country.",
          ],
        },
        {
          title: "7. Security",
          blocks: [
            "Traffic is encrypted (HTTPS), passwords are never stored in plain text, files are kept in private storage only accessible to their owner, and access to administration tools is restricted.",
          ],
        },
        {
          title: "8. Children",
          blocks: [
            "Kinetik is not intended for children under 15. If you believe a child under 15 has given us data, contact us so we can delete it.",
          ],
        },
        {
          title: "9. Cookies",
          blocks: ["See our [cookie policy](/cookies)."],
        },
        {
          title: "10. Changes",
          blocks: [
            "We may update this policy. If there is a significant change, we will let you know by email or in the app.",
          ],
        },
      ],
    },

    cookies: {
      title: "Cookie policy",
      description: "The cookies Kinetik uses and how to manage them.",
      intro: [
        "A cookie is a small file stored on your device when you visit a website. Kinetik only uses cookies that are strictly necessary for it to work: no advertising or analytics cookies. These cookies do not require consent, which is why no banner is shown.",
      ],
      sections: [
        {
          title: "Cookies and storage we use",
          blocks: [
            { list: [
              "kinetik_session: keeps you signed in to your account. Duration: 30 days.",
              "KINETIK_LOCALE: remembers your chosen language. Duration: 1 year.",
              "Theme preference (light or dark): saved in your browser's local storage, never sent to our servers.",
            ] },
          ],
        },
        {
          title: "Traffic measurement",
          blocks: [
            "We use Vercel Web Analytics to understand how the site is used (page views, country, device and browser type). It sets no cookies and reads nothing from your device: each visitor is counted using a technical fingerprint that is renewed every day, which cannot identify you or track you across websites. Results are statistical only.",
          ],
        },
        {
          title: "Third-party services",
          blocks: [
            "When you pay, you are redirected to a secure Stripe page, which uses its own cookies to prevent fraud. If you sign in with Google or Discord, those services set their cookies on their own pages. These cookies are governed by their respective policies.",
          ],
        },
        {
          title: "Managing cookies",
          blocks: [
            "You can delete or block cookies in your browser settings. If you block the session cookie, you will not be able to sign in.",
            "If we ever add cookies that require consent (such as analytics), we will update this page and ask for your consent first.",
          ],
        },
      ],
    },
  };
}
