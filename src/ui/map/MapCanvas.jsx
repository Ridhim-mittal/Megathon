import React, { useEffect, useMemo, useRef, useState } from "react";
import { LOOKS, drawCharacter, drawMarker } from "./art.js";
import { drawGuide } from "./guide.js";
import { TILE } from "./mapkit.js";
import { VILLAGE } from "./village.js";
import "./maps.js";

const DIRS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};
const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SPEED = 5.5; // tiles per second


// The playable village. Keyboard: arrows/WASD to walk, Enter/Space to go in. Mouse: click a
// place or the ground to walk there. Calls onEnter(placeId) at a door.
export function MapCanvas({ map = VILLAGE, avatar = "boy", stage = "child", markers = {}, labels = {}, active = true, onEnter, onGranny, spawn, goTo, guide = null, ariaLabel }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const labelLayer = useRef(null);
  const mapRef = useRef(map);
  mapRef.current = map;
  const layers = useMemo(() => [map.render(0), map.render(1)], [map]);
  const view = useRef({ scale: 3, w: 400, h: 300, camX: 0, camY: 0 });
  const [scale, setScale] = useState(3);
  const me = useRef({ x: map.START.x, y: map.START.y, fx: map.START.x, fy: map.START.y, dir: "down", moving: null, path: [], enterOnArrive: null, held: [], frame: 0, animT: 0 });
  const granny = useRef({ x: 7, y: 9, dir: "left", t: 0 });
  const props = useRef({});
  props.current = { avatar, stage, markers, active, onEnter, onGranny, guide };
  const guideCache = useRef({ key: null, path: [] });

  // Place the player (new chapter, or back out of a door).
  useEffect(() => {
    if (!spawn) return;
    const m = me.current;
    Object.assign(m, { x: spawn.x, y: spawn.y, fx: spawn.x, fy: spawn.y, dir: spawn.dir ?? "down", moving: null, path: [], enterOnArrive: null });
  }, [spawn]);

  // Walk to a place and go in (quest log "go there"). goTo = { place, key }.
  useEffect(() => {
    if (!goTo?.place) return;
    const place = mapRef.current.PLACES.find((p) => p.id === goTo.place);
    if (!place) return;
    const m = me.current;
    const from = m.moving ? m.moving.to : { x: m.x, y: m.y };
    if (!m.moving && from.x === place.entrance.x && from.y === place.entrance.y) {
      m.dir = "up";
      props.current.onEnter?.(place.id);
      return;
    }
    const path = mapRef.current.findPath(from, place.entrance);
    if (!path) return;
    m.held = [];
    m.path = path;
    m.enterOnArrive = place.id;
  }, [goTo]);

  // Size the canvas: a whole number of screen pixels per art pixel.
  useEffect(() => {
    const resize = () => {
      const el = wrap.current;
      if (!el) return;
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      const scale = Math.max(2, Math.min(5, Math.floor(vh / 220)));
      const v = view.current;
      v.scale = scale;
      setScale(scale);
      v.w = Math.ceil(vw / scale);
      v.h = Math.ceil(vh / scale);
      const c = canvas.current;
      c.width = v.w;
      c.height = v.h;
      c.style.width = `${v.w * scale}px`;
      c.style.height = `${v.h * scale}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  // Keyboard.
  useEffect(() => {
    const down = (e) => {
      if (!props.current.active || e.target.closest?.("input,textarea,select,[role=dialog],dialog")) return;
      const dir = DIRS[e.key];
      const m = me.current;
      if (dir) {
        e.preventDefault();
        m.path = [];
        m.enterOnArrive = null;
        if (!m.held.includes(dir)) m.held.push(dir);
      } else if (e.key === "Enter" || e.key === " " || e.key === "e" || e.key === "E") {
        const place = mapRef.current.placeByEntrance(m.x, m.y);
        if (place && !m.moving) {
          e.preventDefault();
          props.current.onEnter?.(place.id);
        }
      }
    };
    const up = (e) => {
      const dir = DIRS[e.key];
      if (dir) me.current.held = me.current.held.filter((d) => d !== dir);
    };
    const blur = () => (me.current.held = []);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    if (!active) me.current.held = [];
  }, [active]);

  // The game loop.
  useEffect(() => {
    let raf;
    let last = performance.now();
    const ctx = canvas.current.getContext("2d");
    const tick = (now) => {
      // Real time even when frames are slow: step in small slices.
      let dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      while (dt > 0) {
        update(Math.min(dt, 0.05), now);
        dt -= 0.05;
      }
      draw(ctx, now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  function tryEnterAhead(m, dir) {
    if (dir !== "up") return false;
    const place = mapRef.current.placeByEntrance(m.x, m.y);
    if (!place) return false;
    props.current.onEnter?.(place.id);
    return true;
  }

  function update(dt, now) {
    const m = me.current;
    const p = props.current;
    if (m.moving) {
      m.moving.t += dt * SPEED;
      const t = Math.min(1, m.moving.t);
      m.fx = m.moving.from.x + (m.moving.to.x - m.moving.from.x) * t;
      m.fy = m.moving.from.y + (m.moving.to.y - m.moving.from.y) * t;
      m.animT += dt;
      if (t >= 1) {
        m.x = m.moving.to.x;
        m.y = m.moving.to.y;
        m.moving = null;
        if (!m.path.length && m.enterOnArrive && p.active) {
          const place = mapRef.current.placeByEntrance(m.x, m.y);
          m.enterOnArrive = null;
          if (place) {
            m.dir = "up";
            p.onEnter?.(place.id);
          }
        }
      }
    }
    if (!m.moving && p.active) {
      let dir = null;
      let next = null;
      if (m.held.length) {
        dir = m.held[m.held.length - 1];
        next = { x: m.x + DELTA[dir][0], y: m.y + DELTA[dir][1] };
      } else if (m.path.length) {
        next = m.path.shift();
        dir = next.x > m.x ? "right" : next.x < m.x ? "left" : next.y > m.y ? "down" : "up";
      }
      if (dir) {
        m.dir = dir;
        if (mapRef.current.walkable(next.x, next.y)) m.moving = { from: { x: m.x, y: m.y }, to: next, t: 0 };
        else if (m.held.length && tryEnterAhead(m, dir)) m.held = [];
      }
    }
    if (!m.moving) m.animT = 0;
    // Ammamma strolls along the road in front of home (on maps where she lives).
    const route = mapRef.current.granny;
    const g = granny.current;
    if (!route) return;
    g.t += dt;
    const phase = (g.t % 16) / 16;
    const span = route.from - route.to;
    const pos = phase < 0.4 ? route.from - (phase / 0.4) * span : phase < 0.5 ? route.to : phase < 0.9 ? route.to + ((phase - 0.5) / 0.4) * span : route.from;
    g.dir = phase < 0.4 ? "left" : phase < 0.5 ? "down" : phase < 0.9 ? "right" : "down";
    g.moving = phase < 0.4 || (phase >= 0.5 && phase < 0.9);
    g.x = pos;
    g.y = route.y;
  }

  function draw(ctx, now) {
    const v = view.current;
    const m = me.current;
    const M = mapRef.current;
    const mapW = M.W * TILE;
    const mapH = M.H * TILE;
    const cx = m.fx * TILE + 8 - v.w / 2;
    const cy = m.fy * TILE + 8 - v.h / 2;
    v.camX = Math.round(mapW <= v.w ? (mapW - v.w) / 2 : Math.max(0, Math.min(mapW - v.w, cx)));
    v.camY = Math.round(mapH <= v.h ? (mapH - v.h) / 2 : Math.max(0, Math.min(mapH - v.h, cy)));
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#2f6b2a";
    ctx.fillRect(0, 0, v.w, v.h);
    const layer = layers[Math.floor(now / 600) % 2];
    ctx.drawImage(layer, -v.camX, -v.camY);
    M.ambient?.(ctx, now, v.camX, v.camY);

    // Markers over places with events.
    for (const place of M.PLACES) {
      const kind = props.current.markers[place.id];
      if (!kind) continue;
      const x = place.door.x * TILE + 8 - v.camX;
      const y = place.y * TILE - (place.h > 1 ? 18 : 30) - v.camY;
      drawMarker(ctx, x, y, kind, now + place.x * 90);
    }

    // Story mode: the trail to the objective (guide = { place, urgent }).
    if (props.current.guide?.place && M.placeById[props.current.guide.place]) {
      drawGuide(ctx, v, guideCache.current, m, M.placeById[props.current.guide.place], now, { urgent: props.current.guide.urgent, findPath: M.findPath });
    }

    // People, back to front.
    const g = granny.current;
    const people = [
      ...M.npcs.map((n, i) => ({ look: LOOKS[n.look](), x: n.x, y: n.y, dir: Math.floor(now / 2500 + i) % 3 === 0 ? "left" : "down", frame: 0 })),
      ...(M.granny ? [{ look: LOOKS.granny(), x: g.x, y: g.y, dir: g.dir, frame: g.moving ? [1, 0, 2, 0][Math.floor(g.t * 4) % 4] : 0 }] : []),
      {
        look: (LOOKS[props.current.avatar] ?? LOOKS.boy)(props.current.stage),
        x: m.fx,
        y: m.fy,
        dir: m.dir,
        frame: m.moving ? [1, 0, 2, 0][Math.floor(m.animT * 8) % 4] : 0,
        me: true,
      },
    ].sort((a, b) => a.y - b.y);
    for (const c of people) {
      const sx = Math.round(c.x * TILE - v.camX);
      const sy = Math.round(c.y * TILE - 8 - v.camY);
      if (sx < -16 || sy < -24 || sx > v.w || sy > v.h) continue;
      drawCharacter(ctx, sx, sy, c.look, c.dir, c.frame);
      if (c.me) {
        ctx.fillStyle = "#fff8d0";
        ctx.fillRect(sx + 7, sy - 4 + Math.round(Math.sin(now / 250)), 2, 2);
      }
    }
    // Labels follow the camera.
    if (labelLayer.current) labelLayer.current.style.transform = `translate(${-v.camX * v.scale}px, ${-v.camY * v.scale}px)`;
  }

  // Mouse: walk to a tile, or to a place's door and go in.
  function onClick(e) {
    if (!props.current.active) return;
    const v = view.current;
    const rect = canvas.current.getBoundingClientRect();
    const tx = Math.floor(((e.clientX - rect.left) / v.scale + v.camX) / TILE);
    const ty = Math.floor(((e.clientY - rect.top) / v.scale + v.camY) / TILE);
    const g = granny.current;
    const M = mapRef.current;
    if (M.granny && Math.abs(tx - Math.round(g.x)) <= 0 && (ty === g.y || ty === g.y - 1)) {
      props.current.onGranny?.();
      return;
    }
    const m = me.current;
    const from = m.moving ? m.moving.to : { x: m.x, y: m.y };
    const place = M.placeAt(tx, ty) ?? M.placeByEntrance(tx, ty);
    const target = place ? place.entrance : { x: tx, y: ty };
    if (place && from.x === target.x && from.y === target.y && !m.moving) {
      m.dir = "up";
      props.current.onEnter?.(place.id);
      return;
    }
    const path = M.findPath(from, target);
    if (!path) return;
    m.held = [];
    m.path = path;
    m.enterOnArrive = place ? place.id : null;
  }

  return (
    <div className="map-wrap" ref={wrap}>
      <canvas ref={canvas} className="map-canvas" onClick={onClick} role="img" aria-label={ariaLabel} />
      <div className="map-labels" ref={labelLayer} aria-hidden="true">
        {map.PLACES.map((p) => (
          <span
            key={p.id}
            className={`map-label ${markers[p.id] ? `has-${markers[p.id]}` : ""}`}
            style={{
              left: `${(p.x * TILE + (p.w * TILE) / 2) * scale}px`,
              top: `${(p.y + p.h) * TILE * scale + 2}px`,
            }}
          >
            {labels[p.id] ?? p.id}
          </span>
        ))}
      </div>
    </div>
  );
}
