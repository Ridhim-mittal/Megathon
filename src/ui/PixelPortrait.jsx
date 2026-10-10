import React, { useEffect, useRef } from "react";
import { BookOpen, Newspaper } from "lucide-react";
import { LOOKS, drawCharacter } from "./map/art.js";
import { Portrait } from "./Portrait.jsx";

// Cast roles drawn with the map's pixel sprites.
const ROLE_LOOK = {
  mentor: "granny",
  sibling: "sibling",
  friend: "friend",
  tempter: "tempter",
  agent: "agent",
  father: "father",
  mother: "mother",
  shopkeeper: "shopkeeper",
  lender: "lender",
  teacher: "teacher",
  banker: "banker",
  doctor: "doctor",
  clerk: "clerk",
  farmer: "farmer",
  worker: "worker",
  postman: "postman",
};

export function PixelPortrait({ role = "player", avatar = "boy", stage = "child", dir = "down", className = "", frame = 0 }) {
  const ref = useRef(null);
  const special = role === "narrator" || role === "headline" || role === "buffalo";
  useEffect(() => {
    if (special) return;
    const c = ref.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    const key = role === "player" ? avatar : ROLE_LOOK[role] ?? "clerk";
    const look = (LOOKS[key] ?? LOOKS.clerk)(stage);
    drawCharacter(ctx, 0, 0, look, dir, frame);
  }, [role, avatar, stage, dir, frame, special]);
  if (role === "buffalo") return <Portrait role="buffalo" className={className} />;
  if (special) {
    const Icon = role === "headline" ? Newspaper : BookOpen;
    return (
      <span className={`pixel-portrait portrait-icon ${className}`}>
        <Icon size={30} strokeWidth={1.6} />
      </span>
    );
  }
  return (
    <span className={`pixel-portrait ${className}`}>
      <canvas ref={ref} width={16} height={24} />
    </span>
  );
}
