import { StrictMode, useRef, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  Shell,
  Badge,
  Stat,
  FeedStatus,
  useFeed,
  request,
  stations,
  stationName,
  type Reading,
} from "@rpjweez/fieldsignal-ui";
import "@rpjweez/fieldsignal-ui/styles.css";

function App() {
  const feed = useFeed<Reading>("/api/readings");
  const [station, setStation] = useState(stations[0].id);
  const [level, setLevel] = useState("4.8");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const pending = useRef<{ body: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    // Retain the same ID/body after an ambiguous network failure for safe retries.
    const body =
      pending.current?.body ??
      JSON.stringify({
        readingId: crypto.randomUUID(),
        stationId: station,
        levelMeters: Number(level),
        observedAt: new Date().toISOString(),
      });
    pending.current = { body };
    try {
      await request("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      pending.current = null;
      setResult({
        ok: true,
        text: "Reading accepted. Elevated readings will appear in incident operations shortly.",
      });
    } catch (e) {
      setResult({
        ok: false,
        text: e instanceof Error ? e.message : "Submission failed",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell area="stations">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SENSING / FIELD TELEMETRY</div>
          <h1>Your network, in focus.</h1>
          <p className="subtitle">
            Submit synthetic river readings and follow observations as they
            enter the field network.
          </p>
        </div>
        <div className="heading-icon">≋</div>
      </div>
      <div className="stats">
        <Stat
          label="Demo stations"
          value="03"
          detail="Three synthetic catchments"
        />
        <Stat
          label="Recent readings"
          value={feed.updated ? feed.data.length : "—"}
          detail="Latest 100 observations"
        />
        <Stat
          label="Watch threshold"
          value="3.0 m"
          detail="Demo rule · critical at 4.5 m"
        />
      </div>
      <FeedStatus error={feed.error} updated={feed.updated} />
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Send an observation</h2>
            <p>A single reading starts the sensing-to-response workflow.</p>
          </div>
          <Badge>SYNTHETIC INPUT</Badge>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label>
              Monitoring station
              <select
                value={station}
                onChange={(e) => {
                  setStation(e.target.value);
                  pending.current = null;
                }}
                disabled={busy}
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              River level (meters)
              <input
                type="number"
                min="0"
                max="30"
                step="0.001"
                required
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value);
                  pending.current = null;
                }}
                disabled={busy}
              />
            </label>
            <button disabled={busy}>
              {busy ? "Sending…" : "Submit reading ↗"}
            </button>
          </form>
          <div className="threshold-note">
            <span>
              <b>Normal</b> &lt; 3.0 m
            </span>
            <span>
              <b>Watch</b> ≥ 3.0 m
            </span>
            <span>
              <b>Critical</b> ≥ 4.5 m
            </span>
          </div>
          {result && (
            <div
              role="status"
              className={`notice ${result.ok ? "success" : "error"}`}
            >
              {result.text}
            </div>
          )}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Observation feed</h2>
            <p>The latest observations received from the field network.</p>
          </div>
          <span className="table-count">LATEST {feed.data.length}</span>
        </div>
        {feed.data.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Station</th>
                  <th>River level</th>
                  <th>Observed</th>
                  <th>Reading ID</th>
                </tr>
              </thead>
              <tbody>
                {feed.data.map((r) => (
                  <tr key={r.eventId}>
                    <td>
                      <strong>{stationName(r.stationId)}</strong>
                      <small>{r.stationId}</small>
                    </td>
                    <td className="mono">
                      {Number(r.levelMeters).toFixed(3)} m
                    </td>
                    <td>{new Date(r.observedAt).toLocaleString()}</td>
                    <td className="mono">{r.eventId.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <strong>No observations received yet.</strong>Submit a reading above
            to start the workflow.
          </div>
        )}
      </section>
    </Shell>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
