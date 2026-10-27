import { z } from "zod";
import { BRAND_FONTS } from "../../config/fonts";

export const ProductBriefSchema = z.object({
  company: z.string().trim().min(1).max(40),
  product: z.string().trim().min(1).max(500),
  audience: z.string().trim().min(1).max(240),
  benefits: z.array(z.string().trim().min(1).max(180)).length(3),
  tone: z.enum(["calm", "bold", "friendly", "professional"]),
  // One hook since the flow creates a single video; older analyses kept three.
  hooks: z.array(z.string().trim().min(1).max(100)).min(1).max(3),
  headingFont: z.enum(BRAND_FONTS),
  bodyFont: z.enum(BRAND_FONTS),
  fontNote: z.string().max(400),
  warnings: z.array(z.string().max(240)).max(10),
});
export type ProductBrief = z.infer<typeof ProductBriefSchema>;
