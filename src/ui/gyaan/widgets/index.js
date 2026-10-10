// Interactive Gyaan widgets, keyed by the `widget` id in content (gyaan.json).
// Each takes { lang } and works fully offline.
import { NeedsWants } from "./NeedsWants.jsx";
import { Inflation } from "./Inflation.jsx";
import { Compound } from "./Compound.jsx";
import { Emi } from "./Emi.jsx";
import { FlatVsReducing } from "./FlatVsReducing.jsx";
import { Sip } from "./Sip.jsx";
import { Emergency } from "./Emergency.jsx";
import { Insurance } from "./Insurance.jsx";
import { Diversify } from "./Diversify.jsx";
import { Fees } from "./Fees.jsx";
import { Opportunity } from "./Opportunity.jsx";
import { UpiCheck } from "./UpiCheck.jsx";

export const WIDGETS = {
  needs_wants: NeedsWants,
  inflation: Inflation,
  compound: Compound,
  emi: Emi,
  flat_vs_reducing: FlatVsReducing,
  sip: Sip,
  emergency: Emergency,
  insurance: Insurance,
  diversify: Diversify,
  fees: Fees,
  opportunity: Opportunity,
  upi_check: UpiCheck,
};
