import React from "react";
import { BookOpen, Newspaper } from "lucide-react";

// Cast portraits in the village's soft, rounded style (same geometry as the player character).
// One parametric drawing; each role gets its own clothes and props.
const LOOKS = {
  player: { body: "#e5a15f", hair: "#45443c", scarf: true },
  mentor: { body: "#ad829f", hair: "#e1ddd1", bun: "#d9d7ca", glasses: "thread" },
  sibling: { body: "#e4a3b5", hair: "#3f3a33", plaits: true, small: true },
  friend: { body: "#7fa6c4", hair: "#38342c", cap: "#d9824f" },
  tempter: { body: "#e9c64f", hair: "#2e2a26", sunglasses: true, chain: true },
  agent: { body: "#55657d", hair: "#3a352f", tie: "#b9523f" },
  father: { body: "#efe9d9", hair: "#3b362f", mustache: true, turban: "#e7c46d", skin: "#a8724f" },
  mother: { body: "#7aa37f", hair: "#2f2b27", bun: "#2f2b27", bindi: true, skin: "#b67c5a" },
  shopkeeper: { body: "#d98b6a", hair: "#3e3730", bun: "#3e3730", bindi: true },
  lender: { body: "#fbf8ef", hair: "#9a958c", mustache: true, tilak: true, bald: true },
  teacher: { body: "#8fa9cf", hair: "#3a352f", bun: "#3a352f", specs: true },
  banker: { body: "#c97a9a", hair: "#2f2b27", bun: "#2f2b27", bindi: true, badge: true },
};

function Buffalo() {
  return (
    <svg viewBox="0 0 80 100" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="25" ry="6" fill="#35522f" opacity=".2" />
      <path d="M14 30q-12-12-6-24q6 12 18 14M66 30q12-12 6-24q-6 12-18 14" fill="#d8cfb8" stroke="#8f8571" strokeWidth="2" />
      <ellipse cx="40" cy="48" rx="26" ry="30" fill="#5d5a57" />
      <ellipse cx="13" cy="38" rx="9" ry="5" fill="#4d4a47" transform="rotate(-25 13 38)" />
      <ellipse cx="67" cy="38" rx="9" ry="5" fill="#4d4a47" transform="rotate(25 67 38)" />
      <ellipse cx="40" cy="66" rx="17" ry="12" fill="#9b8f86" />
      <circle cx="33" cy="66" r="2.6" fill="#3d3936" />
      <circle cx="47" cy="66" r="2.6" fill="#3d3936" />
      <path d="M29 42q4-3 8 0M43 42q4-3 8 0" stroke="#efe7d8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M34 77q6 4 12 0" stroke="#e6d49a" strokeWidth="3" fill="none" />
    </svg>
  );
}

// Lucky Prakash's sunglasses get bigger every visit (content BIBLE): scale by age.
const shadeScale = (age) => (age >= 34 ? 1.7 : age >= 24 ? 1.5 : age >= 18 ? 1.3 : age >= 15 ? 1.15 : 1);

