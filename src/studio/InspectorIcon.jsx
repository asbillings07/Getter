import React from "react";

export default function InspectorIcon({ name }) {
  const shapes = {
    site: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </>
    ),
    back: <path d="m11 6-6 6 6 6m-6-6h14" />,
    add: <path d="M12 5v14M5 12h14" />,
    layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />,
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m3 17 5-4 3 2 5-5 5 5" />
      </>
    ),
    text: <path d="M5 7V5h14v2m-7-2v14m-3 0h6" />,
    control: <rect x="3" y="6" width="18" height="12" rx="3" />,
  };
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shapes[name]}
    </svg>
  );
}
