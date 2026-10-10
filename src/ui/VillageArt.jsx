// A strip of village that changes with the years: mud road → tar road, keypad → smartphone.
export function VillageArt({ era, className = "" }) {
  const tar = era.road === "tar";
  const mixed = era.road === "mixed";
  return (
    <svg viewBox="0 0 320 46" className={`block h-10 w-full ${className}`} aria-hidden data-road={era.road} data-phone={era.phone}>
      <rect width="320" height="46" fill="#8fc7c9" />
      <circle cx="292" cy="11" r="7" fill="#e9a53b" stroke="#241510" strokeWidth="1.5" />
      <path d="M0 30 Q40 12 80 26 T170 24 T250 22 T320 26 V46 H0Z" fill="#3d7a4a" stroke="#241510" strokeWidth="1.5" />
      {[24, 120, 210].map((x, i) => (
        <g key={x} transform={`translate(${x} ${17 + (i % 2) * 2})`}>
          <rect x="0" y="8" width="22" height="13" fill="#f7e9cb" stroke="#241510" strokeWidth="1.5" />
          <path d={tar && i === 1 ? "M-2 8h26v-6h-26z" : "M-3 9 11 0 25 9Z"} fill={tar && i === 1 ? "#d9d4c7" : "#b5332e"} stroke="#241510" strokeWidth="1.5" />
          <rect x="8" y="13" width="6" height="8" fill="#2b3a67" />
        </g>
      ))}
      {(tar || mixed) && (
        <g stroke="#241510" strokeWidth="1.5">
          <line x1="170" y1="10" x2="170" y2="36" />
          <line x1="164" y1="13" x2="176" y2="13" />
          <path d="M170 13 Q220 22 268 13" fill="none" strokeWidth="1" />
        </g>
      )}
      <rect x="0" y="36" width="320" height="10" fill={tar ? "#4b4b4f" : "#a0703c"} stroke="#241510" strokeWidth="1.5" />
      {mixed && <rect x="0" y="36" width="150" height="10" fill="#4b4b4f" />}
      {tar || mixed ? (
        <path d={`M8 41h${tar ? 300 : 140}`} stroke="#f7e9cb" strokeWidth="1.5" strokeDasharray="10 8" />
      ) : (
        <path d="M6 39 q40 4 80 0 t80 2 t80 -1 t70 1" fill="none" stroke="#6b4423" strokeWidth="1.2" />
      )}
      {era.phone === "smart" ? (
        <g transform="translate(250 18)">
          <rect width="11" height="18" rx="2" fill="#241510" />
          <rect x="1.5" y="2" width="8" height="12" fill="#8fc7c9" />
        </g>
      ) : (
        <g transform="translate(250 20)">
          <rect width="10" height="15" rx="2" fill="#2b3a67" stroke="#241510" />
          <rect x="2" y="2" width="6" height="4" fill="#d6efc9" />
          <path d="M2 8h6M2 10.5h6M2 13h6" stroke="#f7e9cb" strokeWidth="1" strokeDasharray="1.5 1" />
        </g>
      )}
    </svg>
  );
}
