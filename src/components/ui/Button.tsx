import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "soft" | "ghost" | "danger" | "warning";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variantClass: Record<Variant, string> = {
  primary: "ui-btn-primary",
  soft: "ui-btn-soft",
  ghost: "ui-btn-ghost",
  danger: "ui-btn-danger",
  warning: "ui-btn-warning"
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "soft", className = "", type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`ui-btn ${variantClass[variant]} ${className}`}
      {...rest}
    />
  );
});
