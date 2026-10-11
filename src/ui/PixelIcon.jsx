import React from "react";

// Tiny pixel-art icons, drawn from character grids like the map sprites (instead of emojis).
const PAL = {
  K: "#3a2a18", // outline
  Y: "#ffd04a",
  W: "#ffffff",
  S: "#f2c28a", // skin
  B: "#4f8fe0",
  O: "#e8843a",
  G: "#5aa843",
  A: "#a8adb5", // grey metal
  L: "#a8743a", // wood
  C: "#cfe8f5", // glass
  T: "#f2dfb0", // paper
  R: "#e0484f",
  D: "#8a5a2a", // soil
  P: "#e07a9a",
  E: "#3a2a18", // eyes
};

const ICONS = {
  star: ["....K....", "...KYK...", "KKKKYKKKK", "KYYYYYYYK", ".KYYYYYK.", "..KYYYK..", ".KYYKYYK.", ".KYK.KYK.", ".KK...KK."],
  thumbsUp: ["....KK....", "...KSSK...", "...KSSK...", "KKKKSSKKK.", "KBBKSSSSSK", "KBBKSSSSSK", "KBBKSSSSK.", "KBBKSSSSSK", "KKKKKKKKK."],
  faceSmile: ["..KKKKKK..", ".KYYYYYYK.", "KYYYYYYYYK", "KYYEYYEYYK", "KYYYYYYYYK", "KYEYYYYEYK", "KYYEEEEYYK", ".KYYYYYYK.", "..KKKKKK.."],
  faceSad: ["..KKKKKK..", ".KYYYYYYK.", "KYYYYYYYYK", "KYYEYYEYYK", "KYBYYYYYYK", "KYBEEEEYYK", "KYEYYYYEYK", ".KYYYYYYK.", "..KKKKKK.."],
  faceGrimace: ["..KKKKKKB.", ".KYYYYYYKB", "KYYYYYYYYK", "KYYEYYEYYK", "KYYYYYYYYK", "KYEEEEEEYK", "KYEWEWEEYK", ".KYYYYYYK.", "..KKKKKK.."],
  eye: ["..KKKKKK..", ".KWWWWWWK.", "KWWWKKWWWK", "KWWWKKWWWK", ".KWWWWWWK.", "..KKKKKK.."],
  redo: ["..KKKK.K.", ".KOOOOKOK", "KOK..KOOK", "KOK.KOOOK", "KOK.KKKKK", "KOK......", ".KOOOOK..", "..KKKK..."],
  lock: ["..KKKK..", ".KA..AK.", ".KA..AK.", "KKKKKKKK", "KYYYYYYK", "KYYKKYYK", "KYYKKYYK", "KYYYYYYK", "KKKKKKKK"],
  map: ["KKKKKKKKKK", "KTTKTTKTTK", "KTRKTTKTTK", "KTTRRTKTTK", "KTTKTRRTTK", "KTTKTTKRTK", "KTTKTTKTTK", "KKKKKKKKKK"],
  jar: [".KKKKKK.", ".KLLLLK.", "KKKKKKKK", "KCCCCCCK", "KCCCCCCK", "KCYYYYCK", "KYYYYYYK", "KYYYYYYK", ".KKKKKK."],
  sprout: ["..KK.KK..", ".KGGKGGK.", ".KGGKGGK.", "..KKGKK..", "....G....", "....G....", "..KKKKK..", ".KDDDDDK.", "..KKKKK.."],
  shield: ["KKKKKKKKK", "KRRRRRRRK", "KRRWWWRRK", "KRRWWWRRK", "KRWWWWWRK", "KRRWWWRRK", ".KRRWRRK.", "..KRRRK..", "...KRK...", "....K...."],
  bulb: ["..KKKK..", ".KYYYYK.", "KYYWYYYK", "KYYYYYYK", "KYYYYYYK", ".KYYYYK.", "..KYYK..", "..KAAK..", "..KAAK..", "...KK..."],
  key: [".KKK......", "KYYYKKKKKK", "KY.YYYYYYK", "KYYYKKYKYK", ".KKK..K.K."],
  calc: ["KKKKKKKK", "KWWWWWWK", "KWGGGGWK", "KWWWWWWK", "KWBWBWBK", "KWWWWWWK", "KWBWBWBK", "KWWWWWWK", "KWBWBWOK", "KKKKKKKK"],
  card: ["KKKKKKK", "KWWWWWK", "KWWRWWK", "KWRRRWK", "KRRRRRK", "KWRRRWK", "KWWRWWK", "KWWWWWK", "KKKKKKK"],
  sliders: ["KKKKKKKKKK", "KWWWWWWWWK", "KWKKOKKKWK", "KWWWWWWWWK", "KWKKKKOKWK", "KWWWWWWWWK", "KWKOKKKKWK", "KKKKKKKKKK"],
  question: [".KKKKK.", "KOOOOOK", "KOK.KOK", "...KOOK", "..KOOK.", "..KOK..", "..KOK..", "...K...", "..KOK..", "..KKK.."],
  book: ["KKKKKKKKKK", "KBBBBKPPPK", "KBWWBKPWWK", "KBBBBKPPPK", "KBWWBKPWWK", "KBBBBKPPPK", "KBBBBKPPPK", "KKKKKKKKKK"],
  chart: ["K.........", "K......GG.", "K.....GG..", "K..G.GG...", "K.GGGG....", "KGG.......", "K.........", "KKKKKKKKKK"],
  tick: ["......KK", ".....KGK", "KK..KGK.", "KGKKGK..", ".KGGK...", "..KK...."],
  cross: ["KK....KK", "KRK..KRK", ".KRKKRK.", "..KRRK..", ".KRKKRK.", "KRK..KRK", "KK....KK"],
};

export function PixelIcon({ name, size = 20, className = "", label }) {
  const rows = ICONS[name];
  if (!rows) return null;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const rects = [];
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (PAL[ch]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={PAL[ch]} />);
    }),
  );
  return (
    <svg
      className={`pixel-icon ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      width={(size * w) / h}
      height={size}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
    >
      {rects}
    </svg>
  );
}

export const PILLAR_PIXEL = { PLAN: "map", SAVE: "jar", INVEST: "sprout", SAFE: "shield" };
