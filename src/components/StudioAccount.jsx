import React, { useEffect, useRef, useState } from "react";

export function AccountIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="2.7" />
      <path d="M6 18.7a6.6 6.6 0 0 1 12 0" />
    </svg>
  );
}

export default function StudioAccount({ onBack, focusOffer }) {
  const [unavailableFrom, setUnavailableFrom] = useState(null);
  const title = useRef(null);
  const continueToSignIn = useRef(null);
  const feedback = useRef(null);
  useEffect(() => {
    (focusOffer ? continueToSignIn : title).current.focus();
  }, [focusOffer]);
  useEffect(() => {
    feedback.current?.scrollIntoView({ block: "nearest" });
  }, [unavailableFrom]);

  const unavailable =
    "Aptelum sign-in is unavailable in this QA build. You can keep using Getter Free.";

  return (
    <section className="studio-account" aria-labelledby="account-title">
      <div className="studio-account-heading">
        <button
          className="secondary studio-icon-button"
          onClick={onBack}
          aria-label="Back"
        >
          <span aria-hidden="true">←</span>
        </button>
        <h1 id="account-title" tabIndex={-1} ref={title}>
          Account &amp; plan
        </h1>
      </div>
      <div className="studio-account-card studio-account-profile">
        <div className="studio-account-identity">
          <AccountIcon />
          <div>
            <h2>Aptelum account</h2>
            <p>Signed out</p>
          </div>
        </div>
        <button
          className="secondary"
          onClick={() => setUnavailableFrom("account")}
        >
          Sign in or create an account
        </button>
        <p role="status" ref={unavailableFrom === "account" ? feedback : null}>
          {unavailableFrom === "account" && unavailable}
        </p>
      </div>
      <div className="studio-account-card studio-current-plan">
        <p className="studio-plan-label">Current access</p>
        <h2>Getter Free</h2>
        <p>Colors, Fonts, Images, Text, and Quick Inspect</p>
      </div>
      <div className="studio-account-card">
        <p className="studio-plan-label">Available upgrade</p>
        <div className="studio-plan-heading">
          <h2>Getter Studio</h2>
          <span>
            <strong>$4.99</strong> / month
          </span>
        </div>
        <ul>
          <li>Inspect Pro and component capture</li>
          <li>Design Review with Figma or screenshots</li>
          <li>Project collections, editor, and exports</li>
        </ul>
        <div className="studio-plan-actions">
          <button
            className="primary"
            ref={continueToSignIn}
            onClick={() => setUnavailableFrom("offer")}
          >
            Continue to sign-in
          </button>
          <button
            className="text-button"
            onClick={() => setUnavailableFrom("offer")}
          >
            Already subscribed? Sign in
          </button>
        </div>
        <p role="status" ref={unavailableFrom === "offer" ? feedback : null}>
          {unavailableFrom === "offer" && unavailable}
        </p>
      </div>
    </section>
  );
}
