import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean };

export function Chip({ active, className = "", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={`ui-chip ${active ? "ui-chip-active" : ""} ${className}`}
      {...rest}
    />
  );
}
