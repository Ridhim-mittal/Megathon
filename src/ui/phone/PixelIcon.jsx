import React from "react";

// Tiny pixel-art icons drawn from character grids. Each character is one pixel; "." is empty.
const PALETTE = {
  k: "#2b2238", // outline
  w: "#fff8e7",
  t: "#0a8fa3",
  T: "#06606e",
  o: "#d66a12",
  y: "#f2c14e",
  g: "#5aa95a",
  G: "#2f6f3a",
  r: "#c8423b",
  b: "#8a5a3b",
  p: "#b98ad6",
  s: "#c9c2b1",
};

export const ICONS = {
  bank: [
    "......kk......",
    "....kkyykk....",
    "..kkyyyyyykk..",
    ".kyyyyyyyyyyk.",
    ".kkkkkkkkkkkk.",
    "..kwk.kwk.kwk.",
    "..kwk.kwk.kwk.",
    "..kwk.kwk.kwk.",
    "..kwk.kwk.kwk.",
    ".kkkkkkkkkkkk.",
    "kyyyyyyyyyyyyk",
    "kkkkkkkkkkkkkk",
  ],
  invest: [
    "..........kk..",
    ".........kggk.",
    "....kk..kgGgk.",
    "...kggk.kgggk.",
    "...kgGgkkgGk..",
    "....kggkkkk...",
    ".....kkgk.....",
    "......kgk.....",
    "...kkkkgkkkk..",
    "..kbbbbbbbbk..",
    "...kbbbbbbk...",
    "....kkkkkk....",
  ],
  messages: [
    "..............",
    "kkkkkkkkkkkkkk",
    "kwwwwwwwwwwwwk",
    "kkwwwwwwwwwwkk",
    "kwkkwwwwwwkkwk",
    "kwwwkkwwkkwwwk",
    "kwwwwwkkwwwwwk",
    "kwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwk",
    "kkkkkkkkkkkkkk",
    "..............",
    "..............",
  ],
  gyaan: [
    "..............",
    ".kkkkk..kkkkk.",
    "kwwwwwkkwwwwwk",
    "kwkkkwkkwkkkwk",
    "kwwwwwkkwwwwwk",
    "kwkkkwkkwkkkwk",
    "kwwwwwkkwwwwwk",
    "kwkkwwkkwwkkwk",
    "kwwwwwkkwwwwwk",
    ".kkkkkkkkkkkk.",
    "......kk......",
    "..............",
  ],
  // Status-bar icons are drawn light, for the dark bar.
  signal: ["......w", "....w.w", "..w.w.w", "w.w.w.w"],
  battery: ["wwwwwwwww.", "wggggggw..", "wggggggwww", "wwwwwwwww."],
};

export function PixelIcon({ name, size = 42, title }) {
  const rows = ICONS[name];
  if (!rows) return null;
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg
      width={size}
      height={(size * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="ph-pixel"
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PALETTE[c]} />)),
      )}
    </svg>
  );
}
