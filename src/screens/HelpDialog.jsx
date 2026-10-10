import React, { useEffect, useRef } from "react";
import { ArrowRight, X } from "lucide-react";
import { useT } from "../i18n/index.jsx";

export function HelpDialog({ onClose }) {
  const { t } = useT();
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.open && d.close();
  }, []);
  const steps = t("help.steps");
  return (
    <dialog ref={ref} className="guide-dialog" onCancel={(e) => (e.preventDefault(), onClose())} aria-labelledby="help-title">
      <button className="dialog-close quiet-button" aria-label={t("common.close")} onClick={onClose}>
        <X size={21} />
      </button>
      <h2 id="help-title">{t("help.title")}</h2>
      <ol>
        {Array.isArray(steps) && steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <p>{t("app.illustrative")}</p>
      <button className="primary-button" onClick={onClose}>
        {t("help.start")} <ArrowRight size={17} />
      </button>
    </dialog>
  );
}
