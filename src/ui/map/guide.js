// The objective guide on the map: a steady, softly glowing path from the player to the target
// door, a gently bobbing arrow over the door, and an arrow at the screen edge when the target is
// off screen.

import { TILE, findPath as villagePath } from "./village.js";

const GOLD = "#ffd84a";
const INK = "#2b1d0e";

export function drawGuide(ctx, view, cache, player, place, now, { urgent = false, findPath = villagePath } = {}) {
  if (!place?.entrance) return;
  // Keep one path while the player follows it; find a new one only when they leave it, so the
  // trail never jumps between equally short routes.
  const here = { x: player.x, y: player.y };
  if (cache.place !== place.id || !cache.path || cache.finder !== findPath) {
    cache.finder = findPath;
    cache.place = place.id;
    cache.path = findPath(here, place.entrance) ?? [];
  } else {
    const i = cache.path.findIndex((p) => p.x === here.x && p.y === here.y);
    if (i >= 0) cache.path = cache.path.slice(i + 1);
    else if (!(cache.from && cache.from.x === here.x && cache.from.y === here.y)) cache.path = findPath(here, place.entrance) ?? [];
  }
  cache.from = here;
  const camX = view.camX;
  const camY = view.camY;
  // A slow breath instead of blinking: urgent trails are red and breathe a little faster.
  const breath = 0.5 + 0.5 * Math.sin(now / (urgent ? 380 : 900));
  const rgb = urgent ? "255, 98, 74" : "255, 216, 74";
  const center = (p) => [p.x * TILE + 8 - camX, p.y * TILE + 8 - camY];

  // The trail: one soft glowing path from the player (where they really are) to the door.
  const pts = [[player.fx * TILE + 8 - camX, player.fy * TILE + 8 - camY], ...cache.path.map(center)];
  if (pts.length > 1) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const stroke = (width, alpha) => {
      ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
      ctx.stroke();
    };
    stroke(11, 0.1 + 0.08 * breath);
    stroke(6, 0.22 + 0.1 * breath);
    stroke(2, 0.55 + 0.2 * breath);
    ctx.restore();
  }
  const color = urgent ? "#ff624a" : GOLD;

  // Arrow over the door, bobbing gently.
  const tx = place.entrance.x * TILE + 8 - camX;
  const ty = place.entrance.y * TILE - 14 - camY + Math.round(Math.sin(now / 420) * 2);
  const onScreen = tx > 6 && tx < view.w - 6 && ty > 6 && ty < view.h - 6;
  if (onScreen) {
    downArrow(ctx, Math.round(tx), Math.round(ty), color);
    return;
  }
  // Off screen: an arrow at the edge, pointing the way.
  const cx = view.w / 2;
  const cy = view.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const scale = Math.min((view.w / 2 - 14) / Math.max(1, Math.abs(dx)), (view.h / 2 - 14) / Math.max(1, Math.abs(dy)));
  const ex = Math.round(cx + dx * scale);
  const ey = Math.round(cy + dy * scale);
  edgeArrow(ctx, ex, ey, Math.atan2(dy, dx), color, breath);
}

function downArrow(ctx, x, y, color) {
  ctx.fillStyle = INK;
  ctx.fillRect(x - 4, y - 9, 9, 7);
  ctx.fillRect(x - 6, y - 3, 13, 2);
  ctx.fillRect(x - 5, y - 1, 11, 1);
  ctx.fillRect(x - 4, y, 9, 1);
  ctx.fillRect(x - 3, y + 1, 7, 1);
  ctx.fillRect(x - 2, y + 2, 5, 1);
  ctx.fillRect(x - 1, y + 3, 3, 1);
  ctx.fillStyle = color;
  ctx.fillRect(x - 3, y - 8, 7, 6);
  ctx.fillRect(x - 5, y - 2, 11, 1);
  ctx.fillRect(x - 4, y - 1, 9, 1);
  ctx.fillRect(x - 3, y, 7, 1);
  ctx.fillRect(x - 2, y + 1, 5, 1);
  ctx.fillRect(x - 1, y + 2, 3, 1);
}

function edgeArrow(ctx, x, y, angle, color, breath) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const pulse = breath * 1.5;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(10 + pulse, 0);
  ctx.lineTo(-6, -9);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(7 + pulse, 0);
  ctx.lineTo(-4, -6);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-4, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
