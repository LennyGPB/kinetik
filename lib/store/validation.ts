import { z } from "zod";
import { getStoreTemplate } from "@/config/store-templates";
import { uploadedFileSchema } from "@/lib/projects/validation";

const image = uploadedFileSchema.refine((file) => file.mimeType.startsWith("image/"));
export const CreateStoreSchema = z.object({
  requestId: z.uuid(),
  appName: z.string().trim().min(1).max(30),
  locale: z.enum(["fr", "en"]),
  brief: z.string().trim().min(5).max(1000),
  templateId: z.string().refine((id) => Boolean(getStoreTemplate(id))),
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).length(3),
  logo: image.nullable(),
  screens: z.array(image).max(8),
});
export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
