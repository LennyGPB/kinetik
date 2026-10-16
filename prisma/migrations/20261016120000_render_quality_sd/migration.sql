-- Export 720p (plans Free et Starter). La valeur UHD reste pour les anciens rendus 4K.
ALTER TYPE "RenderQuality" ADD VALUE IF NOT EXISTS 'SD' BEFORE 'HD';
