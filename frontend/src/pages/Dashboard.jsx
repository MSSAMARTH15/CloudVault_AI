
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getStorageMetrics,
} from "../services/monitoringService";
import {
  getMyFiles,
} from "../services/fileService";

import {
  Files,
  Database,
  Server,
  Upload,
  FolderOpen,
  Activity,
  ShieldCheck,
} from "lucide-react";

import "../App.css";

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);

  const [metricsData, setMetricsData] = useState(null);
  const [metricsError, setMetricsError] = useState("");
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Fetch the user's files
  useEffect(() => {
    let isMounted = true;

    const fetchFiles = async () => {
      try {
        const data = await getMyFiles();

        if (isMounted) {
          setFiles(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch files:", error);
      } finally {
        if (isMounted) {
          setFilesLoading(false);
        }
      }
    };

    fetchFiles();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch storage metrics and refresh every 30 seconds
  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        const data = await getStorageMetrics();

        if (isMounted && data.success) {
          setMetricsData(data);
          setMetricsError("");
        }
      } catch (error) {
        if (isMounted) {
          console.error("Metrics error:", error);
          setMetricsError("Unable to fetch system metrics");
        }
      } finally {
        if (isMounted) {
          setMetricsLoading(false);
        }
      }
    };

    fetchMetrics();

    const interval = setInterval(fetchMetrics, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Calculate storage usage
  const totalBytes = files.reduce(
    (total, file) =>
      total + Number(file.original_size || 0),
    0
  );

  const storageUsedMB = totalBytes / (1024 * 1024);
  const storageLimitMB = 50;

  const storagePercentage = Math.min(
    (storageUsedMB / storageLimitMB) * 100,
    100
  );

  // Determine overall system health
  const nodes = metricsData?.nodes || [];

  const systemHealth = metricsLoading
    ? "Checking..."
    : metricsError
    ? "Unavailable"
    : nodes.length > 0 &&
      nodes.every((node) => Number(node.is_available) === 1)
    ? "Healthy"
    : "Degraded";

  const healthClass =
    systemHealth === "Healthy"
      ? "health-good"
      : systemHealth === "Degraded"
      ? "health-warning"
      : "health-neutral";

  return (
    <div className="dashboard">

      {/* PAGE INTRODUCTION */}
      <div className="dashboard-header">
        <div>
          <h2>Welcome to CloudVault</h2>
          <p>
            Here's an overview of your distributed storage system.
          </p>
        </div>
      </div>

      {/* KEY METRICS */}
      <div className="stats">

        <div className="stat-card">
          <h3>
            <Files size={17} />
            Files Stored
          </h3>
          <p>
            {filesLoading ? "..." : files.length}
          </p>
        </div>

        <div className="stat-card">
          <h3>
            <Database size={17} />
            Storage Used
          </h3>
          <p>
            {filesLoading
              ? "..."
              : `${storageUsedMB.toFixed(2)} MB`}
          </p>
        </div>

        <div className="stat-card">
          <h3>
            <Server size={17} />
            Storage Nodes
          </h3>
          <p>
            {metricsLoading
              ? "..."
              : metricsError
              ? "--"
              : nodes.length}
          </p>
        </div>

      </div>

      {/* STORAGE OVERVIEW */}
      <div className="storage-overview">
        <div className="section-heading">
          <div>
            <h3>Storage Overview</h3>
            <p>
              Your current storage consumption
            </p>
          </div>

          <span>
            {filesLoading
              ? "Loading..."
              : `${storagePercentage.toFixed(1)}% used`}
          </span>
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${storagePercentage}%`,
            }}
          />
        </div>

        <div className="storage-details">
          <span>
            {filesLoading
              ? "Calculating..."
              : `${storageUsedMB.toFixed(2)} MB used`}
          </span>

          <span>
            {storageLimitMB} MB capacity
          </span>
        </div>
      </div>

      {/* SYSTEM STATUS */}
      <div className="storage-overview dashboard-system-status">
        <div className="section-heading">
          <div>
            <h3>
              <Activity size={17} />
              System Status
            </h3>
            <p>
              Current availability of your storage infrastructure
            </p>
          </div>

          <span className={healthClass}>
            {systemHealth}
          </span>
        </div>

        {metricsError && (
          <p className="dashboard-error">
            {metricsError}
          </p>
        )}

        {!metricsLoading && !metricsError && (
          <p>
            {nodes.filter(
              (node) => Number(node.is_available) === 1
            ).length}{" "}
            of {nodes.length} storage nodes are online.
          </p>
        )}
      </div>

      {/* QUICK ACCESS */}
      <div className="dashboard-quick-access">
        <div className="section-heading">
          <div>
            <h3>Quick Access</h3>
            <p>
              Navigate to your workspace
            </p>
          </div>
        </div>

        <div className="analytics-grid">

          <Link to="/myfiles" className="analytics-card">
            <FolderOpen size={20} />
            <h3>My Files</h3>
            <p>Browse and manage your files</p>
          </Link>

          <Link to="/uploads" className="analytics-card">
            <Upload size={20} />
            <h3>Uploads</h3>
            <p>Upload new files</p>
          </Link>

          <Link to="/storage-nodes" className="analytics-card">
            <Server size={20} />
            <h3>Storage Nodes</h3>
            <p>Monitor node performance</p>
          </Link>

          <Link to="/recovery" className="analytics-card">
            <ShieldCheck size={20} />
            <h3>Recovery Center</h3>
            <p>Monitor anomalies and recovery</p>
          </Link>

        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="activity-panel">
        <h3>Recent Activity</h3>
        <p>
          Activity history is not yet available across pages.
        </p>
      </div>

    </div>
  );
}

export default Dashboard;
