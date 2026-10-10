import React, { useRef } from "react";
import {
  ArrowRight,
  Home,
  MessageCircle,
  Play,
  Sprout,
  Sun,
} from "lucide-react";

export function Character({ granny = false }) {
  return (
    <svg viewBox="0 0 80 100" aria-hidden="true">
      <ellipse cx="40" cy="92" rx="23" ry="6" fill="#35522f" opacity=".2" />
      <path
        d="M30 72v15m20-15v15"
        stroke="#4c574d"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M23 75V53Q40 40 57 53v22Z"
        fill={granny ? "#ad829f" : "#e5a15f"}
        stroke="#685549"
        strokeWidth="2"
      />
      <path
        d="m23 57-7 13m41-13 7 13"
        stroke="#bd8667"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {granny && <circle cx="43" cy="15" r="12" fill="#d9d7ca" />}
      <circle cx="40" cy="33" r="21" fill="#bf8968" />
      <path
        d="M19 34Q11 4 40 9Q67 6 61 36L51 22Q36 30 21 26"
        fill={granny ? "#e1ddd1" : "#45443c"}
      />
      <circle cx="33" cy="35" r="2" fill="#474039" />
      <circle cx="48" cy="35" r="2" fill="#474039" />
      {granny && (
        <g fill="none" stroke="#635550" strokeWidth="1.7">
          <circle cx="32" cy="35" r="6" />
          <circle cx="49" cy="35" r="6" />
          <path d="M38 34h5" />
        </g>
      )}
      <path
        d="M36 43q5 5 10-1"
        fill="none"
        stroke="#7b4e42"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g fill="#dc9a80" opacity=".8">
        <ellipse cx="26" cy="41" rx="4" ry="2" />
        <ellipse cx="55" cy="41" rx="4" ry="2" />
      </g>
      {!granny && (
        <path
          d="M25 56q15 7 30 0"
          fill="none"
          stroke="#f8d59d"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}

function Tree({ x, y, scale = 1, blossom = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cy="19" rx="42" ry="13" fill="#527951" opacity=".16" />
      <path
        d="M0 15v-69m0 43-20-25m20 10 18-19"
        stroke="#8e7550"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <g stroke={blossom ? "#b48a8b" : "#64875b"} strokeWidth="2">
        <circle cy="-60" r="39" fill={blossom ? "#dcb3ad" : "#779967"} />
        <circle
          cx="-20"
          cy="-45"
          r="30"
          fill={blossom ? "#efc7bb" : "#93b779"}
        />
        <circle
          cx="20"
          cy="-47"
          r="29"
          fill={blossom ? "#e6bbb1" : "#83a76b"}
        />
        <circle
          cx="-5"
          cy="-77"
          r="26"
          fill={blossom ? "#f0ccbd" : "#9ebb7d"}
        />
      </g>
      <g fill={blossom ? "#fff0d6" : "#e8bd66"}>
        <circle cx="-15" cy="-56" r="4" />
        <circle cx="18" cy="-37" r="4" />
        <circle cx="9" cy="-75" r="4" />
      </g>
    </g>
  );
}

function Cottage({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} strokeLinejoin="round">
      <ellipse cx="0" cy="74" rx="145" ry="26" fill="#4e7552" opacity=".15" />
      <path
        d="M-116-36h232V78h-232Z"
        fill="#eedca8"
        stroke="#aa9569"
        strokeWidth="3"
      />
      <path d="M-116-36h232v16h-232Z" fill="#bca47a" opacity=".3" />
      <path
        d="M-135-30-17-132h46L140-30Z"
        fill="#b97359"
        stroke="#805c49"
        strokeWidth="4"
      />
      <path d="M-119-37-13-123h35L120-37Z" fill="#d5916a" />
      <g stroke="#b57457" strokeWidth="3">
        <path d="M-101-54H101M-83-73H81M-62-91H60M-40-109H40" />
        <path d="m-18-119-31 82m74-82 26 82M3-119v82" />
      </g>
      <path
        d="M69-100v-54h25v77"
        fill="#bc8a69"
        stroke="#805c49"
        strokeWidth="3"
      />
      <path
        d="M-27 78V15q27-32 54 0v63"
        fill="#709789"
        stroke="#688073"
        strokeWidth="3"
      />
      <path d="M-15 77V19q15-14 30 0v58" fill="#608b7f" />
      <circle cx="12" cy="46" r="3" fill="#eed998" />
      {[-76, 76].map((px) => (
        <g key={px}>
          <rect
            x={px - 20}
            y="2"
            width="40"
            height="42"
            rx="5"
            fill="#ffedaf"
            stroke="#918767"
            strokeWidth="4"
          />
          <path d={`M${px} 3v40m-18-21h36`} stroke="#b5a077" strokeWidth="3" />
          <path d={`M${px - 25} 45h50v10h-50Z`} fill="#ac7e60" />
          <g fill="#87a264">
            <circle cx={px - 13} cy="46" r="7" />
            <circle cx={px + 10} cy="45" r="8" />
          </g>
          <g fill="#e6a28d">
            <circle cx={px - 14} cy="41" r="4" />
            <circle cx={px + 10} cy="39" r="4" />
          </g>
        </g>
      ))}
      <path
        d="M-36 79h72v9h-72Zm-9 9h90v9h-90Z"
        fill="#c4b28c"
        stroke="#aa9772"
        strokeWidth="2"
      />
    </g>
  );
}
function Shop({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy="80" rx="109" ry="19" fill="#416845" opacity=".15" />
      <rect
        x="-85"
        y="-44"
        width="170"
        height="123"
        rx="4"
        fill="#edc9a0"
        stroke="#a9936f"
        strokeWidth="3"
      />
      <path
        d="m-100-46 28-68H70l30 68Z"
        fill="#728e86"
        stroke="#5b746d"
        strokeWidth="3"
      />
      <path d="M-73-106H72M-85-78H83" stroke="#8eaaa0" strokeWidth="4" />
      <rect x="-53" y="-78" width="106" height="27" rx="6" fill="#faf0d0" />
      <text
        x="0"
        y="-60"
        textAnchor="middle"
        fill="#60745c"
        fontSize="13"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        KIRANA SHOP
      </text>
      <rect x="-67" y="-7" width="90" height="57" fill="#556e61" rx="3" />
      <path d="M40-10h29v89H40Z" fill="#ad8462" />
      <path d="M-91-29H90v26H-91Z" fill="#f7e6bd" />
      {[-91, -55, -19, 17, 53].map((x) => (
        <path key={x} d={`M${x}-29h18V-3q-9 13-18 0Z`} fill="#c38b6c" />
      ))}
      <g fill="#eac16d">
        <rect x="-58" y="16" width="15" height="22" rx="4" />
        <rect x="-35" y="9" width="14" height="29" rx="4" />
        <rect x="-13" y="17" width="24" height="21" rx="3" />
      </g>
      <rect x="-71" y="44" width="99" height="8" rx="3" fill="#9c795d" />
      <rect x="-81" y="65" width="46" height="28" rx="2" fill="#a98057" />
      <g fill="#86a266">
        <circle cx="-71" cy="67" r="8" />
        <circle cx="-52" cy="65" r="9" />
      </g>
    </g>
  );
}

export function World({
  title = false,
  onHome,
  onGranny,
  onShop,
  avatar,
  onWalk,
  homeRef,
}) {
  const surface = useRef(null);
  const w = 1200,
    h = 800;
  const home = { x: 333, y: 385 };
  const shop = { x: 887, y: 355 };
  function walk(event) {
    if (title || event.target.closest("button")) return;
    const rect = surface.current.getBoundingClientRect();
    onWalk({
      x: Math.max(
        10,
        Math.min(90, ((event.clientX - rect.left) / rect.width) * 100),
      ),
      y: Math.max(
        64,
        Math.min(77, ((event.clientY - rect.top) / rect.height) * 100),
      ),
    });
  }
  return (
    <div
      className={`world ${title ? "world-title" : ""}`}
      ref={surface}
      onPointerDown={walk}
    >
      <svg
        className="world-art"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sky" x2="0" y2="1">
            <stop stopColor="#b9d9c9" />
            <stop offset="1" stopColor="#edf0ce" />
          </linearGradient>
          <linearGradient id="grass" x2="0" y2="1">
            <stop stopColor="#b0c584" />
            <stop offset="1" stopColor="#90ae70" />
          </linearGradient>
          <pattern
            id="grass-dots"
            width="74"
            height="67"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="m12 26-3-7m3 7 4-5m35 27-2-6m2 6 5-4"
              stroke="#6e965e"
              strokeWidth="2"
              opacity=".22"
            />
            <circle cx="61" cy="15" r="2" fill="#d9dfa0" opacity=".65" />
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#sky)" />
        <circle
          cx={w * 0.78}
          cy={h * 0.17}
          r="47"
          fill="#fff3be"
          opacity=".9"
        />
        <circle
          cx={w * 0.78}
          cy={h * 0.17}
          r="64"
          fill="#fff3be"
          opacity=".16"
        />
        <g className="cloud cloud-one" fill="#fffdf0" opacity=".65">
          <path d="M110 130q-8-24 21-24q8-31 37-13q30-4 34 27q21-3 25 16H110Z" />
          <path d={`M${w * 0.65} 88q-5-19 19-20q13-26 38-7q21-1 24 24Z`} />
        </g>
        <path
          d={`M0 ${h * 0.36}Q${w * 0.18} ${h * 0.12} ${w * 0.4} ${h * 0.34}Q${w * 0.62} ${h * 0.1} ${w} ${h * 0.33}V${h}H0Z`}
          fill="#aac297"
        />
        <path
          d={`M0 ${h * 0.38}Q${w * 0.23} ${h * 0.24} ${w * 0.47} ${h * 0.4}Q${w * 0.73} ${h * 0.23} ${w} ${h * 0.36}V${h}H0Z`}
          fill="#97b68b"
        />
        <path
          d={`M0 ${h * 0.45}Q${w * 0.3} ${h * 0.31} ${w * 0.6} ${h * 0.42}Q${w * 0.87} ${h * 0.32} ${w} ${h * 0.42}V${h}H0Z`}
          fill="url(#grass)"
        />
        <rect
          y={h * 0.44}
          width={w}
          height={h * 0.56}
          fill="url(#grass-dots)"
        />
        <path
          d={`M${w + 90} ${h * 0.49}Q${w * 0.65} ${h * 0.6} ${w * 0.86} ${h * 0.78}Q${w * 1.04} ${h * 0.88} ${w * 0.7} ${h + 70}`}
          fill="none"
          stroke="#dae1b2"
          strokeWidth="94"
        />
        <path
          className="river"
          d={`M${w + 90} ${h * 0.49}Q${w * 0.65} ${h * 0.6} ${w * 0.86} ${h * 0.78}Q${w * 1.04} ${h * 0.88} ${w * 0.7} ${h + 70}`}
          fill="none"
          stroke="#8bbcb4"
          strokeWidth="73"
        />
        <path
          d={`M-70 ${h * 0.83}Q${w * 0.19} ${h * 0.64} ${w * 0.44} ${h * 0.7}Q${w * 0.6} ${h * 0.74} ${w * 0.88} ${h * 0.68}`}
          fill="none"
          stroke="#c8b483"
          strokeWidth="65"
        />
        <path
          d={`M-70 ${h * 0.83}Q${w * 0.19} ${h * 0.64} ${w * 0.44} ${h * 0.7}Q${w * 0.6} ${h * 0.74} ${w * 0.88} ${h * 0.68}`}
          fill="none"
          stroke="#e7d4a5"
          strokeWidth="55"
        />
        <path
          d={`M${home.x} ${home.y + 65}Q${home.x - 12} ${home.y + 140} ${w * 0.31} ${h * 0.7}M${shop.x + 50} ${shop.y + 60}Q${shop.x + 70} ${shop.y + 150} ${w * 0.73} ${h * 0.7}`}
          fill="none"
          stroke="#e7d4a5"
          strokeWidth="42"
        />
        <g transform={`translate(${w * 0.82} ${h * 0.685}) rotate(-12)`}>
          <rect
            x="-53"
            y="-37"
            width="115"
            height="73"
            rx="3"
            fill="#a77f58"
            stroke="#856b4b"
            strokeWidth="3"
          />
          {[-40, -20, 0, 20, 40].map((x) => (
            <path key={x} d={`M${x}-36v71`} stroke="#d2ae7b" strokeWidth="5" />
          ))}
          <path
            d="M-58-42H68M-58 40H68"
            stroke="#846f4c"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </g>
        {[
          { x: 55, y: h * 0.5, s: 1.3 },
          { x: w * 0.53, y: h * 0.43, s: 1.15 },
          { x: w * 0.97, y: h * 0.48, s: 1.4 },
          { x: 90, y: h * 0.91, s: 1.2 },
          { x: w * 0.65, y: h * 0.89, s: 1.2 },
          { x: w * 0.48, y: h * 0.94, s: 0.8 },
          { x: w * 0.94, y: h * 0.98, s: 1.3 },
        ].map((t, i) => (
          <Tree key={i} x={t.x} y={t.y} scale={t.s} blossom={i === 4} />
        ))}
        <Cottage x={home.x} y={home.y} />
        <Shop x={shop.x} y={shop.y} />
        <g transform={`translate(${w * 0.49} ${h * 0.58})`}>
          <ellipse cy="15" rx="35" ry="12" fill="#71925d" opacity=".25" />
          <ellipse
            cy="0"
            rx="29"
            ry="16"
            fill="#afb3a0"
            stroke="#7e8c7c"
            strokeWidth="3"
          />
          <path
            d="M-28-11v12q28 23 56 0v-12"
            fill="#c9c8b3"
            stroke="#8e9b87"
            strokeWidth="3"
          />
          <ellipse
            cy="-11"
            rx="28"
            ry="12"
            fill="#8fbbb0"
            stroke="#8e9b87"
            strokeWidth="3"
          />
          <path
            d="M0-14v-30"
            stroke="#abb4a2"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M0-42q-16-6-16 7m16-7q16-6 16 7"
            stroke="#c4e0ca"
            fill="none"
            strokeWidth="3"
          />
        </g>
        <g
          transform={`translate(${home.x - 110} ${home.y + 113})`}
          stroke="#a18c60"
          strokeWidth="5"
        >
          <path d="M-36-11H36m-72 17H36m-62-30v50m22-50v50m22-50v50m22-50v50" />
        </g>
        {Array.from({ length: 24 }, (_, i) => {
          const x = (i * 173 + 37) % w,
            y = h * 0.76 + ((i * 83) % (h * 0.24));
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M0 0v-7" stroke="#6a9157" strokeWidth="2" />
              <circle
                cy="-9"
                r="3"
                fill={i % 3 === 0 ? "#efd091" : "#f7e9c6"}
              />
            </g>
          );
        })}
        <g
          className="birds"
          stroke="#718e7b"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path
            d={`M${w * 0.43} ${h * 0.16}q7-7 14 0q7-7 14 0m12 17q5-5 10 0q5-5 10 0`}
          />
        </g>
      </svg>
      {!title && (
        <>
          <button
            ref={homeRef}
            className="place-hotspot home-hotspot"
            style={{
              left: `${(home.x / w) * 100}%`,
              top: `${((home.y - 35) / h) * 100}%`,
            }}
            onClick={onHome}
            aria-label="Go home and divide your money"
          >
            <span className="quest-marker">!</span>
            <span className="building-hitbox" />
            <span className="place-label">
              <Home size={15} />
              Your home
              <ArrowRight size={14} />
            </span>
          </button>
          <button
            className="place-hotspot shop-hotspot"
            style={{
              left: `${(shop.x / w) * 100}%`,
              top: `${((shop.y + 80) / h) * 100}%`,
            }}
            onClick={onShop}
          >
            <span className="place-label">Kirana shop</span>
          </button>
          <button
            className="granny-hotspot"
            style={{ left: "58%", top: "60%" }}
            onClick={onGranny}
            aria-label="Talk to Ammamma"
          >
            <Character granny />
            <span>
              <MessageCircle size={14} />
              Ammamma
            </span>
          </button>
          <div
            className="player-character"
            style={{ left: `${avatar.x}%`, top: `${avatar.y}%` }}
          >
            <span className="player-arrow">▼</span>
            <Character />
            <span className="player-tag">YOU</span>
          </div>
          <div className="butterfly butterfly-one" aria-hidden="true">
            <i />
            <b />
          </div>
          <div className="butterfly butterfly-two" aria-hidden="true">
            <i />
            <b />
          </div>
        </>
      )}
    </div>
  );
}

export function TitleScreen({ onPlay, onHelp, continuing }) {
  return (
    <div className="title-screen">
      <div className="title-vignette" />
      <div className="title-content">
        <div className="title-kicker">
          <span /> A LITTLE LIFE. A BIG DREAM. <span />
        </div>
        <div className="title-sprout">
          <Sprout size={43} />
        </div>
        <h1>
          lakshyam<span>.</span>
        </h1>
        <p className="title-tagline">Every little choice grows a story.</p>
        <div className="title-rule">✦</div>
        <p className="title-description">
          A cosy village. Four little jars.
          <br />
          And a world of possibilities waiting for you.
        </p>
        <button
          className="play-button"
          aria-label={continuing ? "Continue" : "Play"}
          onClick={onPlay}
        >
          <Play size={23} fill="currentColor" />
          {continuing ? "Continue" : "Play"}
          <span>
            <ArrowRight size={20} />
          </span>
        </button>
        <button className="title-help" onClick={onHelp}>
          First time here? How to play
        </button>
      </div>
      <span className="title-bottom">
        <Sun size={14} /> Made of little moments & big dreams
      </span>
      <span className="title-version">CHAPTER ONE</span>
    </div>
  );
}
