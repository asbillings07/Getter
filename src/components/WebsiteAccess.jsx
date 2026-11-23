import React, { useEffect, useRef, useState } from "react";
import { websiteOrigins } from "../core/access.js";
import Info from "./Info.jsx";

export default function WebsiteAccess({ api }) {
  const [enabled, setEnabled] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const live = useRef(false),
    revision = useRef(0);
  async function refresh() {
    const read = ++revision.current;
    const allowed = await api.permissions.contains({ origins: websiteOrigins });
    if (live.current && read === revision.current) setEnabled(allowed);
    return read === revision.current ? allowed : null;
  }
  useEffect(() => {
    live.current = true;
    const changed = () => {
      setMessage("");
      refresh().catch(() => {
        if (live.current) {
          setEnabled(null);
          setMessage(
            "Website access is unavailable. Reopen Settings to retry.",
          );
        }
      });
    };
    api.permissions.onAdded.addListener(changed);
    api.permissions.onRemoved.addListener(changed);
    changed();
    return () => {
      live.current = false;
      ++revision.current;
      api.permissions.onAdded.removeListener(changed);
      api.permissions.onRemoved.removeListener(changed);
    };
  }, [api]);

  async function change(event) {
    if (busy || enabled === null) return;
    const allow = event.target.checked;
    setBusy(true);
    setMessage("");
    try {
      // Invoke directly in the click handler, before awaiting anything, so
      // Chrome can show its own permission dialog using the user's gesture.
      await (allow
        ? api.permissions.request({ origins: websiteOrigins })
        : api.permissions.remove({ origins: websiteOrigins }));
      const actual = await refresh();
      if (live.current && actual !== null)
        setMessage(
          allow
            ? actual
              ? ""
              : "Access wasn’t allowed. This setting is still off."
            : actual
              ? "Chrome could not remove access. Try again."
              : "All-website access removed. Per-site requests are available.",
        );
    } catch {
      if (live.current)
        setMessage("Chrome could not change website access. Try again.");
      await refresh().catch(() => {
        if (live.current) setEnabled(null);
      });
    } finally {
      if (live.current) setBusy(false);
    }
  }
  return (
    <section className="website-access" aria-labelledby="website-access-title">
      <h2 id="website-access-title">Website access</h2>
      <div className="setting">
        <span className="website-access-label">
          <label htmlFor="allow-all-websites">Allow on all websites</label>
          <Info label="About website access">
            Chrome asks for access to regular websites. Getter can then scan
            them without asking for each site. Turn this off to remove the
            all-website grant and return to per-site requests. You can also
            change access in Chrome’s extension settings. Browser settings and
            the Web Store remain protected.
          </Info>
        </span>
        <input
          id="allow-all-websites"
          type="checkbox"
          role="switch"
          checked={enabled === true}
          disabled={enabled === null || busy}
          onChange={change}
        />
      </div>
      {(message || busy) && (
        <p className="small" role="status">
          {busy ? "Waiting for Chrome…" : message}
        </p>
      )}
    </section>
  );
}
