import React, { useEffect, useId, useRef, useState } from "react";
export default function Info({ label, children }) {
  const id = useId(),
    ref = useRef(),
    [open, setOpen] = useState(false),
    [pinned, setPinned] = useState(false),
    [position, setPosition] = useState({});
  function show() {
    const r = ref.current.getBoundingClientRect();
    setPosition({
      top: r.bottom + 8,
      left: Math.max(12, Math.min(r.left, window.innerWidth - 272)),
    });
    setOpen(true);
  }
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!ref.current?.parentElement.contains(e.target)) {
        setPinned(false);
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <span
      className="info-wrap"
      onMouseEnter={show}
      onMouseLeave={() => {
        if (!pinned && document.activeElement !== ref.current) setOpen(false);
      }}
    >
      <button
        ref={ref}
        className="info-button"
        aria-label={label}
        aria-describedby={id}
        onFocus={show}
        onBlur={() => {
          if (!pinned) setOpen(false);
        }}
        onClick={() => {
          if (pinned) {
            setPinned(false);
            setOpen(false);
          } else {
            setPinned(true);
            show();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            setPinned(false);
            setOpen(false);
          }
        }}
      >
        ⓘ
      </button>
      <span
        id={id}
        role="tooltip"
        className="info-tooltip"
        style={position}
        hidden={!open}
      >
        {children}
      </span>
    </span>
  );
}
