
import { useEffect, useState } from "react";

import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Clock,
  Database,
  Server,
  Wrench,
} from "lucide-react";

import { getRecoveryStatus } from "../services/recoveryService";
import "../App.css";
import { getStorageMetrics } from "../services/monitoringService";
function Recovery() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [nodeMetrics, setNodeMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState("");
  const loadData = async (manual = false) => {
  try {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError("");
    setMetricsError("");

    const [recoveryResult, metricsResult] = await Promise.allSettled([
      getRecoveryStatus(),
      getStorageMetrics(),
    ]);
    console.log("Storage Metrics:", metricsResult);
    if (recoveryResult.status === "fulfilled") {
      setData(recoveryResult.value);
    } else {
      throw recoveryResult.reason;
    }

    if (metricsResult.status === "fulfilled") {
      setNodeMetrics(metricsResult.value);
    } else {
      setMetricsError("Unable to load live storage metrics.");
    }

  } catch (err) {
    console.error("Recovery status error:", err);
    setError(
      err.response?.data?.message ||
      "Unable to load recovery information."
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="recovery-state">
        <RefreshCw className="spin" size={24} />
        <p>Loading recovery information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recovery-state">
        <AlertTriangle size={28} />
        <p>{error}</p>
        <button
          className="monitoring-refresh"
          onClick={() => loadData()}
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const events = data?.recentEvents || [];
  const latestCycle = data?.latestCycle;
const nodes = nodeMetrics?.nodes || [];

const onlineNodes = nodes.filter(
  (node) => Number(node.is_available) === 1
).length;

const totalNodes = nodes.length;

const systemHealthy =
  totalNodes > 0 && onlineNodes === totalNodes;

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
  const statistics = [
    {
      label: "Successful Repairs",
      value: summary.successful_repairs ?? 0,
      icon: CheckCircle2,
      type: "success",
    },
    {
      label: "Failed Repairs",
      value: summary.failed_repairs ?? 0,
      icon: XCircle,
      type: "danger",
    },
    {
      label: "Missing Primaries",
      value: summary.missing_primaries ?? 0,
      icon: AlertTriangle,
      type: "warning",
    },
    {
      label: "Corrupted Primaries",
      value: summary.corrupted_primaries ?? 0,
      icon: Database,
      type: "warning",
    },
  ];

  const eventDetails = {
    cycle_started: {
      label: "Cycle Started",
      icon: Activity,
      type: "neutral",
    },
    cycle_completed: {
      label: "Cycle Completed",
      icon: CheckCircle2,
      type: "success",
    },
    cycle_failed: {
      label: "Cycle Failed",
      icon: XCircle,
      type: "danger",
    },
    primary_missing: {
      label: "Primary Missing",
      icon: AlertTriangle,
      type: "warning",
    },
    primary_corrupted: {
      label: "Primary Corrupted",
      icon: AlertTriangle,
      type: "warning",
    },
    repair_success: {
      label: "Repair Successful",
      icon: CheckCircle2,
      type: "success",
    },
    repair_failed: {
      label: "Repair Failed",
      icon: XCircle,
      type: "danger",
    },
  };

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString();
  };

  const formatEventName = (type) => {
    return eventDetails[type]?.label || type;
  };

  return (
    <div className="recovery-page">
      <div className="recovery-header">
        <div>
          <p className="recovery-eyebrow">
            SYSTEM RELIABILITY
          </p>

          <h2>Recovery Center</h2>

          <p>
            Monitor background self-healing,
            integrity failures and recovery history.
          </p>
        </div>

        <button
          className="monitoring-refresh"
          onClick={() => loadData(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      
{/* Background Recovery Worker */}
<section className="recovery-worker-card">
  <div className="recovery-worker-icon">
    <ShieldCheck size={25} />
  </div>

  <div className="recovery-worker-info">
    <h3>Background Recovery Worker</h3>
    <p>
      Automatically checks primary chunks and verifies
      replica integrity every 60 seconds.
    </p>
  </div>

  <div className="recovery-worker-interval">
    <Clock size={16} />
    <span>60-second interval</span>
  </div>
</section>

{/* Current System Health */}
<section className="recovery-health-card">
  <div className="recovery-section-heading">
    <div>
      <h3>Current System Health</h3>
      <p>Live availability of distributed storage nodes.</p>
    </div>

    <span className={`health-status ${systemHealthy ? "healthy" : "warning"}`}>
      {systemHealthy ? "All Systems Operational" : "Attention Required"}
    </span>
  </div>

  <div className="recovery-health-summary">
    <div>
      <strong>{onlineNodes}/{totalNodes}</strong>
      <span>Nodes Online</span>
    </div>
  </div>

  <div className="recovery-node-list">
    {nodes.map((node) => {
      const isOnline = Number(node.is_available) === 1;

      return (
        <div className="recovery-node-row" key={node.node_id}>
          <div className="recovery-node-identity">
            <Server size={19} />
            <div>
              <strong>{node.node_id}</strong>
              <span>{node.chunk_count} chunks stored</span>
            </div>
          </div>

          <div className="recovery-node-metrics">
            <span>{node.latency_ms} ms</span>
            <span>{formatBytes(node.total_bytes)}</span>
            <span className={`node-status ${isOnline ? "online" : "offline"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      );
    })}
  </div>

  {metricsError && <p className="health-error">{metricsError}</p>}
</section>


      <div className="recovery-stats-grid">
        {statistics.map((item) => {
          const Icon = item.icon;

          return (
            <div
              className="recovery-stat-card"
              key={item.label}
            >
              <div className={`recovery-stat-icon ${item.type}`}>
                <Icon size={20} />
              </div>

              <p>{item.label}</p>
              <h3>{item.value}</h3>
            </div>
          );
        })}
      </div>

      <section className="recovery-cycle-card">
        <div className="recovery-section-heading">
          <div>
            <h3>Recovery Cycle Overview</h3>
            <p>
              Historical execution statistics.
            </p>
          </div>

          <Activity size={20} />
        </div>

        <div className="recovery-cycle-grid">
          <div>
            <span>Total Cycles</span>
            <strong>{summary.total_cycles ?? 0}</strong>
          </div>

          <div>
            <span>Completed Cycles</span>
            <strong className="success-text">
              {summary.completed_cycles ?? 0}
            </strong>
          </div>

          <div>
            <span>Failed Cycles</span>
            <strong className="danger-text">
              {summary.failed_cycles ?? 0}
            </strong>
          </div>
        </div>

        <div className="recovery-latest-cycle">
          <Clock size={16} />
          <div>
            <span>Latest recorded cycle event</span>
            <strong>
              {latestCycle
                ? formatEventName(latestCycle.event_type)
                : "No cycle recorded"}
            </strong>
            <small>
              {formatDate(latestCycle?.created_at)}
            </small>
          </div>
        </div>
      </section>

      <section className="recovery-events-section">
        <div className="recovery-section-heading">
          <div>
            <h3>Recovery Event History</h3>
            <p>
              Latest recorded recovery events.
            </p>
          </div>

          <span>{events.length} events</span>
        </div>

        {events.length === 0 ? (
          <div className="recovery-empty">
            <Database size={30} />
            <h3>No recovery events yet</h3>
            <p>
              Recovery activity will appear here
              when the worker records events.
            </p>
          </div>
        ) : (
          <div className="recovery-event-list">
            {events.map((event) => {
              const details =
                eventDetails[event.event_type] || {};

              const Icon =
                details.icon || Activity;

              return (
                <div
                  className="recovery-event-row"
                  key={event.log_id}
                >
                  <div
                    className={`recovery-event-icon ${
                      details.type || "neutral"
                    }`}
                  >
                    <Icon size={17} />
                  </div>

                  <div className="recovery-event-content">
                    <div className="recovery-event-title">
                      <strong>
                        {formatEventName(event.event_type)}
                      </strong>

                      {event.chunk_id && (
                        <span>
                          Chunk #{event.chunk_id}
                        </span>
                      )}
                    </div>

                    <p>{event.message}</p>

                    <small>
                      {formatDate(event.created_at)}
                    </small>
                  </div>

                  <div className="recovery-event-nodes">
                    {event.source_node && (
                      <span>
                        Node {event.source_node}
                      </span>
                    )}

                    {event.target_node && (
                      <span>
                        <Wrench size={12} />
                        Node {event.target_node}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Recovery;
