"use client";

import type { MouseEvent } from "react";

type Router = { back: () => void; push: (href: string) => void };

/**
 * Flèche « retour » des éditeurs : revient à la page précédente de l'app s'il y en a une
 * (espace Resto, galerie, tableau de bord…), sinon va à `fallback` (éditeur ouvert directement depuis un lien).
 * À brancher sur le onClick d'un lien dont le href est `fallback` (clic molette / nouvel onglet : le lien fonctionne).
 */
export function backOrFallback(event: MouseEvent, router: Router, fallback: string) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();
  if (window.history.length > 1) router.back();
  else router.push(fallback);
}
