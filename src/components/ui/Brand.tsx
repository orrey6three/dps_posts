import { ShieldAlert } from "lucide-react";

export function Brand({ subtitle, online = true }: { subtitle?: string; online?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid h-9 w-9 place-items-center rounded-[10px]"
        style={{
          background: "linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-accent) 100%)",
          color: "white",
          boxShadow: "0 4px 12px -2px rgba(239, 68, 68, 0.35)"
        }}
        aria-hidden
      >
        <ShieldAlert className="h-5 w-5" />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-bold tracking-normal">DPS45</span>
          {online && <span className="ui-live-dot" aria-hidden />}
        </div>
        <p className="ui-soft truncate text-[11px]">
          {subtitle ?? (online ? "Live · обновляется автоматически" : "Оффлайн")}
        </p>
      </div>
    </div>
  );
}
