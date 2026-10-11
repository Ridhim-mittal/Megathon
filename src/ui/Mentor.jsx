import React from "react";
import { PixelPortrait as Portrait } from "./PixelPortrait.jsx";

// Ammamma's little wisdom: a quiet bubble, never a modal. `look` gives her a knowing glance
// (used for echoes).
export function Mentor({ name, children, look = false, compact = false }) {
  return (
    <div className={`mentor ${look ? "mentor-look" : ""} ${compact ? "mentor-compact" : ""}`}>
      <Portrait role="mentor" className="mentor-portrait" mood={look ? "look" : ""} />
      <div>
        {name && <span>{name}</span>}
        <p>{children}</p>
      </div>
    </div>
  );
}
