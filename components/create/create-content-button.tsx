"use client";

import { Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";

/** Generic creation entries navigate to the format picker. */
export function CreateContentButton({ children, variant = "purple", ...props }: Omit<ButtonProps, "onClick">) {
  const t = useDictionary();
  const router = useRouter();
  return <Button {...props} variant={variant} onClick={() => router.push("/create")}>{children ?? <><Plus />{t.app.nav.create}</>}</Button>;
}
