import type { PostDocument } from "@/lib/posts/document";
import { postSvg } from "@/lib/posts/svg";
import { POST_FORMATS } from "@/config/post-templates";
import { cn } from "@/lib/utils";

export function PostPreview({ document, index = 0, appName, logoUrl, screenUrls, screenRatios, watermark, demo = false, className }: {
  document: PostDocument; index?: number; appName?: string; logoUrl?: string | null; screenUrls?: string[]; screenRatios?: (number | null)[]; watermark?: boolean; demo?: boolean; className?: string;
}) {
  const dimensions = POST_FORMATS[document.format];
  return <div className={cn("overflow-hidden [&>svg]:block [&>svg]:h-full [&>svg]:w-full", className)} style={{ aspectRatio: `${dimensions.width}/${dimensions.height}` }} dangerouslySetInnerHTML={{ __html: postSvg(document, index, { appName, logoUrl, screenUrls, screenRatios, watermark, demo }) }} />;
}
