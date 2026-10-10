import React, { useEffect, useRef } from "react";
import { AlertTriangle, BadgeCheck, Check, Flag, X } from "lucide-react";
import { useT } from "../i18n/index.jsx";

// A document that looks like real paper: letterhead, numbered lines, a seal, signatures and
// fine print. Tap a line to flag it as suspicious.
export function DocumentViewer({ doc, onFlag, onVerify, onClose, verifyError }) {
  const { t, pick, money } = useT();
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.open && d.close();
  }, []);
  return (
    <dialog ref={ref} className="doc-dialog" aria-label={pick(doc.title)} onCancel={(e) => (e.preventDefault(), onClose())}>
      <div className="paper">
        <button className="doc-close" onClick={onClose} aria-label={t("common.close")}>
          <X size={18} />
        </button>
        <div className="paper-head">
          <span className="paper-kicker">{t("document.eyebrow")}</span>
          <h2>{pick(doc.title)}</h2>
          <span className="paper-type">{String(doc.type ?? "").replace(/_/g, " ")}</span>
        </div>
        <ol className="paper-lines">
          {doc.lines.map((line) => (
            <li key={line.id}>
              <button
                type="button"
                className={`paper-line ${line.flagged ? "flagged" : ""} ${line.revealed ? (line.isRedFlag ? "is-red" : "is-fine") : ""}`}
                aria-pressed={line.flagged}
                onClick={() => onFlag(line.id)}
              >
                <span className="paper-text">{pick(line.text)}</span>
                {line.flagged && (
                  <span className="paper-mark">
                    <Flag size={13} /> {t("document.flagged")}
                  </span>
                )}
              </button>
              {line.revealed && line.isRedFlag && (
                <p className="paper-explain" role="note">
                  <AlertTriangle size={14} aria-hidden="true" /> <b>{t("document.redFlag")}:</b> {pick(line.explain)}
                </p>
              )}
              {line.revealed && line.isRedFlag === false && line.flagged && (
                <p className="paper-fine">
                  <Check size={13} aria-hidden="true" /> {t("document.fine")}
                </p>
              )}
            </li>
          ))}
        </ol>
        <div className="paper-foot">
          <div className="signatures" aria-hidden="true">
            <div>
              <svg viewBox="0 0 120 30">
                <path d="M4 22q10-18 18-4t14-6q8-10 12 6t16-8q10-6 14 6 6 12 20-4" fill="none" stroke="#33415e" strokeWidth="1.6" />
              </svg>
              <span>{t("document.signature")}</span>
            </div>
            <div>
              <svg viewBox="0 0 120 30">
                <path d="M6 18q8-14 16 0t16-2q10-14 16 4 6 10 18-10 8-8 14 8" fill="none" stroke="#33415e" strokeWidth="1.6" />
              </svg>
              <span>{t("document.signature")}</span>
            </div>
          </div>
          <div className="seal" aria-hidden="true">
            <svg viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#b5483f" strokeWidth="3" strokeDasharray="4 2" />
              <circle cx="40" cy="40" r="25" fill="none" stroke="#b5483f" strokeWidth="1.5" />
              <path d="M40 22l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" fill="#b5483f" opacity=".75" />
            </svg>
            <span>{t("document.seal")}</span>
          </div>
        </div>
        <p className="fine-print">{t("document.finePrint")}</p>
        <div className="paper-actions">
          {doc.verify &&
            (doc.verified ? (
              <span className="verified">
                <BadgeCheck size={16} /> {t("document.verified")}
              </span>
            ) : (
              <button type="button" className="secondary-button" onClick={onVerify}>
                <BadgeCheck size={16} /> {t("document.verify", { amount: money(doc.verify.cost), label: pick(doc.verify.label) })}
              </button>
            ))}
          {verifyError && <span className="doc-error" role="alert">{t("document.cantVerify")}</span>}
          <button type="button" className="primary-button" onClick={onClose}>
            {t("document.close")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
