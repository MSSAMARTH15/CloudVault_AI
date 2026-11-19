
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Database,
  Files,
  Copy,
  RefreshCw,
  Server,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import { getReplicationData } from "../services/replicationService";
import "../App.css";

function Replication() {
  const [replication, setReplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReplication = async () => {
    try {
      setError("");
      const data = await getReplicationData();
      setReplication(data);
    } catch (err) {
      console.error("Replication fetch failed:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load replication data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReplication();
  }, []);

  if (loading) {
    return (
      <div className="replication-page">
        <div className="replication-state">
          <RefreshCw className="spin" size={22} />
          <p>Loading replication data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="replication-page">
        <div className="replication-state">
          <AlertTriangle size={26} />
          <p>{error}</p>
          <button
            className="monitoring-refresh"
            onClick={loadReplication}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = replication?.summary || {};
  const chunks = replication?.chunks || [];

  const files = Object.values(
    chunks.reduce((acc, chunk) => {
      if (!acc[chunk.file_id]) {
        acc[chunk.file_id] = {
  file_id: chunk.file_id,
  file_name: chunk.file_name,
  original_size: chunk.original_size,
  upload_time: chunk.upload_time,
  chunks: [],
};
      }

      acc[chunk.file_id].chunks.push(chunk);
      return acc;
    }, {})
  );

const nodeDistribution = [1, 2, 3].map((nodeId) => {
  const primaryCount = chunks.filter(
    (chunk) => Number(chunk.primary_node) === nodeId
  ).length;

  const replicaCount = chunks.filter(
    (chunk) => Number(chunk.replica_node) === nodeId
  ).length;

  return {
    nodeId,
    primaryCount,
    replicaCount,
    total: primaryCount + replicaCount,
  };
});


  return (
    <div className="replication-page">
      <div className="replication-header">
        <div>
          <p className="replication-eyebrow">
            STORAGE MANAGEMENT
          </p>
          <h2>Replication Overview</h2>
          <p>
            Monitor primary chunks and their replica
            distribution across storage nodes.
          </p>
        </div>

        <button
          className="monitoring-refresh"
          onClick={loadReplication}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="replication-stats">
        <div className="replication-stat-card">
          <div className="replication-stat-icon">
            <Database size={20} />
          </div>
          <p>Total Primary Chunks</p>
          <h3>{summary.totalChunks ?? 0}</h3>
        </div>

        <div className="replication-stat-card">
          <div className="replication-stat-icon success">
            <Copy size={20} />
          </div>
          <p>Registered Replicas</p>
          <h3>{summary.replicatedChunks ?? 0}</h3>
        </div>

        <div className="replication-stat-card">
          <div className="replication-stat-icon warning">
            <AlertTriangle size={20} />
          </div>
          <p>Missing Replicas</p>
          <h3>{summary.missingReplicas ?? 0}</h3>
        </div>

        <div className="replication-stat-card">
          <div className="replication-stat-icon success">
            <ShieldCheck size={20} />
          </div>
          <p>Replication Coverage</p>
          <h3>
            {summary.replicationCoverage ?? 0}%
          </h3>
        </div>
      </div>

      <section className="replication-coverage-card">
        <div className="replication-coverage-heading">
          <div>
            <h3>Replication Coverage</h3>
            <p>
              Percentage of primary chunks with a
              registered replica record.
            </p>
          </div>
          <strong>
            {summary.replicationCoverage ?? 0}%
          </strong>
        </div>

        <div className="replication-progress-track">
          <div
            className="replication-progress-fill"
            style={{
              width: `${Math.min(
                100,
                Math.max(
                  0,
                  summary.replicationCoverage ?? 0
                )
              )}%`,
            }}
          />
        </div>

        <div className="replication-coverage-footer">
          <span>
            {summary.replicatedChunks ?? 0} of{" "}
            {summary.totalChunks ?? 0} chunks replicated
          </span>
          <span>
            {summary.missingReplicas ?? 0} missing
          </span>
        </div>
      </section>

<section className="node-distribution-card">
  <div className="node-distribution-header">
    <div>
      <h3>Node Distribution</h3>
      <p>
        Distribution of primary chunks and replica copies
        across storage nodes.
      </p>
    </div>

    <span className="node-distribution-total">
      {chunks.length * 2} stored copies
    </span>
  </div>

  <div className="node-distribution-grid">
    {nodeDistribution.map((node) => {
      const primaryWidth =
        node.total > 0
          ? (node.primaryCount / node.total) * 100
          : 0;

      const replicaWidth =
        node.total > 0
          ? (node.replicaCount / node.total) * 100
          : 0;

          <section className="replication-info-card">
  <div className="replication-info-icon">
    <ShieldCheck size={20} />
  </div>

  <div>
    <h3>How replication works</h3>
    <p>
      Every file is divided into chunks. Each primary chunk
      is stored on one storage node, while a replica copy
      is stored on a different node. This provides an
      additional copy for recovery if a primary node fails.
    </p>
  </div>
</section>

      return (
        <div
          className="node-distribution-item"
          key={node.nodeId}
        >
          <div className="node-distribution-title">
            <div className="node-distribution-name">
              <Server size={17} />
              <strong>Node {node.nodeId}</strong>
            </div>

            <span>{node.total} copies</span>
          </div>

          <div className="node-distribution-bar">
            <div
              className="node-primary-bar"
              style={{ width: `${primaryWidth}%` }}
            />

            <div
              className="node-replica-bar"
              style={{ width: `${replicaWidth}%` }}
            />
          </div>

          <div className="node-distribution-legend">
            <span>
              <i className="legend-primary" />
              {node.primaryCount} primary
            </span>

            <span>
              <i className="legend-replica" />
              {node.replicaCount} replicas
            </span>
          </div>
        </div>
      );
    })}
  </div>

  <div className="node-distribution-key">
    <span>
      <i className="legend-primary" />
      Primary chunks
    </span>

    <span>
      <i className="legend-replica" />
      Replica copies
    </span>
  </div>
</section>

      <div className="replication-section-heading">
        <div>
          <h3>File Replication Details</h3>
          <p>
            Primary and replica node assignments for
            each uploaded file.
          </p>
        </div>
        <span>{files.length} files</span>
      </div>

      {files.length === 0 ? (
        <div className="replication-empty">
          <Files size={32} />
          <h3>No replicated files yet</h3>
          <p>
            Upload a file to see its chunk distribution.
          </p>
        </div>
      ) : (
        <div className="replication-file-list">
          {files.map((file) => (
            <section
              className="replication-file-card"
              key={file.file_id}
            >
              <div className="replication-file-header">
                <div className="replication-file-icon">
                  <Files size={20} />
                </div>

                <div className="replication-file-info">
  <h4>{file.file_name}</h4>
  <p>
    {file.chunks.length} chunks
    {" · "}
    {(file.original_size / 1024).toFixed(2)} KB
    {" · "}
    {new Date(file.upload_time).toLocaleDateString()}
  </p>
</div>

                <span className="replication-file-status">
                  <CheckCircle2 size={15} />
                  Replica records found
                </span>
              </div>

              <div className="replication-chunk-list">
                {file.chunks.map((chunk) => (
                  <div
                    className="replication-chunk-row"
                    key={chunk.chunk_id}
                  >
                    <div className="replication-chunk-label">
                      <span>Chunk {chunk.chunk_number}</span>
                      <small>ID: {chunk.chunk_id}</small>
                    </div>

                    <div className="replication-node-flow">
                      <div className="replication-node primary">
                        <Server size={16} />
                        <div>
                          <small>PRIMARY</small>
                          <strong>
                            Node {chunk.primary_node}
                          </strong>
                        </div>
                      </div>

                      <ArrowRight
                        className="replication-arrow"
                        size={18}
                      />

                      <div className="replication-node replica">
                        <Copy size={16} />
                        <div>
                          <small>REPLICA</small>
                          <strong>
                            {chunk.replica_node
                              ? `Node ${chunk.replica_node}`
                              : "Not registered"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`replication-status ${
                        chunk.replica_node
                          ? "registered"
                          : "missing"
                      }`}
                    >
                      {chunk.replica_node
                        ? "Registered"
                        : "Missing"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default Replication;
