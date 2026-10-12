"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/field";
import { passwordScore } from "@/lib/auth/validation";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const COLORS = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];

export function PasswordInput({ showStrength, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { showStrength?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const score = passwordScore(value);

  return (
    <div>
      <div className="relative">
        <Input
          {...props}
          type={visible ? "text" : "password"}
          className={cn("pr-11", className)}
          onChange={(e) => {
            setValue(e.target.value);
            props.onChange?.(e);
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          aria-pressed={visible}
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-subtle transition-colors hover:text-fg"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div className="mt-2.5 flex items-center gap-3" aria-live="polite">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                <span
                  className={cn("block h-full origin-left rounded-full transition-transform duration-300", COLORS[score])}
                  style={{ transform: `scaleX(${i < Math.max(score, 1) ? 1 : 0})` }}
                />
              </span>
            ))}
          </div>
          <span className="text-xs text-muted">{t.auth.passwordStrength[score]}</span>
        </div>
      )}
    </div>
  );
}
