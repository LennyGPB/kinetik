import type { LegalData } from "./data";
import type { LegalDoc, LegalSlug } from "./types";

export function legalFr(d: LegalData): Record<LegalSlug, LegalDoc> {
  const vat = d.vatExempt ? "TVA non applicable, article 293 B du Code général des impôts." : "";
  // Médiateur de la consommation : affiché seulement une fois renseigné dans config/legal.ts
  const mediator = d.mediator && `${d.mediator.name}, ${d.mediator.address} — [${d.mediator.url}](${d.mediator.url})`;

  return {
    legal: {
      title: "Mentions légales",
      description: "Éditeur, hébergeur et propriété intellectuelle du site Kinetik.",
      sections: [
        {
          title: "Éditeur du site",
          blocks: [
            "Le site et le service Kinetik sont édités par :",
            { list: [
              `${d.name}, ${d.status}`,
              `Adresse : ${d.address}`,
              `SIRET : ${d.siret}`,
              ...(vat ? [vat] : []),
              `Email : ${d.contactEmail}`,
            ] },
            `Directeur de la publication : ${d.name}.`,
          ],
        },
        {
          title: "Hébergement",
          blocks: [
            `Le site est hébergé par ${d.host.name}, ${d.host.address} — [${d.host.url.replace("https://", "")}](${d.host.url}).`,
            "Les données du service sont stockées chez les prestataires listés dans la [politique de confidentialité](/privacy).",
          ],
        },
        {
          title: "Propriété intellectuelle",
          blocks: [
            "La marque Kinetik, le logo, le site, son code, ses textes, ses visuels, ses modèles de vidéos et sa bibliothèque musicale sont protégés par le droit de la propriété intellectuelle. Toute reproduction ou réutilisation, totale ou partielle, sans autorisation écrite est interdite, sauf dans les limites prévues par les [conditions générales](/terms) pour les vidéos créées avec le service.",
          ],
        },
        {
          title: "Contact",
          blocks: [
            `Pour toute question : ${d.contactEmail}. Pour vos données personnelles : ${d.privacyEmail}.`,
          ],
        },
      ],
    },

    terms: {
      title: "Conditions générales d'utilisation et de vente",
      description: "Règles d'utilisation de Kinetik, offres, crédits, paiement, rétractation et responsabilités.",
      intro: [
        `Les présentes conditions générales (les « Conditions ») encadrent l'utilisation du service Kinetik et les achats qui y sont réalisés. Elles sont conclues entre ${d.name}, ${d.status} (l'« Éditeur », « nous »), et toute personne qui crée un compte (l'« Utilisateur », « vous »).`,
        "En créant un compte ou en passant commande, vous acceptez les Conditions en vigueur à cette date. Certaines clauses ne s'appliquent qu'aux consommateurs (personnes agissant hors de leur activité professionnelle) ou qu'aux professionnels : elles sont signalées comme telles.",
      ],
      sections: [
        {
          title: "1. Le service",
          blocks: [
            "Kinetik est un logiciel en ligne qui génère des vidéos de motion design à l'aide de l'intelligence artificielle à partir des informations que vous fournissez : description, textes, logos, images, captures de sites web. Vous pouvez ensuite modifier la vidéo (notamment en discutant avec l'assistant), l'exporter en MP4 et la partager par lien.",
            "Le service évolue régulièrement. Nous pouvons en ajouter, modifier ou retirer des fonctionnalités, sans réduire de façon importante une offre payante en cours.",
          ],
        },
        {
          title: "2. Compte",
          blocks: [
            "Vous devez avoir au moins 15 ans pour créer un compte, et être majeur (ou autorisé par un représentant légal) pour effectuer un achat. Vous pouvez vous inscrire avec une adresse email et un mot de passe, ou via Google ou Discord.",
            "Vous vous engagez à fournir des informations exactes, à garder vos identifiants confidentiels et à ne pas partager votre compte. Un seul compte gratuit est autorisé par personne. Toute action réalisée depuis votre compte est réputée faite par vous.",
            "Vous pouvez supprimer votre compte à tout moment depuis les Réglages. La suppression est définitive : vos projets, vidéos et crédits restants sont perdus, et un abonnement en cours prend fin sans remboursement, sauf droit de rétractation applicable (article 7).",
          ],
        },
        {
          title: "3. Offres et crédits",
          blocks: [
            "Le service fonctionne avec des crédits, consommés à chaque action payante :",
            { list: [
              `Génération d'une vidéo motion design ou d'une signature animée : ${d.costs.generation} crédits`,
              `Modification demandée à l'assistant : ${d.costs.edit} crédits`,
              `Traduction des textes : ${d.costs.translation} crédit`,
              `Export d'une vidéo de ${d.costs.shortMaxSeconds} secondes maximum : ${d.costs.exportShort} crédits ; export plus long : ${d.costs.exportLong} crédits. Un nouvel export du même projet coûte moitié prix.`,
              `Pitch deck en vidéo : ${d.costs.pitchAnalysis} crédits pour l'analyse du document, puis ${d.costs.pitchCreation} crédits pour la création du motion`,
              `Voix off : ${d.costs.voicePerUnit} crédit${d.costs.voicePerUnit > 1 ? "s" : ""} par tranche de ${d.costs.voiceCharacters} caractères et par scène ; suggestion de script : ${d.costs.voiceScript} crédit${d.costs.voiceScript > 1 ? "s" : ""}`,
              `Démo d'écran : ${d.costs.recordingImport} crédits à l'import de l'enregistrement`,
              `Post Instagram ou carrousel : ${d.costs.post.generationBase} crédits + ${d.costs.post.generationPerImage} crédit${d.costs.post.generationPerImage > 1 ? "s" : ""} par image ; modification : ${d.costs.post.edit} crédit${d.costs.post.edit > 1 ? "s" : ""} ; export : ${d.costs.post.exportPerImage} crédit${d.costs.post.exportPerImage > 1 ? "s" : ""} par image`,
              `Captures App Store et Google Play : ${d.costs.store.generationBase} crédits + ${d.costs.store.generationPerPage} crédit${d.costs.store.generationPerPage > 1 ? "s" : ""} par page ; modification : ${d.costs.store.edit} crédit${d.costs.store.edit > 1 ? "s" : ""} ; export : ${d.costs.store.exportPerPage} crédit${d.costs.store.exportPerPage > 1 ? "s" : ""} par page (capture iPhone et Android, bannière offerte)`,
              "Un nouvel export du même post ou des mêmes captures coûte aussi moitié prix.",
              "Restaurer une ancienne version : gratuit",
            ] },
            "Le coût d'une action est affiché avant sa validation. Si une action payante échoue de notre fait, les crédits débités vous sont automatiquement restitués.",
            `Offre gratuite : ${d.signupCredits} crédits offerts à l'inscription, sans carte bancaire. Les vidéos exportées avec l'offre gratuite portent un filigrane Kinetik et sont limitées à la 720p.`,
            "Abonnements (sans filigrane) :",
            { list: d.paidPlans.map((p) => `${p.name} : ${p.credits} crédits par mois, export jusqu'en ${p.quality} — ${p.monthly} par mois, ou ${p.yearly} par an (soit ${p.yearlyPerMonth} par mois)`) },
            "Packs de crédits (achat unique) :",
            { list: d.packs.map((p) => `${p.credits} crédits : ${p.price}`) },
            "Règles des crédits :",
            { list: [
              "Les crédits d'abonnement sont attribués au début de chaque période mensuelle et expirent à la fin de celle-ci. Les crédits non utilisés ne sont pas reportés.",
              "Les crédits offerts à l'inscription et les crédits de packs n'expirent pas tant que votre compte existe.",
              "Les crédits d'abonnement sont consommés en premier.",
              "Les crédits sont personnels. Ils ne sont ni cessibles, ni convertibles en argent, ni remboursables, sauf exercice du droit de rétractation ou disposition légale contraire.",
            ] },
          ],
        },
        {
          title: "4. Prix et paiement",
          blocks: [
            `Les prix sont indiqués en euros, toutes taxes comprises. ${vat} Les prix en vigueur sont ceux affichés au moment de la commande.`,
            "Le paiement est traité par Stripe, notre prestataire de paiement. Nous n'avons jamais accès à vos numéros de carte. Les abonnements sont prélevés automatiquement au début de chaque période (mensuelle ou annuelle). Une facture est disponible après chaque paiement.",
            "En cas d'échec de paiement, l'abonnement peut être suspendu jusqu'à régularisation. Les crédits déjà attribués restent utilisables jusqu'à leur date d'expiration.",
            "Nous pouvons modifier nos prix. Un nouveau prix ne s'applique jamais à une période déjà payée. Les abonnés sont prévenus par email au moins 30 jours avant son application et peuvent résilier avant cette date.",
          ],
        },
        {
          title: "5. Durée, renouvellement et résiliation",
          blocks: [
            "Les abonnements sont conclus pour un mois ou un an, selon votre choix, et se renouvellent automatiquement pour la même durée.",
            "Vous pouvez résilier à tout moment depuis votre espace Crédits, en quelques clics. La résiliation prend effet à la fin de la période en cours : vous gardez l'accès et vos crédits jusque-là, et aucun nouveau prélèvement n'a lieu. Les périodes entamées ne sont pas remboursées, sauf exercice du droit de rétractation.",
            "Abonnés consommateurs en formule annuelle : nous vous rappelons par email, entre trois mois et un mois avant l'échéance, que vous pouvez ne pas reconduire votre abonnement (article L215-1 du Code de la consommation).",
            "Nous pouvons suspendre ou fermer un compte en cas de manquement aux Conditions, après une mise en demeure restée sans effet pendant 8 jours, ou immédiatement en cas de manquement grave (fraude, contenu illicite, atteinte à la sécurité du service).",
          ],
        },
        {
          title: "6. Commande",
          blocks: [
            "Pour commander, vous choisissez une offre, vérifiez son contenu et son prix, puis validez le paiement sur la page sécurisée de Stripe. La commande est confirmée par email. Les crédits sont crédités sur votre compte dès la confirmation du paiement.",
          ],
        },
        {
          title: "7. Droit de rétractation (consommateurs)",
          blocks: [
            "En tant que consommateur, vous disposez d'un délai de 14 jours à compter de votre achat (abonnement ou pack) pour vous rétracter, sans avoir à vous justifier.",
            "Les crédits sont disponibles immédiatement. En validant votre commande, vous demandez expressément que le service commence avant la fin du délai de rétractation. Si vous vous rétractez, nous vous remboursons le montant payé, déduction faite de la valeur des crédits de cet achat que vous avez déjà utilisés, calculée au prorata du prix payé (article L221-25 du Code de la consommation). Si tous les crédits de l'achat ont été utilisés, le service a été entièrement exécuté et vous ne pouvez plus vous rétracter (article L221-28, 1°).",
            `Pour vous rétracter, envoyez-nous une déclaration claire à ${d.contactEmail}, par exemple en utilisant le modèle ci-dessous. Le remboursement est effectué sous 14 jours, avec le même moyen de paiement.`,
            `Modèle : « À l'attention de ${d.name}, ${d.address}, ${d.contactEmail}. Je vous notifie par la présente ma rétractation du contrat portant sur [l'abonnement / le pack de crédits] commandé le [date]. Nom : […]. Email du compte : […]. Date : […]. »`,
          ],
        },
        {
          title: "8. Vos contenus",
          blocks: [
            "Vous restez propriétaire des éléments que vous importez ou saisissez dans Kinetik (textes, logos, images, sons, captures de sites, briefs).",
            "Vous garantissez détenir les droits nécessaires sur ces éléments, et notamment n'utiliser la capture de sites web que pour des sites qui vous appartiennent ou que vous êtes autorisé à reproduire. Vous nous garantissez contre toute réclamation de tiers à ce sujet.",
            "Vous nous accordez une licence gratuite, non exclusive et mondiale pour héberger, reproduire, adapter et transmettre ces éléments à nos prestataires techniques (y compris le fournisseur d'intelligence artificielle), uniquement pour vous fournir le service et pendant la durée nécessaire.",
          ],
        },
        {
          title: "9. Les vidéos créées",
          blocks: [
            "Les vidéos que vous créez vous appartiennent. Nous vous cédons, pour le monde entier et pour toute la durée des droits, les droits que nous pourrions détenir sur les éléments générés pour vous. Vous pouvez utiliser vos vidéos librement, y compris à des fins commerciales et publicitaires.",
            "Les modèles, polices et musiques de la bibliothèque Kinetik peuvent être utilisés au sein de vos vidéos, mais pas extraits ni redistribués séparément. Le filigrane des vidéos de l'offre gratuite ne doit pas être retiré.",
            "Les éléments générés par intelligence artificielle peuvent ne pas être protégés par le droit d'auteur et ressembler à des contenus produits pour d'autres utilisateurs : nous ne garantissons pas leur exclusivité.",
            `Vitrine : vous nous autorisez à présenter vos vidéos à titre d'exemple sur le site Kinetik et nos réseaux sociaux, gratuitement et sans exclusivité. Vous pouvez vous y opposer à tout moment en écrivant à ${d.contactEmail} : nous cessons alors toute nouvelle diffusion dans un délai de 30 jours. Nous ne diffusons jamais une vidéo dont le lien de partage est désactivé ou qui contient des données personnelles sans votre accord exprès.`,
          ],
        },
        {
          title: "10. Liens de partage",
          blocks: [
            "Vous pouvez générer un lien de partage public pour une vidéo. Toute personne disposant du lien peut alors la visionner. Vous êtes responsable de sa diffusion et pouvez le désactiver à tout moment depuis l'éditeur.",
          ],
        },
        {
          title: "11. Utilisation acceptable",
          blocks: [
            "Il est interdit d'utiliser Kinetik pour :",
            { list: [
              "créer ou diffuser des contenus illicites, haineux, violents, diffamatoires, pornographiques ou impliquant des mineurs ;",
              "porter atteinte aux droits de tiers (droit d'auteur, marques, droit à l'image, vie privée) ou usurper l'identité d'une personne ou d'une marque ;",
              "réaliser de la publicité trompeuse ou des allégations mensongères ;",
              "contourner les limites du service (création de comptes multiples pour obtenir des crédits gratuits, contournement du filigrane ou des quotas) ;",
              "perturber le service, tenter d'y accéder sans autorisation, l'aspirer de façon automatisée, en revendre l'accès ou en extraire le code.",
            ] },
            "En cas de manquement, nous pouvons supprimer le contenu concerné, suspendre ou fermer le compte (article 5). Pour signaler un contenu illicite : " + d.contactEmail + ".",
          ],
        },
        {
          title: "12. Intelligence artificielle",
          blocks: [
            "Les vidéos et textes sont produits automatiquement et peuvent contenir des erreurs, des approximations ou des éléments inadaptés. Relisez chaque vidéo avant de la publier : vous êtes responsable de son contenu, des promesses commerciales qu'elle contient et du respect des règles applicables à sa diffusion, y compris les éventuelles obligations de signaler un contenu généré par IA.",
          ],
        },
        {
          title: "13. Disponibilité",
          blocks: [
            "Nous faisons nos meilleurs efforts pour que le service soit accessible en continu, sans pouvoir le garantir. Il peut être interrompu pour maintenance, mise à jour ou panne d'un prestataire. Pensez à télécharger vos vidéos : le service n'est pas un outil d'archivage.",
          ],
        },
        {
          title: "14. Garanties et responsabilité",
          blocks: [
            "Consommateurs : vous bénéficiez de la garantie légale de conformité des contenus et services numériques (articles L224-25-1 et suivants du Code de la consommation) pendant toute la durée de fourniture du service. En cas de défaut, écrivez-nous : nous mettrons le service en conformité ou, à défaut, vous pourrez obtenir une réduction de prix ou la résolution du contrat.",
            "Professionnels : le service est fourni en l'état, dans le cadre d'une obligation de moyens. Notre responsabilité est limitée aux dommages directs et prévisibles, et plafonnée au montant que vous avez payé au cours des 12 mois précédant le fait générateur.",
            "Nous ne sommes pas responsables de l'usage que vous faites de vos vidéos ni des contenus que vous fournissez. Rien dans les Conditions ne limite notre responsabilité en cas de faute lourde ou intentionnelle, ou lorsque la loi l'interdit.",
          ],
        },
        {
          title: "15. Données personnelles",
          blocks: [
            "Le traitement de vos données est décrit dans la [politique de confidentialité](/privacy) et la [politique cookies](/cookies).",
          ],
        },
        {
          title: "16. Modification des Conditions",
          blocks: [
            "Nous pouvons modifier les Conditions, par exemple pour suivre l'évolution du service ou de la loi. Les modifications importantes vous sont notifiées par email ou dans l'application au moins 30 jours avant leur entrée en vigueur. Si vous les refusez, vous pouvez résilier votre abonnement avant cette date.",
          ],
        },
        {
          title: mediator ? "17. Réclamations et médiation" : "17. Réclamations",
          blocks: [
            `Pour toute réclamation, écrivez-nous à ${d.contactEmail}. Nous répondons sous 15 jours ouvrés.`,
            ...(mediator ? [`Consommateurs : si le différend n'est pas résolu, vous pouvez saisir gratuitement le médiateur de la consommation, dans un délai d'un an à compter de votre réclamation écrite : ${mediator}.`] : []),
          ],
        },
        {
          title: "18. Droit applicable",
          blocks: [
            "Les Conditions sont soumises au droit français. Les consommateurs résidant dans un autre pays de l'Union européenne conservent la protection des règles impératives de leur pays de résidence.",
            "En cas de litige, les consommateurs peuvent saisir le tribunal de leur domicile ou celui de l'Éditeur. Pour les professionnels, les tribunaux du ressort du domicile de l'Éditeur sont seuls compétents.",
          ],
        },
      ],
    },

    privacy: {
      title: "Politique de confidentialité",
      description: "Données collectées par Kinetik, pourquoi, avec qui elles sont partagées, combien de temps elles sont conservées et vos droits.",
      intro: [
        "Cette politique explique quelles données personnelles nous traitons lorsque vous utilisez Kinetik, et comment exercer vos droits. Nous ne vendons pas vos données et ne les utilisons pas à des fins publicitaires.",
      ],
      sections: [
        {
          title: "1. Responsable du traitement",
          blocks: [
            `${d.name}, ${d.status}, ${d.address} (SIRET ${d.siret}). Contact pour vos données : ${d.privacyEmail}.`,
          ],
        },
        {
          title: "2. Données collectées",
          blocks: [
            { list: [
              "Compte : nom, adresse email, mot de passe (stocké sous forme chiffrée irréversible), photo de profil et identifiant si vous vous connectez avec Google ou Discord.",
              "Contenus : projets, descriptions, messages échangés avec l'assistant, versions des vidéos, kit de marque, fichiers importés (logos, images, sons), captures de sites web et vidéos exportées.",
              "Achats : offre souscrite, historique des crédits, identifiant client et statut des paiements transmis par Stripe. Nous ne recevons pas vos numéros de carte.",
              "Données techniques : adresse IP, navigateur et appareil (pour les sessions), journaux de sécurité.",
              "Échanges : les messages que vous nous envoyez par email.",
            ] },
          ],
        },
        {
          title: "3. Finalités et bases légales",
          blocks: [
            { list: [
              "Fournir le service (compte, génération, modification, export et partage des vidéos) : exécution du contrat.",
              "Gérer les paiements, les crédits et la facturation : exécution du contrat et obligations légales comptables.",
              "Sécuriser le service et prévenir les abus (limitation du nombre de requêtes par adresse IP, détection des emails jetables et des robots, comptes multiples) : intérêt légitime.",
              "Vous envoyer les emails liés à votre compte et à vos achats (confirmation, rappel de renouvellement, changement des Conditions) : exécution du contrat et obligation légale.",
              "Répondre à vos demandes : intérêt légitime.",
              "Mesurer l'audience du site de façon agrégée (pages vues, pays, type d'appareil), sans cookie : intérêt légitime.",
              "Présenter certaines vidéos à titre d'exemple (voir les [conditions générales](/terms), article 9) : intérêt légitime, avec possibilité de vous y opposer à tout moment.",
            ] },
            "Si nous envoyons un jour des emails promotionnels, ce sera avec votre accord, ou pour des offres similaires à celles que vous avez achetées, avec un lien de désinscription dans chaque email.",
          ],
        },
        {
          title: "4. Destinataires et prestataires",
          blocks: [
            "Vos données sont accessibles uniquement à l'Éditeur et aux prestataires techniques qui l'aident à fournir le service, chacun pour sa mission :",
            { list: [
              "Vercel (États-Unis) : hébergement du site et de l'application, et mesure d'audience sans cookie (Vercel Web Analytics).",
              "Neon (base de données hébergée à Londres, Royaume-Uni) : comptes, projets, historique des crédits.",
              "Cloudflare (stockage R2) : fichiers importés, captures et médias.",
              "Amazon Web Services (Francfort, Allemagne) : rendu des vidéos exportées.",
              "Anthropic (États-Unis) : intelligence artificielle qui génère et modifie les vidéos. Elle reçoit le contenu de vos demandes, les textes et les images nécessaires à la génération.",
              "Upstash : limitation du nombre de requêtes (adresse IP et identifiants techniques, conservés quelques heures au plus).",
              "Stripe (Irlande et États-Unis) : paiement et facturation.",
              "Google et Discord : uniquement si vous choisissez de vous connecter avec eux.",
            ] },
            "Certains prestataires sont situés hors de l'Union européenne. Ces transferts sont encadrés par une décision d'adéquation de la Commission européenne (dont le Data Privacy Framework pour les entreprises américaines certifiées, et la décision relative au Royaume-Uni) ou par les clauses contractuelles types de la Commission.",
            "Nous pouvons aussi communiquer des données aux autorités lorsque la loi l'exige.",
          ],
        },
        {
          title: "5. Durées de conservation",
          blocks: [
            { list: [
              "Compte et contenus : tant que votre compte existe. Un compte inactif pendant 3 ans est supprimé, après un email de prévenance.",
              "Après suppression du compte : vos données sont effacées immédiatement de notre base, et vos fichiers sous 30 jours. Les sauvegardes techniques sont écrasées dans un délai maximum de 30 jours.",
              "Pièces comptables (factures, paiements) : 10 ans, conformément au Code de commerce.",
              "Sessions de connexion : 30 jours.",
              "Données de sécurité et journaux techniques : 12 mois au plus.",
              "Échanges avec nous : le temps de traiter votre demande, puis le délai de prescription applicable si nécessaire.",
            ] },
          ],
        },
        {
          title: "6. Vos droits",
          blocks: [
            "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition sur vos données, ainsi que du droit de définir des directives sur leur sort après votre décès.",
            `Vous pouvez modifier votre profil et supprimer votre compte directement depuis les Réglages. Pour les autres demandes, écrivez à ${d.privacyEmail}. Nous répondons sous un mois. Nous pouvons vous demander de justifier de votre identité en cas de doute.`,
            "Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL ([cnil.fr](https://www.cnil.fr)).",
          ],
        },
        {
          title: "7. Sécurité",
          blocks: [
            "Les échanges sont chiffrés (HTTPS), les mots de passe ne sont jamais stockés en clair, les fichiers sont conservés dans un espace privé accessible uniquement à leur propriétaire, et l'accès aux outils d'administration est restreint.",
          ],
        },
        {
          title: "8. Mineurs",
          blocks: [
            "Kinetik n'est pas destiné aux moins de 15 ans. Si vous pensez qu'un enfant de moins de 15 ans nous a transmis des données, contactez-nous pour que nous les supprimions.",
          ],
        },
        {
          title: "9. Cookies",
          blocks: ["Voir notre [politique cookies](/cookies)."],
        },
        {
          title: "10. Modifications",
          blocks: [
            "Nous pouvons mettre à jour cette politique. En cas de changement important, nous vous prévenons par email ou dans l'application.",
          ],
        },
      ],
    },

    cookies: {
      title: "Politique cookies",
      description: "Les cookies utilisés par Kinetik et comment les gérer.",
      intro: [
        "Un cookie est un petit fichier déposé sur votre appareil lors de la visite d'un site. Kinetik n'utilise que des cookies strictement nécessaires à son fonctionnement : aucun cookie publicitaire ni de mesure d'audience. Ces cookies sont dispensés de consentement, c'est pourquoi aucun bandeau ne vous est présenté.",
      ],
      sections: [
        {
          title: "Cookies et stockage utilisés",
          blocks: [
            { list: [
              "kinetik_session : vous garde connecté à votre compte. Durée : 30 jours.",
              "KINETIK_LOCALE : mémorise la langue choisie. Durée : 1 an.",
              "Préférence de thème (clair ou sombre) : enregistrée dans le stockage local de votre navigateur, jamais transmise à nos serveurs.",
            ] },
          ],
        },
        {
          title: "Mesure d'audience",
          blocks: [
            "Nous utilisons Vercel Web Analytics pour connaître la fréquentation du site (pages vues, pays, type d'appareil et de navigateur). Cet outil ne dépose aucun cookie et ne lit rien sur votre appareil : chaque visiteur est compté à l'aide d'une empreinte technique renouvelée chaque jour, qui ne permet ni de vous identifier ni de vous suivre d'un site à l'autre. Les résultats sont uniquement statistiques.",
          ],
        },
        {
          title: "Services tiers",
          blocks: [
            "Lorsque vous payez, vous êtes redirigé vers une page sécurisée de Stripe, qui utilise ses propres cookies pour prévenir la fraude. Si vous vous connectez avec Google ou Discord, ces services déposent leurs cookies sur leurs propres pages. Ces cookies relèvent de leurs politiques respectives.",
          ],
        },
        {
          title: "Gérer les cookies",
          blocks: [
            "Vous pouvez supprimer ou bloquer les cookies dans les réglages de votre navigateur. Si vous bloquez le cookie de session, vous ne pourrez plus vous connecter.",
            "Si nous ajoutons un jour des cookies soumis à consentement (mesure d'audience, par exemple), nous mettrons à jour cette page et vous demanderons votre accord au préalable.",
          ],
        },
      ],
    },
  };
}
