import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Glasses } from "lucide-react";

// A small popup that floats above everything (rendered at the page root, so cards and choice
// buttons can never cover it). Opens on hover or focus, and on tap for touch screens.
function useHoverPop() {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 120);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return { open, setOpen, show, hide };
}

function FloatingPop({ anchor, id, className, onEnter, onLeave, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = ref.current?.getBoundingClientRect();
      if (!a || !p) return;
      const gap = 8;
      const above = a.top - p.height - gap;
      const top = above > 8 ? above : a.bottom + gap;
      const left = Math.min(Math.max(8, a.left + a.width / 2 - p.width / 2), window.innerWidth - p.width - 8);
      setPos({ top, left, below: above <= 8 });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor]);
  return createPortal(
    <span
      ref={ref}
      id={id}
      role="tooltip"
      className={`float-pop ${className} ${pos?.below ? "below" : "above"}`}
      style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
    </span>,
    document.body,
  );
}

// A glossary term inside content text: hover (or tap) to see a short, simple definition.
export function GlossaryChip({ term, name, short, onOpen }) {
  const { open, setOpen, show, hide } = useHoverPop();
  const anchor = useRef(null);
  const id = useId();
  const seen = useRef(false);
  useEffect(() => {
    if (open && !seen.current) {
      seen.current = true;
      onOpen?.(term);
    }
  }, [open, onOpen, term]);
  return (
    <span className="gloss">
      <button
        ref={anchor}
        type="button"
        className="gloss-chip"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {name}
      </button>
      {open && (
        <FloatingPop anchor={anchor} id={id} className="gloss-float" onEnter={show} onLeave={hide}>
          <b>{name}</b> {short}
        </FloatingPop>
      )}
    </span>
  );
}

// An ambiguous phrase. Hidden phrases look like ordinary text; once Ammamma's glasses reveal
// them (or the lesson is already applied) they glow, and hovering or tapping shows what they mean.
export function ClarityPhrase({ revealed, free, truth, children }) {
  const { open, setOpen, show, hide } = useHoverPop();
  const anchor = useRef(null);
  const id = useId();
  if (!revealed) return <span className="clarity-hidden">{children}</span>;
  return (
    <span className={`clarity ${free ? "free" : ""}`}>
      <button
        ref={anchor}
        type="button"
        className="clarity-phrase"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => setOpen(!open)}
      >
        {children}
      </button>
      {open && truth && (
        <FloatingPop anchor={anchor} id={id} className="clarity-float" onEnter={show} onLeave={hide}>
          <Glasses size={13} aria-hidden="true" /> {truth}
        </FloatingPop>
      )}
    </span>
  );
}
