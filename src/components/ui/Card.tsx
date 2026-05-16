import type { HTMLAttributes, ReactNode } from "react";

type Props = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  headless?: boolean;
};

export function Card({ title, icon, actions, children, headless, className = "", ...rest }: Props) {
  return (
    <section className={`ui-card ${className}`} {...rest}>
      {!headless && (title || actions) && (
        <header className="ui-card-header">
          {title ? (
            <h3 className="ui-card-title">
              {icon}
              <span>{title}</span>
            </h3>
          ) : (
            <span />
          )}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
