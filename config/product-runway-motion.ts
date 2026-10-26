/** Stations fixes du décor de Runway, une par scène (coordonnées monde). Chorégraphie : config/product-signature-motion.ts. */
export function runwayStation(index: number) { return { x: index * 6, z: index % 2 ? -2 : 0 }; }
