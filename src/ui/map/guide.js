// The objective guide on the map: a gently bobbing arrow over the target door, and an arrow at
// the screen edge when the target is off screen.

import { TILE } from "./village.js";

const GOLD = "#ffd84a";
const INK = "#2b1d0e";

export function drawGuide(ctx, view, place, now, { urgent = false } = {}) {
  if (!place?.entrance) return;
  const camX = view.camX;
  const camY = view.camY;
  // A slow breath instead of blinking: urgent arrows are red and breathe a little faster.
  const breath = 0.5 + 0.5 * Math.sin(now / (urgent ? 380 : 900));
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
