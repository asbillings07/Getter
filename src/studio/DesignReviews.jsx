import React, { useEffect, useState } from "react";
import { ReferenceFields, ReferencePreview } from "./ReviewReference.jsx";
import { launchInspectPro } from "./inspect-workspace.js";
import {
  createReview,
  getReview,
  listReviews,
  replaceReviewReference,
  reviewSiteMatches,
} from "./reviews.js";
import { openWebsites, websiteAddress } from "./sources.js";

function ReviewSetup({ projects, projectId, review, onDone, onCancel }) {
  const [siteMode, setSiteMode] = useState("tab");
  const [sites, setSites] = useState(null);
  const [reference, setReference] = useState(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (review) return;
    let live = true;
    openWebsites(chrome).then(
      (options) => {
        if (live) setSites(options);
      },
      () => {
        if (live) {
          setSites([]);
          setError("Open tabs couldn’t be listed. Enter a website address.");
        }
      },
    );
    return () => {
      live = false;
    };
  }, [review]);

  async function submit(event) {
    event.preventDefault();
    if (!reference || saving || reading) return;
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      if (review) {
        onDone(await replaceReviewReference(review, reference));
        return;
      }
      const ticket = fields.get("ticket").trim();
      if (!ticket) throw Error("Enter the review ticket.");
      let address;
      let tabId;
      if (siteMode === "tab") {
        const source = sites?.find(
          ({ id }) => String(id) === fields.get("tab"),
        );
        if (!source) throw Error("Choose an open tab.");
        const frame = await chrome.webNavigation.getFrame({
          tabId: source.id,
          frameId: 0,
        });
        if (!frame?.url || source.documentId !== frame.documentId)
          throw Error(
            "The selected tab changed. Choose its current page or enter its address.",
          );
        address = websiteAddress(frame.url).href;
        tabId = source.id;
      } else {
        try {
          address = websiteAddress(fields.get("address").trim()).href;
        } catch {
          throw Error("Enter a regular HTTP or HTTPS website address.");
        }
      }
      onDone(
        await createReview({
          ticket,
          address,
          tabId,
          projectId: fields.get("project") || null,
          viewport: fields.get("viewport"),
          reference,
        }),
      );
    } catch (failure) {
      setError(failure.message || "Getter couldn’t save this review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="review-workspace review-setup" onSubmit={submit}>
      <div className="studio-heading">
        <div>
          <small className="workspace-kicker">Design Review</small>
          <h1>{review ? "Replace approved reference" : "New design review"}</h1>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={onCancel}
          disabled={saving}
        >
          {review ? "Back to review" : "Back to reviews"}
        </button>
      </div>
      {!review && (
        <div className="workspace-project-launch">
          <section className="studio-card review-fields">
            <h2>Website to review</h2>
            <label>
              How to open the page
              <select
                value={siteMode}
                onChange={(event) => setSiteMode(event.target.value)}
              >
                <option value="tab">Pick an open tab</option>
                <option value="address">Enter a website address</option>
              </select>
            </label>
            {siteMode === "tab" ? (
              <label>
                Open tabs
                <select name="tab" required defaultValue="" disabled={!sites}>
                  <option value="">
                    {sites ? "Choose an open tab" : "Loading open tabs…"}
                  </option>
                  {sites?.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Website address
                <input
                  name="address"
                  type="url"
                  placeholder="https://…"
                  required
                />
              </label>
            )}
          </section>
          <section className="studio-card review-fields">
            <h2>Review details</h2>
            <label>
              Ticket
              <input
                name="ticket"
                maxLength={45}
                placeholder="WEB-214"
                required
              />
            </label>
            <label>
              Viewport
              <select name="viewport">
                <option>Desktop · 1440 × 900</option>
                <option>Mobile · 390 × 844</option>
              </select>
            </label>
            <label>
              Project · Optional
              <select name="project" defaultValue={projectId || ""}>
                <option value="">Standalone review</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>
      )}
      <ReferenceFields onChange={setReference} onBusy={setReading} />
      {review && (
        <small>
          Replacing the reference clears the saved match or marked area.
        </small>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="studio-row review-end">
        <button className="primary" disabled={reading || saving || !reference}>
          {reading
            ? "Preparing screenshot…"
            : saving
              ? "Saving…"
              : review
                ? "Replace reference"
                : "Start review →"}
        </button>
      </div>
    </form>
  );
}

function ReviewDetails({ review, onBack, onReplace, projects, onProject }) {
  const [environment, setEnvironment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const project = projects.find(({ id }) => id === review.projectId);

  useEffect(() => {
    let live = true;
    Promise.all([
      chrome.windows.getCurrent(),
      chrome.tabs.getCurrent(),
      review.tabId &&
        chrome.webNavigation
          .getFrame({ tabId: review.tabId, frameId: 0 })
          .catch(() => null),
    ]).then(
      ([window, studioTab, frame]) => {
        if (live)
          setEnvironment({
            windowId: window.id,
            studioTabId: studioTab?.id,
            source:
              frame && reviewSiteMatches(review.address, frame.url)
                ? { id: review.tabId, documentId: frame.documentId }
                : null,
          });
      },
      () => {
        if (live) setError("Getter couldn’t identify this Chrome window.");
      },
    );
    return () => {
      live = false;
    };
  }, [review.address, review.tabId]);

  async function inspect() {
    if (busy || !environment) return;
    setBusy(true);
    setError("");
    try {
      await launchInspectPro(chrome, {
        windowId: environment.windowId,
        address: environment.source ? undefined : review.address,
        source: environment.source,
        review: {
          id: review.id,
          address: review.address,
          studioTabId: environment.studioTabId,
        },
      });
    } catch (failure) {
      setEnvironment((value) => ({ ...value, source: null }));
      setError(failure.message || "Getter couldn’t open Inspect Pro.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="review-workspace">
      <div className="studio-heading">
        <div>
          <small className="workspace-kicker">Design Review</small>
          <h1>{review.ticket}</h1>
          <p>
            {project?.name || "Standalone review"} · {review.viewport}
          </p>
        </div>
        <div className="studio-row">
          {project && (
            <button className="secondary" onClick={() => onProject(project)}>
              Open project
            </button>
          )}
          <button className="secondary" onClick={onBack}>
            Back to reviews
          </button>
        </div>
      </div>
      <section className="studio-card review-fields">
        <h2>Reference and staging</h2>
        <div className="workspace-project-launch">
          <section className="review-fields">
            <h3>Approved reference</h3>
            <ReferencePreview reference={review.reference} />
            <div className="studio-row">
              <button className="secondary" onClick={onReplace}>
                Replace reference
              </button>
            </div>
          </section>
          <section className="review-fields">
            <h3>Website to review</h3>
            <code>{review.address}</code>
            <div className="studio-row">
              <button
                className="primary"
                onClick={inspect}
                disabled={busy || !environment}
              >
                Open Inspect Pro
              </button>
            </div>
          </section>
        </div>
        {error && <p role="alert">{error}</p>}
      </section>
      {review.match && (
        <section className="studio-card review-fields">
          <h2>Saved comparison</h2>
          <p>
            {review.match.layerName} · <code>{review.match.selector}</code>
          </p>
          <p>
            {
              review.match.rows.filter(({ status }) => status === "Different")
                .length
            }{" "}
            differences
          </p>
        </section>
      )}
      {review.area && (
        <section className="studio-card review-fields">
          <h2>Saved visual comparison</h2>
          <p>{review.visualNote || "Marked area saved."}</p>
        </section>
      )}
    </div>
  );
}

export default function DesignReviews({
  projects,
  projectId,
  initialReviewId,
  setup,
  onProject,
}) {
  const [view, setView] = useState(
    setup ? "new" : initialReviewId ? "loading" : "list",
  );
  const [records, setRecords] = useState(null);
  const [review, setReview] = useState(null);
  const scope = projectId || (initialReviewId && review?.projectId);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    if (view !== "list") return;
    listReviews().then(
      (list) => {
        if (live) setRecords(list);
      },
      () => {
        if (live) setError("Getter couldn’t read saved reviews.");
      },
    );
    return () => {
      live = false;
    };
  }, [view]);

  useEffect(() => {
    if (!initialReviewId) return;
    let live = true;
    getReview(initialReviewId).then(
      (saved) => {
        if (!live) return;
        if (saved) open(saved);
        else {
          setError("This review is unavailable on this device.");
          setView("list");
        }
      },
      () => {
        if (!live) return;
        setError("Getter couldn’t read this review.");
        setView("list");
      },
    );
    return () => {
      live = false;
    };
  }, [initialReviewId]);

  function open(saved) {
    setError("");
    setReview(saved);
    setView("details");
  }

  function back() {
    setRecords(null);
    setView("list");
  }

  if (view === "loading") return <p role="status">Opening review…</p>;
  if (view === "new" || view === "replace")
    return (
      <ReviewSetup
        projects={projects}
        projectId={scope}
        review={view === "replace" ? review : null}
        onDone={open}
        onCancel={view === "replace" ? () => setView("details") : back}
      />
    );
  if (view === "details")
    return (
      <ReviewDetails
        review={review}
        projects={projects}
        onProject={onProject}
        onBack={back}
        onReplace={() => setView("replace")}
      />
    );

  const visible = records?.filter(
    (record) => !scope || record.projectId === scope,
  );
  return (
    <div className="review-workspace">
      <div className="studio-heading">
        <div>
          <h1>{scope ? "Project reviews" : "Design Review"}</h1>
          <p>Compare a website with an approved design.</p>
        </div>
        <button className="primary" onClick={() => setView("new")}>
          ＋ New design review
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {visible?.length ? (
        <section className="workspace-project-list" aria-label="Saved reviews">
          {visible.map((record) => (
            <article
              key={record.id}
              className="studio-card workspace-project-row"
            >
              <div>
                <h3>
                  {record.ticket} · {record.reference.name}
                </h3>
                <small>
                  {new URL(record.address).hostname} ·{" "}
                  {projects.find(({ id }) => id === record.projectId)?.name ||
                    "Standalone review"}
                </small>
              </div>
              <button className="secondary" onClick={() => open(record)}>
                Open review →
              </button>
            </article>
          ))}
        </section>
      ) : (
        visible && (
          <section className="studio-card review-fields">
            <h2>Review a page</h2>
            <p>
              Pick an open tab or enter a website address. Add the ticket and
              approved reference, then open the comparison.
            </p>
          </section>
        )
      )}
    </div>
  );
}
