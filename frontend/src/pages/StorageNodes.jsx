
import { useEffect, useState } from "react";
import {
  Server,
  Activity,
  HardDrive,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

import { getStorageMetrics } from "../services/monitoringService";
import "../App.css";

function StorageNodes() {
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMetrics = async () => {
    try {
      const data = await getStorageMetrics();

      if (data.success) {
        setMetricsData(data);
        setError("");
      } else {
        setError("Unable to retrieve storage node metrics.");
      }
    } catch (err) {
      console.error("Storage metrics error:", err);
      setError("Unable to connect to the monitoring service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    const interval = setInterval(fetchMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  const nodes = metricsData?.nodes || [];

  const onlineNodes = nodes.filter(
    (node) => Number(node.is_available) === 1
  ).length;

  const totalChunks = nodes.reduce(
    (total, node) => total + Number(node.chunk_count || 0),
    0
  );

  const totalStorage = nodes.reduce(
    (total, node) => total + Number(node.total_bytes || 0),
    0
  );

  const formatStorage = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatLatency = (latency) => {
    if (latency === null || latency === undefined) {
      return "Unavailable";
    }

    return `${Number(latency).toFixed(2)} ms`;
  };

  if (loading) {
    return (
      <div className="dashboard">
        <p className="monitoring-message">
          Loading storage node information...
        </p>
      </div>
    );
  }

  if (error && !metricsData) {
    return (
      <div className="dashboard">
        <div className="monitoring-error">
          <XCircle size={20} />
          <p>{error}</p>
          <button onClick={fetchMetrics}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">

      {/* PAGE HEADER */}
      <div className="monitoring-header">
        <div>
          <h2>Storage Infrastructure</h2>
          <p>
            Monitor the availability and performance of your storage nodes.
          </p>
        </div>

        <button
          className="monitoring-refresh"
          onClick={fetchMetrics}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="stats">

        <div className="stat-card">
          <h3>
            <Server size={17} />
            Total Nodes
          </h3>
          <p>{nodes.length}</p>
        </div>

        <div className="stat-card">
          <h3>
            <CheckCircle2 size={17} />
            Online Nodes
          </h3>
          <p>{onlineNodes}</p>
        </div>

        <div className="stat-card">
          <h3>
            <Database size={17} />
            Total Chunks
          </h3>
          <p>{totalChunks}</p>
        </div>

        <div className="stat-card">
          <h3>
            <HardDrive size={17} />
            Distributed Storage
          </h3>
          <p>{formatStorage(totalStorage)}</p>
        </div>

      </div>

      {/* NODE DETAILS */}
      <div className="monitoring-section">
        <div className="section-heading">
          <div>
            <h3>Node Overview</h3>
            <p>
              Individual storage node status and resource information.
            </p>
          </div>

          <span className="monitoring-live">
            <Activity size={14} />
            Auto-refresh: 30s
          </span>
        </div>

        <div className="storage-nodes-grid">
          {nodes.map((node) => {
            const isOnline =
              Number(node.is_available) === 1;

            return (
              <div
                className="storage-node-card"
                key={node.node_id}
              >
                <div className="storage-node-header">
                  <div className="storage-node-icon">
                    <Server size={22} />
                  </div>

                  <span
                    className={
                      isOnline
                        ? "node-status online"
                        : "node-status offline"
                    }
                  >
                    {isOnline ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <XCircle size={14} />
                    )}
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>

                <h3>{node.node_id.toUpperCase()}</h3>

                <p className="storage-node-description">
                  Distributed storage node
                </p>

                <div className="node-metrics">

                  <div className="node-metric">
                    <span>
                      <Clock size={15} />
                      Latency
                    </span>
                    <strong>
                      {formatLatency(node.latency_ms)}
                    </strong>
                  </div>

                  <div className="node-metric">
                    <span>
                      <Database size={15} />
                      Stored Chunks
                    </span>
                    <strong>
                      {node.chunk_count}
                    </strong>
                  </div>

                  <div className="node-metric">
                    <span>
                      <HardDrive size={15} />
                      Storage Used
                    </span>
                    <strong>
                      {formatStorage(
                        Number(node.total_bytes || 0)
                      )}
                    </strong>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {nodes.length === 0 && (
          <p className="monitoring-message">
            No storage nodes were returned by the monitoring service.
          </p>
        )}
      </div>

      {error && (
        <p className="monitoring-error-inline">
          {error}. Showing the last successfully retrieved metrics.
        </p>
      )}

    </div>
  );
}

export default StorageNodes;
