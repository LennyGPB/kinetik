import { CREDIT_COSTS } from '../../config/credits';

export function decorCopy(locale: string) {
  const { shortMaxSeconds } = CREDIT_COSTS.export;
  const { preview, exportShort: short, exportLong: long } = CREDIT_COSTS.decor;
  return locale === 'fr' ? {
    title: 'Décors', heading: 'Ta vidéo change de décor.', subtitle: 'Choisis une ambiance, importe ta vidéo. Elle prend sa place dans l’écran, automatiquement.',
    categories: { all: 'Tous', pc: 'PC', phone: 'Téléphone', tablet: 'Tablette', hybrid: 'Hybride' },
    use: 'Utiliser ce décor', upload: 'Importer ma vidéo', replace: 'Changer de vidéo', drop: 'Glisse ta vidéo ici', browse: 'ou choisis un fichier',
    formats: 'MP4 ou MOV · H.264 · 30 Mo max · 2 min max', empty: 'Les décors de cette catégorie arrivent bientôt.', emptyHelp: 'Explore les décors PC déjà disponibles.',
    free: `${preview} crédits pour débloquer l’aperçu. Export à tarif réduit.`, cost: `${short} crédits jusqu’à ${shortMaxSeconds} s · ${long} crédits au-delà`,
    fit: 'Cadrage dans l’écran', contain: 'Vidéo entière', cover: 'Remplir l’écran', audio: 'Garder le son de ma vidéo',
    unlock: `Générer l’aperçu · ${preview} crédits`, insufficient: 'Crédits insuffisants pour débloquer l’aperçu.', create: 'Ouvrir mon projet', uploading: 'Import de la vidéo', creating: 'Création du projet…', preview: 'Aperçu',
    genericError: 'Impossible d’importer cette vidéo. Réessaie avec un fichier MP4 ou MOV en H.264.',
    tooLarge: 'Cette vidéo dépasse 30 Mo.', duration: 'Choisis une vidéo entre 1 seconde et 2 minutes.',
    quota: 'Ton espace de stockage est plein.', limited: 'Trop de demandes. Réessaie dans un instant.',
    fitHelp: 'Vidéo entière conserve tout le contenu. Remplir l’écran recadre les bords si nécessaire.',
    saved: 'Décor et cadrage modifiables gratuitement.', back: 'Voir les décors',
  } : {
    title: 'Scenes', heading: 'A new scene for your video.', subtitle: 'Pick a setting, upload your video. It fits into the screen automatically.',
    categories: { all: 'All', pc: 'PC', phone: 'Phone', tablet: 'Tablet', hybrid: 'Hybrid' },
    use: 'Use this scene', upload: 'Upload my video', replace: 'Replace video', drop: 'Drop your video here', browse: 'or choose a file',
    formats: 'MP4 or MOV · H.264 · 30 MB max · 2 min max', empty: 'Scenes in this category are coming soon.', emptyHelp: 'Explore the PC scenes available now.',
    free: `${preview} credits to unlock the preview. Reduced export price.`, cost: `${short} credits up to ${shortMaxSeconds} s · ${long} credits above`,
    fit: 'Screen framing', contain: 'Entire video', cover: 'Fill screen', audio: 'Keep my video’s audio',
    unlock: `Generate preview · ${preview} credits`, insufficient: 'Not enough credits to unlock the preview.', create: 'Open my project', uploading: 'Uploading video', creating: 'Creating project…', preview: 'Preview',
    genericError: 'Could not import this video. Try an MP4 or MOV file encoded in H.264.',
    tooLarge: 'This video exceeds 30 MB.', duration: 'Choose a video between 1 second and 2 minutes.',
    quota: 'Your storage is full.', limited: 'Too many requests. Try again shortly.',
    fitHelp: 'Entire video keeps all your content. Fill screen crops the edges when needed.',
    saved: 'Change the scene and framing for free.', back: 'Browse scenes',
  };
}
