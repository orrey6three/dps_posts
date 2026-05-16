import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky bottom-0 z-20 flex items-start gap-2 rounded-[12px] bg-[#0e2a36] px-3 py-2.5 text-[13px] text-white shadow-[0_12px_32px_-10px_rgba(8,145,178,0.45)] ring-1 ring-white/10"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
      <span className="leading-snug">{children}</span>
    </div>
  );
}