export function Portrait({ role = "player", age = 11, mood = "", className = "" }) {
  if (role === "buffalo") return <span className={`portrait ${className}`}><Buffalo /></span>;
  if (role === "narrator" || role === "headline") {
    const Icon = role === "headline" ? Newspaper : BookOpen;
    return (
      <span className={`portrait portrait-icon ${className}`}>
        <Icon size={34} strokeWidth={1.6} />
      </span>
    );
  }
  const look = LOOKS[role] ?? LOOKS.player;
  const skin = look.skin ?? "#bf8968";
  const s = shadeScale(age);
  return (
    <span className={`portrait ${mood ? `mood-${mood}` : ""} ${className}`}>
      <svg viewBox="0 0 80 100" aria-hidden="true">
        <ellipse cx="40" cy="92" rx="23" ry="6" fill="#35522f" opacity=".2" />
        <path d="M30 72v15m20-15v15" stroke="#4c574d" strokeWidth="9" strokeLinecap="round" />
        <path d="M23 75V53Q40 40 57 53v22Z" fill={look.body} stroke="#685549" strokeWidth="2" />
        <path d="m23 57-7 13m41-13 7 13" stroke={skin} strokeWidth="8" strokeLinecap="round" />
        {look.tie && <path d="M40 50l-3 6 3 14 3-14Z" fill={look.tie} />}
        {look.chain && <path d="M31 52q9 9 18 0" stroke="#e2b93b" strokeWidth="2.5" fill="none" />}
        {look.badge && <rect x="45" y="58" width="8" height="6" rx="1" fill="#fff3d0" stroke="#8a6d55" />}
        {look.bun && <circle cx="43" cy="15" r={look.small ? 8 : 11} fill={look.bun} />}
        {look.turban && <path d="M18 25q22-24 44 0q-22-8-44 0Z" fill={look.turban} stroke="#b89a4c" strokeWidth="2" />}
        <circle cx="40" cy="33" r={look.small ? 18 : 21} fill={skin} />
        {!look.bald && <path d="M19 34Q11 4 40 9Q67 6 61 36L51 22Q36 30 21 26" fill={look.hair} />}
        {look.bald && <path d="M19 34Q16 22 22 20M61 34Q64 22 58 20" stroke={look.hair} strokeWidth="5" fill="none" />}
        {look.plaits && <path d="M20 32q-6 18 0 30M60 32q6 18 0 30" stroke={look.hair} strokeWidth="5" fill="none" strokeLinecap="round" />}
        {look.cap && <path d="M18 24q22-22 44 0Zm40-2q10 0 14 5" fill={look.cap} stroke="#a95f37" strokeWidth="2" />}
        <g className="portrait-eyes">
          <circle cx="33" cy="35" r="2" fill="#474039" />
          <circle cx="48" cy="35" r="2" fill="#474039" />
        </g>
        {look.glasses && (
          <g fill="none" stroke="#635550" strokeWidth="2.4" className="portrait-glasses">
            <circle cx="32" cy="35" r="6.5" />
            <circle cx="49" cy="35" r="6.5" />
            <path d="M38.5 34h4" />
            <path d="M25.5 34Q18 30 16 40M55.5 34Q63 30 65 40" stroke="#1f1d1c" strokeWidth="1" />
          </g>
        )}
        {look.specs && (
          <g fill="none" stroke="#6b5e55" strokeWidth="1.6">
            <rect x="26" y="31" width="11" height="8" rx="3" />
            <rect x="43" y="31" width="11" height="8" rx="3" />
            <path d="M37 34h6" />
          </g>
        )}
        {look.sunglasses && (
          <g transform={`translate(40 35) scale(${s}) translate(-40 -35)`}>
            <path d="M24 31h14v6q-7 6-14 0ZM42 31h14v6q-7 6-14 0Z" fill="#1d1f24" />
            <path d="M38 33h4" stroke="#1d1f24" strokeWidth="2" />
            <path d="M27 33l4 0" stroke="#7f8796" strokeWidth="1.5" />
          </g>
        )}
        {look.mustache && <path d="M33 41q7 4 14 0q-7-2-14 0Z" fill={look.hair === "#9a958c" ? "#d7d2c7" : "#3b362f"} />}
        {look.bindi && <circle cx="40.5" cy="26" r="1.6" fill="#c2453c" />}
        {look.tilak && <path d="M40.5 22v8" stroke="#d76f3c" strokeWidth="2" />}
        <path d="M36 44q5 5 10-1" fill="none" stroke="#7b4e42" strokeWidth="2" strokeLinecap="round" className="portrait-mouth" />
        <g fill="#dc9a80" opacity=".8">
          <ellipse cx="26" cy="41" rx="4" ry="2" />
          <ellipse cx="55" cy="41" rx="4" ry="2" />
        </g>
        {look.scarf && <path d="M25 56q15 7 30 0" fill="none" stroke="#f8d59d" strokeWidth="3" />}
      </svg>
    </span>
  );
}
