import React from "react";
import { select } from "../../gameAdapter.js";
import { usePhoneText } from "../strings.js";
import { AppTitle } from "./shared.jsx";

export function MessagesApp({ life, onNotification }) {
  const { s, plain } = usePhoneText();
  const { notifications } = select.phone(life);
  return (
    <div className="ph-app ph-messages">
      <AppTitle>{s("inbox")}</AppTitle>
      {notifications.length === 0 ? (
        <p className="ph-muted ph-empty">{s("noMessages")}</p>
      ) : (
        <ul className="ph-list">
          {notifications.map((n) => {
            const title = n.title ? plain(n.title) : s(`kind_${n.kind}`);
            return (
              <li key={n.key}>
                <button type="button" className={`ph-msg ph-msg-${n.kind}`} onClick={() => onNotification(n.key)} aria-label={s("openMsg", { title })}>
                  <span className="ph-msg-dot" aria-hidden="true" />
                  <span className="ph-msg-text">
                    <span className="ph-msg-kind">{s(`kind_${n.kind}`)}</span>
                    <span className="ph-msg-title">{title}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
