import geometry from './decor-geometry.json';

export const DECOR_CATEGORIES = ['pc', 'phone', 'tablet', 'hybrid'] as const;
export type DecorCategory = typeof DECOR_CATEGORIES[number];
export const DECOR_IDS = ['cafe', 'canape', 'desk', 'geant', 'night', 'setup'] as const;
export type DecorId = typeof DECOR_IDS[number];
const names: Record<DecorId, [string, string]> = {
  cafe: ['Café parisien', 'Parisian café'], canape: ['Slow living', 'Slow living'],
  desk: ['Lumière naturelle', 'Natural light'], geant: ['Grand écran', 'Big screen'],
  night: ['Après minuit', 'After midnight'], setup: ['Studio violet', 'Violet studio'],
};
export const DECORS = DECOR_IDS.map(id => ({ id, category: 'pc' as DecorCategory, ...geometry[id], screenRatio: id === 'setup' || id === 'geant' ? 16/9 : 16/10, image: `/decors/prepared/${id}.webp` }));
export function getDecor(id?: string | null) { return DECORS.find(decor => decor.id === id); }
export function decorName(id: DecorId, locale: string) { return names[id][locale === 'fr' ? 0 : 1]; }

/** Project a rectangle onto the four calibrated screen corners (TL, TR, BR, BL). */
export function screenMatrix(corners: number[][], width = 1000, height = 625) {
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] = corners;
  const dx1=x1-x2, dx2=x3-x2, dx3=x0-x1+x2-x3;
  const dy1=y1-y2, dy2=y3-y2, dy3=y0-y1+y2-y3;
  const determinant=dx1*dy2-dx2*dy1;
  const g=(dx3*dy2-dx2*dy3)/determinant, h=(dx1*dy3-dx3*dy1)/determinant;
  return [(x1-x0+g*x1)/width,(y1-y0+g*y1)/width,0,g/width,
    (x3-x0+h*x3)/height,(y3-y0+h*y3)/height,0,h/height,
    0,0,1,0,x0,y0,0,1];
}
