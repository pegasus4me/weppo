import type { JSX, ReactNode } from "react";

type CardProps = {
  className?: string;
  title: string;
  eyebrow?: string;
  href?: string;
  cta?: string;
  children: ReactNode;
};

export function Card({
  className,
  title,
  eyebrow,
  href,
  cta,
  children,
}: CardProps): JSX.Element {
  const content = (
    <>
      {eyebrow ? <span className="ui-card-eyebrow">{eyebrow}</span> : null}
      <h2 className="ui-card-title">{title}</h2>
      <div className="ui-card-body">{children}</div>
      {cta ? <span className="ui-card-cta">{cta}</span> : null}
    </>
  );

  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return <article className={className}>{content}</article>;
}
