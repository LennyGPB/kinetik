import { z } from "zod";
import { isActivePostTemplate } from "@/config/post-templates";
import { uploadedFileSchema } from "@/lib/projects/validation";

const image = uploadedFileSchema.refine((file) => file.mimeType.startsWith("image/"));
export const CreatePostSchema = z.object({
  requestId: z.uuid(),
  appName: z.string().trim().min(1).max(40),
  locale: z.enum(["fr", "en"]),
  brief: z.string().trim().min(5).max(1000),
  templateId: z.string().refine(isActivePostTemplate),
  format: z.enum(["FEED", "SQUARE", "STORY"]),
  pageCount: z.number().int().min(1).max(5),
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).length(3),
  logo: image.nullable(),
  screens: z.array(image).max(8),
});
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
