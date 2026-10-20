import type { TextLayoutProps } from "./composition";
import { TypePosterLayout } from "./type-poster-layout";
export function FanoutLayout(props: TextLayoutProps) { return <TypePosterLayout kind="fanout" {...props} />; }
