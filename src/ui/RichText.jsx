import React, { useId, useState } from "react";
import { Glasses } from "lucide-react";

// A glossary term inside content text: tap to see a short definition in the player's language.
export function GlossaryChip({ term, name, short, onOpen }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="gloss">
      <button
        type="button"
        className="gloss-chip"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (!open) onOpen?.(term);
          setOpen(!open);
        }}
      >
        {name}
      </button>
      {open && (
        <span id={id} role="note" className="gloss-pop">
          <b>{name}</b> {short}
        </span>
      )}
    </span>
  );
}

// An ambiguous phrase. Hidden phrases look like ordinary text; once Ammamma's glasses reveal
// them (or the lesson is already applied) they glow, and a tap shows what they really mean.
export function ClarityPhrase({ revealed, free, truth, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!revealed) return <span className="clarity-hidden">{children}</span>;
  return (
    <span className={`clarity ${free ? "free" : ""}`}>
      <button type="button" className="clarity-phrase" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {children}
      </button>
      {open && truth && (
        <span id={id} role="note" className="clarity-truth">
          <Glasses size={13} aria-hidden="true" /> {truth}
        </span>
      )}
    </span>
  );
}
