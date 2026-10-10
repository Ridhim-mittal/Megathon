import { CFG } from "../engine/data.js";
import { goalTargetAt, houseFund } from "../engine/engine.js";
import { LANGS, REGIONS, useI18n, rupees } from "../i18n.js";
import { Modal, PotIcon, RangeBand } from "./bits.jsx";
import { houseProjection, sipProjection } from "./projections.js";

export function Assumptions({ life, onClose }) {
  const { t } = useI18n();
  const rows = [
    [t("as.inflation"), `${CFG.inflationPct}% / yr`],
    [t("as.house"), `${CFG.houseInflationPct}% / yr`],
    [t("as.bank"), `${CFG.rates.bank}%`],
    [t("as.fd"), `${CFG.rates.fd}%`],
    [t("as.rd"), `${CFG.rates.rd}%`],
    [t("as.market"), `${CFG.market.min}% … +${CFG.market.max}%`],
    [t("as.gold"), `${CFG.gold.min}% … +${CFG.gold.max}%`],
    [t("as.medical"), t("as.medicalOdds")],
  ];
  const loans = ["bank", "lender", "app", "shop", "bnpl", "card"];
  const monthly = life?.sipMonthly || 1000;
  return (
    <Modal label={t("as.title")} onClose={onClose}>
      <h2 className="text-lg font-black">📖 {t("as.title")}</h2>
      <p className="mt-1 text-[12px] italic">{t("as.note")}</p>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]" data-testid="assumptions">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>{k}</dt>
            <dd className="text-right font-black">{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-3 text-sm font-black">{t("as.loans")}</h3>
      <ul className="mt-1 text-[12px]">
        {loans.map((l) => (
          <li key={l} className="flex justify-between">
            <span>{t(`loan.source.${l}`)}</span>
            <span className="font-bold">
              {t("loan.phrase", { n: Math.round((CFG.loans[l].annualPct / 12) * 10) / 10 })} {t("loan.perYear", { pct: CFG.loans[l].annualPct })}
              {CFG.loans[l].feePct ? ` + ${CFG.loans[l].feePct}%` : ""}
            </span>
          </li>
        ))}
      </ul>
      {life && life.phase !== "ending" && (
        <div className="mt-3 space-y-2">
          <RangeBand series={houseProjection(life)} label={`${t("as.goalProjection")} · ${t("houseFund", { fund: rupees(houseFund(life)), target: rupees(goalTargetAt(CFG.endAge)) })}`} />
          <RangeBand series={sipProjection(life, monthly)} label={t("as.projection", { monthly: rupees(monthly) })} />
        </div>
      )}
      <p className="mt-3 flex items-center gap-2 text-[12px] font-bold">
        <PotIcon /> {t("as.pot")}
      </p>
    </Modal>
  );
}

export function Settings({ meta, setMeta, onClose }) {
  const { t, regionName } = useI18n();
  return (
    <Modal label={t("settings")} onClose={onClose}>
      <h2 className="text-lg font-black">⚙ {t("settings")}</h2>
      <SettingsFields meta={meta} setMeta={setMeta} t={t} regionName={regionName} />
    </Modal>
  );
}

export function SettingsFields({ meta, setMeta, t, regionName, dark = false }) {
  const field = `mt-1 w-full rounded-lg border-2 border-ink px-2 py-1.5 font-bold ${dark ? "bg-paper text-ink" : "bg-white"}`;
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] font-bold">
      <label>
        {t("language")}
        <select className={field} value={meta.lang} onChange={(e) => setMeta((m) => ({ ...m, lang: e.target.value }))} data-testid="lang">
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("region")}
        <select className={field} value={meta.region} onChange={(e) => setMeta((m) => ({ ...m, region: e.target.value }))} data-testid="region">
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {regionName(r)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
