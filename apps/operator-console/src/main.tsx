import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Shell, Badge, Stat, FeedStatus, useFeed, request, stationName, type Incident } from '@fieldsignal/ui';
import '@fieldsignal/ui/styles.css';

function App() {
  const feed = useFeed<Incident>('/api/incidents');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function acknowledge(id: string) {
    setBusy(id); setError(null);
    try { await request(`/api/incidents/${id}/acknowledge`, { method: 'POST' }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Acknowledgment failed'); }
    finally { setBusy(null); }
  }
  const open = feed.data.filter(i => i.status === 'OPEN');
  return <Shell area="operations">
    <div className="page-heading"><div><div className="eyebrow">RESPONSE / INCIDENT OPERATIONS</div><h1>Every signal. A clear response.</h1><p className="subtitle">Review elevated river observations, prioritize critical signals, and acknowledge incidents.</p></div><div className="heading-icon">◈</div></div>
    <div className="stats"><Stat label="Open incidents" value={feed.updated ? open.length : '—'} detail="Within the latest 100 incidents"/><Stat label="Critical / open" value={feed.updated ? open.filter(i => i.severity === 'CRITICAL').length : '—'} detail="River level at or above 4.5 m"/><Stat label="Acknowledged" value={feed.updated ? feed.data.length - open.length : '—'} detail="Reviewed by an operator"/></div>
    <div className="rule-banner"><span>⌁</span><div><strong>From observation to action</strong><p>Each elevated observation creates an incident. Review the river level and acknowledge signals you have assessed.</p></div></div>
    <FeedStatus error={feed.error} updated={feed.updated}/>
    {error && <div role="alert" className="notice error">{error}</div>}
    <section className="panel"><div className="panel-head"><div><h2>Incident register</h2><p>Latest elevated observations · refreshed every 3 seconds</p></div><span className="table-count">LATEST {feed.data.length}</span></div>
      {feed.data.length ? <div className="table-wrap"><table><thead><tr><th>Station</th><th>Severity</th><th>River level</th><th>Observed</th><th>Status</th><th>Action</th></tr></thead><tbody>{feed.data.map(i => <tr key={i.readingId}><td><strong>{stationName(i.stationId)}</strong><small>{i.readingId.slice(0, 8)}</small></td><td><Badge tone={i.severity.toLowerCase()}>{i.severity}</Badge></td><td className="mono">{Number(i.levelMeters).toFixed(3)} m</td><td>{new Date(i.observedAt).toLocaleString()}</td><td><Badge tone={i.status.toLowerCase()}>{i.status}</Badge></td><td>{i.status === 'OPEN' ? <button className="button-secondary" disabled={busy !== null} onClick={() => void acknowledge(i.readingId)}>{busy === i.readingId ? 'Saving…' : 'Acknowledge'}</button> : <span className="table-count">Reviewed ✓</span>}</td></tr>)}</tbody></table></div> : <div className="empty"><strong>No elevated readings yet.</strong>Submit a reading of 3.0 m or higher from the station console.</div>}
    </section>
  </Shell>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
