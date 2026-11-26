import React, { useEffect, useRef, useState } from "react";
import {
  figmaReference,
  sampleFrame,
  sampleScreenshot,
  screenshotReference,
} from "./reviews.js";

export function Screenshot({ reference }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!reference.blob) return;
    const next = URL.createObjectURL(reference.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [reference.blob]);
  if (!reference.blob) return <SampleProduct />;
  return url ? <img src={url} alt="Uploaded approved reference" /> : null;
}

function SampleProduct() {
  return (
    <div className="review-sample-card">
      <small>JUNIPER</small>
      <strong>Everyday essentials</strong>
      <span>Shop now</span>
    </div>
  );
}

export function ReferencePreview({ reference }) {
  if (!reference) return null;
  return (
    <div className="review-reference">
      {reference.kind === "figma" ? (
        <>
          <strong>Waiting for Figma access</strong>
          <a href={reference.link} target="_blank" rel="noopener noreferrer">
            Open saved Figma frame link
          </a>
          <small>
            This QA build can compare against a sample Figma frame or an
            uploaded screenshot.
          </small>
        </>
      ) : (
        <>
          <small>{reference.name}</small>
          {reference.kind === "sample-figma" ? (
            <SampleProduct />
          ) : (
            <>
              <Screenshot reference={reference} />
              <small>
                {reference.width} × {reference.height} px
              </small>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function ReferenceFields({ onChange, onBusy }) {
  const [kind, setKind] = useState("figma");
  const [link, setLink] = useState("");
  const [reference, setReference] = useState(null);
  const [error, setError] = useState("");
  const upload = useRef(0);
  useEffect(
    () => () => {
      upload.current++;
    },
    [],
  );

  function pick(next) {
    upload.current++;
    onBusy(false);
    setReference(next);
    setError("");
    onChange(next);
  }

  async function screenshot(file) {
    pick(null);
    if (!file) return;
    const reading = ++upload.current;
    onBusy(true);
    try {
      const next = await screenshotReference(file);
      if (reading === upload.current) pick(next);
    } catch (failure) {
      if (reading === upload.current) setError(failure.message);
    } finally {
      if (reading === upload.current) onBusy(false);
    }
  }

  return (
    <section className="studio-card review-fields">
      <h2>Approved reference</h2>
      <label>
        Reference type
        <select
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setLink("");
            pick(null);
          }}
        >
          <option value="figma">Link a Figma frame</option>
          <option value="screenshot">Upload a screenshot</option>
        </select>
      </label>
      {kind === "figma" ? (
        <>
          <label>
            Figma frame link
            <input
              type="url"
              maxLength={400}
              value={link}
              placeholder="https://www.figma.com/design/…?node-id=…"
              onChange={(event) => {
                const value = event.target.value;
                setLink(value);
                pick(null);
                if (!value.trim()) return;
                try {
                  pick(figmaReference(value));
                } catch (failure) {
                  setError(failure.message);
                }
              }}
            />
          </label>
          <small>In Figma, select the approved frame and copy its link.</small>
          <div className="studio-row">
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setLink("");
                pick(sampleFrame);
              }}
            >
              Use sample Figma frame
            </button>
          </div>
        </>
      ) : (
        <>
          <label>
            Screenshot
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => screenshot(event.target.files[0])}
            />
          </label>
          <small>
            PNG, JPG, or WebP up to 10 MB. Use the same viewport as the page
            under review.
          </small>
          <div className="studio-row">
            <button
              className="secondary"
              type="button"
              onClick={() => pick(sampleScreenshot)}
            >
              Use sample screenshot
            </button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <ReferencePreview reference={reference} />
    </section>
  );
}
