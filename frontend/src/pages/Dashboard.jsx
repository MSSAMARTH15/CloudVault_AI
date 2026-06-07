import {
  useEffect,
  useState,
  useRef,
} from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  uploadFile,
  getMyFiles,
  downloadFile,
  deleteFile,
} from "../services/fileService";

import "../App.css";
import Sidebar from "../components/Sidebar";

function Dashboard() {
  const [file, setFile] =
    useState(null);

  const [files, setFiles] =
    useState([]);
  const [searchTerm, setSearchTerm] =
    useState("");
    const [activities, setActivities] =
  useState([]);
  const dashboardRef =
  useRef(null);

const uploadRef =
  useRef(null);

const filesRef =
  useRef(null);
  const loadFiles = async () => {
    try {
      const data =
        await getMyFiles();

      setFiles(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);
const handleDelete = async (
  fileId,
  fileName
) => {
  try {
    await deleteFile(fileId);

    setActivities((prev) => [
      {
        type: "delete",
        file: fileName,
        time:
          new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);

    alert(
      "File Deleted Successfully"
    );

    loadFiles();
  } catch (error) {
    console.log(error);
  }
};

  const handleUpload = async () => {
    if (!file) {
      alert("Select a file");
      return;
    }

    try {
      await uploadFile(file);
      setActivities((prev) => [
  {
    type: "upload",
    file: file.name,
    time:
      new Date().toLocaleTimeString(),
  },
  ...prev,
]);
      alert(
        "File Uploaded Successfully"
      );

      setFile(null);

      loadFiles();
    } catch (error) {
      console.log(error);
    }
  };

  
  const handleDownload = async (
    fileId,
    fileName
  ) => {
    try {
      await downloadFile(
        fileId,
        fileName
      );
      setActivities((prev) => [
  {
    type: "download",
    file: fileName,
    time:
      new Date().toLocaleTimeString(),
  },
  ...prev,
]);
    } catch (error) {
      console.log(error);
    }
  };

  const logout = () => {
    localStorage.removeItem(
      "token"
    );

    window.location.href = "/";
  };

  const getFileIcon = (fileName) => {
  const extension =
    fileName
      .split(".")
      .pop()
      .toLowerCase();

  switch (extension) {
    case "pdf":
      return "📕";

    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
      return "🖼️";

    case "doc":
    case "docx":
      return "📄";

    case "xls":
    case "xlsx":
      return "📊";

    case "ppt":
    case "pptx":
      return "📽️";

    case "mp4":
    case "avi":
    case "mov":
      return "🎥";

    case "zip":
    case "rar":
      return "📦";

    case "txt":
      return "📝";

    default:
      return "📁";
  }
};

  return (
    <div className="dashboard-layout">
      <Sidebar />


      <div className="dashboard"
      ref={dashboardRef}>
        {/* STATS */}

        <div className="stats">
          <div className="stat-card">
            <h3>
              📁 Files Stored
            </h3>

            <p>{files.length}</p>
          </div>

          <div className="stat-card">
            <h3>
              💾 Storage Used
            </h3>

            <p>
              {(
                files.reduce(
                  (
                    total,
                    file
                  ) =>
                    total +
                    (file.original_size ||
                      0),
                  0
                ) /
                (1024 * 1024)
              ).toFixed(2)}
              MB
            </p>
          </div>

          <div className="stat-card">
            <h3>
              🖥 Storage Nodes
            </h3>

            <p>3</p>
          </div>
        </div>

        {/* STORAGE OVERVIEW */}

        <div className="storage-overview">
          <h3>
            Storage Usage
          </h3>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(
                  (files.reduce(
                    (total, file) =>
                      total +
                      (file.original_size ||
                        0),
                    0
                  ) /
                    (50 *
                      1024 *
                      1024)) *
                    100,
                  100
                )}%`,
              }}
            ></div>
          </div>

          <p>
            {(
              files.reduce(
                (total, file) =>
                  total +
                  (file.original_size ||
                    0),
                0
              ) /
              (1024 * 1024)
            ).toFixed(2)}
            MB Used
          </p>
        </div>

        {/* NODE HEALTH */}

        <div className="nodes-section">
          <h2>Node Health</h2>

          <div className="nodes-grid">
            <div className="node-card">
              <h3>🟢 Node 1</h3>
              <p>Status: Online</p>
            </div>

            <div className="node-card">
              <h3>🟢 Node 2</h3>
              <p>Status: Online</p>
            </div>

            <div className="node-card">
              <h3>🟢 Node 3</h3>
              <p>Status: Online</p>
            </div>
          </div>
        </div>
<div className="analytics-grid">
  <div className="analytics-card">
    <h3>🛡 Protected Files</h3>
    <p>{files.length}</p>
  </div>

  <div className="analytics-card">
    <h3>♻ Recovery Success</h3>
    <p>100%</p>
  </div>

  <div className="analytics-card">
    <h3>⚡ System Health</h3>
    <p>Excellent</p>
  </div>

  <div className="analytics-card">
    <h3>🔄 Replication</h3>
    <p>3x</p>
  </div>
</div>

<div className="activity-panel">
  <h2>
    📈 Recent Activity
  </h2>

  {activities.length === 0 ? (
    <p>No recent activity</p>
  ) : (
    activities
      .slice(0, 5)
      .map((activity, index) => (
        <div
          key={index}
          className="activity-item"
        >
          <span>
            {activity.type ===
              "upload" && "⬆ "}
            {activity.type ===
              "download" && "⬇ "}
            {activity.type ===
              "delete" && "🗑 "}

            {activity.file}
          </span>

          <small>
            {activity.time}
          </small>
        </div>
      ))
  )}
</div>
        {/* UPLOAD SECTION */}

        <div className="upload-card"
        ref={uploadRef}>
          <h3>
            📤 Upload New File
          </h3>

          <div className="upload-box">
            <p>
              Drag & Drop Files Here
            </p>

            <span>
              or choose a file
              from your computer
            </span>

            <input
              type="file"
              onChange={(e) =>
                setFile(
                  e.target.files[0]
                )
              }
            />

            {file && (
              <div className="selected-file">
                📄 {file.name}
              </div>
            )}
          </div>

          <button
            className="upload-btn"
            onClick={handleUpload}
          >
            Upload File
          </button>
        </div>

        {/* FILES SECTION */}

        <div className="files-section"
        ref={filesRef}>
          <div className="search-container">
  <input
    type="text"
    placeholder="🔍 Search files..."
    value={searchTerm}
    onChange={(e) =>
      setSearchTerm(e.target.value)
    }
    className="search-input"
  />
</div>
          <h2>My Files</h2>

          <div className="files-grid">
            {files
  .filter((file) =>
    file.file_name
      .toLowerCase()
      .includes(
        searchTerm.toLowerCase()
      )
  )
  .map((file) => (
              <div
                className="premium-file-card"
                key={file.file_id}
              >
                <h3>
  {getFileIcon(
    file.file_name
  )}{" "}
  {file.file_name}
</h3>

                <p>
                  Size:{" "}
                  {(
                    (file.original_size ||
                      0) / 1024
                  ).toFixed(2)}
                  KB
                </p>

                <p>
  Type:{" "}
  {
    file.file_name
      .split(".")
      .pop()
      .toUpperCase()
  }
</p>

                <p>
                  Replicated Across
                  3 Nodes
                </p>

                <button
                  className="download-btn"
                  onClick={() =>
                    handleDownload(
                      file.file_id,
                      file.file_name
                    )
                  }
                >
                  Download
                </button>
                <button
  className="delete-btn"
  onClick={() =>
    handleDelete(
      file.file_id,
      file.file_name
    )
  }
>
  Delete
</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;