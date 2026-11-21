import React, { useEffect, useRef, useState } from "react";
import { extractText, textContent } from "../core/text.js";
import { verifyDocument } from "../core/workspace.js";
import Info from "./Info.jsx";
export default function TextView({
  scan,
  model,
  onChange,
  onCopy,
  onDownload,
  onNotice,
}) {
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const run = useRef(0),
    latest = useRef();
  latest.current = { model, onChange, scan };
  async function extract(scope = model.scope) {
    const id = ++run.current;
    setLoading(true);
    setError("");
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: scan.tabId, documentIds: [scan.documentId] },
        func: extractText,
        args: [{ scope }],
      });
      if (id !== run.current) return;
      if (!(await verifyDocument(chrome, scan))) throw Error();
      if (id !== run.current) return;
      const value = result.find(
        (r) => r.documentId === scan.documentId,
      )?.result;
      if (!value) throw Error();
      latest.current.onChange({
        ...latest.current.model,
        scope,
        result: { ...value, documentId: scan.documentId },
      });
    } catch {
      if (id === run.current)
        setError(
          "The page changed or access was lost. Scan again from the toolbar.",
        );
    } finally {
      if (id === run.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (
      model.result?.documentId !== scan.documentId ||
      model.result?.scope !== model.scope
    )
      extract(model.scope);
    return () => {
      run.current++;
    };
  }, [scan.documentId, model.scope]);
  async function copy(value, label) {
    if (!(await verifyDocument(chrome, scan))) {
      onNotice("The page changed. Scan again before copying.");
      return;
    }
    onCopy(value, label, scan);
  }
  async function save() {
    if (!(await verifyDocument(chrome, scan))) {
      onNotice("The page changed. Scan again before saving.");
      return;
    }
    onDownload(
      new Blob([textContent(model.result)], {
        type: "text/plain;charset=utf-8",
      }),
      `getter-${scan.host || "page"}-text.txt`,
    );
  }
  const result = model.result,
    blocks = result?.blocks || [],
    query = model.query.toLowerCase(),
    matches = blocks.filter((b) => b.text.toLowerCase().includes(query));
  function mark(text) {
    if (!query) return text;
    const parts = [];
    let from = 0,
      index;
    while ((index = text.toLowerCase().indexOf(query, from)) !== -1) {
      parts.push(
        text.slice(from, index),
        <mark key={index}>{text.slice(index, index + query.length)}</mark>,
      );
      from = index + query.length;
    }
    parts.push(text.slice(from));
    return parts;
  }
  return (
    <section className="text-view">
      <div className="heading">
        <div className="title-with-info">
          <h1>Page text</h1>
          <Info label="About extracted text">
            Visible text in document reading order. Visual ordering set by CSS
            may differ.
          </Info>
        </div>
        <span>
          {textContent(result).trim().split(/\s+/).filter(Boolean).length} words
          · {blocks.length} blocks
        </span>
      </div>
      <div className="text-source-row">
        <div className="segments" role="group" aria-label="Text source">
          {[
            ["page", "Page"],
            ["main", "Main content"],
            ["selection", "Selection"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={model.scope === id}
              onClick={() => {
                if (model.scope !== id)
                  onChange({ ...model, scope: id, query: "", result: null });
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-export">
          <button
            className="secondary"
            disabled={loading || !blocks.length || !!error}
            onClick={save}
          >
            ↓ Save .txt
          </button>
          <button
            className="primary"
            disabled={loading || !blocks.length || !!error}
            onClick={() => copy(textContent(result), "text")}
          >
            <span aria-hidden="true">▣ </span>
            {result?.limited || result?.omitted
              ? "Copy available text"
              : "Copy text"}
          </button>
        </div>
      </div>
      {result?.fallback && (
        <p className="scan-note">
          Main content was not identified; showing page text.
        </p>
      )}
      {(result?.limited || result?.omitted > 0) && (
        <p className="scan-note">
          Partial results.
          {result.limited ? " The page exceeds the text extraction limit." : ""}
          {result.omitted
            ? ` ${result.omitted} embedded frame(s) could not be read.`
            : ""}
        </p>
      )}
      <label className="search-field">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          aria-label="Find in extracted text"
          placeholder="Find in text"
          value={model.query}
          onChange={(e) => onChange({ ...model, query: e.target.value })}
        />
        {query && (
          <small>
            {matches.length} {matches.length === 1 ? "block" : "blocks"}
          </small>
        )}
      </label>
      {loading ? (
        <div className="state" role="status">
          Reading visible text…
        </div>
      ) : error ? (
        <div className="state" role="status">
          {error}
        </div>
      ) : !blocks.length ? (
        <div className="state">
          <h2>
            {model.scope === "selection"
              ? "No text selected"
              : "No readable text found"}
          </h2>
          <p>
            {model.scope === "selection"
              ? "Highlight text on the webpage, then extract the selection. In the popup, select text before opening Getter."
              : "Try again after the page loads, or choose another text source."}
          </p>
          <button className="secondary" onClick={() => extract()}>
            {model.scope === "selection" ? "Extract selection" : "Try again"}
          </button>
        </div>
      ) : (
        <div className="text-results">
          {matches.length ? (
            matches.map((block, i) => (
              <article key={i} className="text-block">
                <div className="block-kind">{block.kind}</div>
                <p
                  className={
                    block.kind.startsWith("Heading") ? "block-heading" : ""
                  }
                >
                  {mark(block.text)}
                </p>
                <button
                  className="copy-block"
                  aria-label={`Copy ${block.kind.toLowerCase()}`}
                  onClick={() => copy(block.text, "text block")}
                >
                  ▣
                </button>
              </article>
            ))
          ) : (
            <div className="state">No matching text.</div>
          )}
        </div>
      )}
      {model.scope === "selection" && blocks.length > 0 && (
        <button
          className="text-button selection-refresh"
          onClick={() => extract()}
        >
          Extract selection again
        </button>
      )}
    </section>
  );
}
