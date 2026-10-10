import React, { useEffect, useRef } from "react";

// A cream panel floating over the village, used by every screen outside the year loop.
// The heading takes focus when the screen opens, for keyboard and screen-reader users.
export function Sheet({ eyebrow, title, subtitle, children, className = "", top = null, wide = false }) {
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, [title]);
  return (
    <main className={`sheet ${wide ? "sheet-wide" : ""} ${className}`}>
      {top}
      <div className="sheet-heading">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 ref={heading} tabIndex={-1}>
          {title}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </main>
  );
}

// The bar of language/sound controls shown above setup screens.
export function ScreenBar({ children }) {
  return <div className="screen-bar">{children}</div>;
}
