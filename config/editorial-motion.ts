/** Shared photographic art direction for thumbnails and rendered motion. */
export const EDITORIAL_MOTION = {
  cadran: { treatment: "gallery", photo: "/post-demos/portrait-2.jpg", headline: "Frame your vision." },
  passage: { treatment: "ribbon", photo: "/post-demos/city.jpg", headline: "KEEP MOVING FORWARD." },
  reverie: { treatment: "color-window", photo: "/post-demos/flowers.jpg", headline: "A little unexpected." },
  duplex: { treatment: "double-spread", photo: "/post-demos/interior.jpg", headline: "Two sides of a story." },
  terracotta: { treatment: "rust-panel", photo: "/post-demos/portrait-6.jpg", headline: "CREATE WITH INTENTION." },
  silhouette: { treatment: "slit", photo: "/post-demos/portrait-6.jpg", headline: "Leave an impression." },
  bulletin: { treatment: "masthead", photo: "/post-demos/city.jpg", headline: "MAKE IT MATTER." },
  montage: { treatment: "strips", photo: "/post-demos/portrait-4.jpg", headline: "MORE THAN ONE ANGLE." },
  fervor: { treatment: "diffuse", photo: "/post-demos/detail.jpg", headline: "Ideas that radiate." },
  horizon: { treatment: "panorama", photo: "/post-demos/lake.jpg", headline: "Beyond the ordinary." },
  dispatch: { treatment: "band", photo: "/post-demos/city.jpg", headline: "MAKE SOME NOISE." },
  maison: { treatment: "portrait", photo: "/post-demos/portrait-4.jpg", headline: "A different perspective." },
  oblique: { treatment: "split", photo: "/post-demos/workspace.jpg", headline: "IDEAS IN MOTION." },
  solstice: { treatment: "warm", photo: "/post-demos/desert.jpg", headline: "Find your own horizon." },
  archive: { treatment: "frames", photo: "/post-demos/portrait-2.jpg", headline: "A story worth telling." },
} as const;
export type EditorialTreatment = (typeof EDITORIAL_MOTION)[keyof typeof EDITORIAL_MOTION]["treatment"];
export function getEditorialMotion(id?: string) {
  return id && Object.hasOwn(EDITORIAL_MOTION, id) ? EDITORIAL_MOTION[id as keyof typeof EDITORIAL_MOTION] : undefined;
}
