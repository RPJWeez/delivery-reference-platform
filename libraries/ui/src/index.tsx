import { useEffect, useState, type ReactNode } from "react";

export interface Reading {
  eventId: string;
  stationId: string;
  levelMeters: number;
  observedAt: string;
}

export interface Incident {
  readingId: string;
  stationId: string;
  levelMeters: number;
  severity: "WATCH" | "CRITICAL";
  observedAt: string;
  status: "OPEN" | "ACKNOWLEDGED";
}

export const stations = [
  {
    id: "cedar-01",
    name: "Cedar Creek",
    location: "North catchment · Station 01",
  },
  {
    id: "willow-02",
    name: "Willow Crossing",
    location: "East catchment · Station 02",
  },
  {
    id: "stone-03",
    name: "Stonebridge",
    location: "South catchment · Station 03",
  },
];

export function stationName(id: string) {
  return stations.find((s) => s.id === id)?.name ?? id;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok)
    throw new Error(
      `Request failed (${response.status}). Check service connectivity and input.`,
    );
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}

export function useFeed<T>(path: string) {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      try {
        const next = await request<T[]>(path, { signal: controller.signal });
        if (active) {
          setData(next);
          setError(null);
          setUpdated(new Date());
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Service unavailable");
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [path]);
  return { data, error, updated };
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Shell({
  area,
  children,
}: {
  area: "stations" | "operations";
  children: ReactNode;
}) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="FieldSignal home">
          <span className="brand-mark">≋</span> FieldSignal
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">ENVIRONMENTAL OBSERVATORY</div>
        <div className="nav-section">WORKSPACE</div>
        <div className="nav-item active">
          <span>{area === "stations" ? "◎" : "◈"}</span>
          {area === "stations" ? "Station console" : "Incident operations"}
        </div>
        <div className="sidebar-context">
          <span className="status-dot" /> LOCAL DEVELOPMENT
        </div>
        <div className="sidebar-footer">
          <strong>Observe. Understand. Respond.</strong>
          <p>
            Synthetic river telemetry.
            <br />
            Demonstration thresholds only.
          </p>
          <Badge tone="outline">Reference platform / 0.1</Badge>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Field network <span className="breadcrumb">/</span>{" "}
            {area === "stations" ? "Sensing" : "Response"}
          </span>
          <Badge tone="neutral">SYNTHETIC DATA ONLY</Badge>
        </header>
        <main>{children}</main>
        <footer className="page-footer">
          FieldSignal · Delivery reference platform
          <span>Not a public warning system</span>
        </footer>
      </div>
    </div>
  );
}

export function FeedStatus({
  error,
  updated,
}: {
  error: string | null;
  updated: Date | null;
}) {
  return error ? (
    <div className="notice error" role="alert">
      {error}{" "}
      {updated
        ? "Displayed data may be stale."
        : "Waiting for the first successful connection."}
    </div>
  ) : (
    <div className="feed-status">
      <span className="status-dot" />
      {updated
        ? `Connected · refreshed ${updated.toLocaleTimeString()}`
        : "Connecting to service…"}
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <div className="stat">
      <div className="eyebrow">{label}</div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}
