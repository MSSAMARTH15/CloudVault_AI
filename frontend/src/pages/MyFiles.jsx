
import { useEffect, useMemo, useState } from "react";
import {
  Files,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File,
  Download,
  Trash2,
  Search,
  RefreshCw,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  getMyFiles,
  downloadFile,
  deleteFile,
} from "../services/fileService";

import "../App.css";

function MyFiles() {
  const location = useLocation();
  const [files, setFiles] = useState([]);
const [searchTerm, setSearchTerm] = useState(
  location.state?.searchTerm || ""
);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadFiles = async () => {
    try {
      setError("");
      const data = await getMyFiles();
      setFiles(data);
    } catch (err) {
      console.error("File loading error:", err);
      setError("Unable to load your files. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
  if (location.state?.searchTerm) {
    setSearchTerm(location.state.searchTerm);
  }
}, [location.state?.searchTerm]);

  useEffect(() => {
    loadFiles();
  }, []);

  const filteredFiles = useMemo(() => {
    return files.filter((file) =>
      file.file_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  const getFileIcon = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();

    if (extension === "pdf" || ["doc", "docx", "txt"].includes(extension)) {
      return FileText;
    }

    if (["png", "jpg", "jpeg", "gif"].includes(extension)) {
      return FileImage;
    }

    if (["xls", "xlsx", "csv"].includes(extension)) {
      return FileSpreadsheet;
    }

    if (["zip", "rar", "7z"].includes(extension)) {
      return FileArchive;
    }

    return File;
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = async (file) => {
    try {
      setDownloadingId(file.file_id);
      await downloadFile(file.file_id, file.file_name);
    } catch (err) {
      console.error("Download error:", err);
      alert("Unable to download this file.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (file) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${file.file_name}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(file.file_id);

      await deleteFile(file.file_id);

      setFiles((previousFiles) =>
        previousFiles.filter(
          (item) => item.file_id !== file.file_id
        )
      );
    } catch (err) {
      console.error("Delete error:", err);
      alert("Unable to delete this file.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="dashboard">
      <div className="files-page-header">
        <div>
          <h1>My Files</h1>
          <p>Manage and access your stored files.</p>
        </div>

        <button
          className="monitoring-refresh"
          onClick={() => {
            setLoading(true);
            loadFiles();
          }}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="files-toolbar">
        <div className="search-container">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search your files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <span className="files-count">
          {filteredFiles.length} files
        </span>
      </div>

      {loading ? (
        <div className="recovery-state">
          <RefreshCw className="spin" size={24} />
          <p>Loading your files...</p>
        </div>
      ) : error ? (
        <div className="recovery-state">
          <p>{error}</p>
          <button className="monitoring-refresh" onClick={loadFiles}>
            Try Again
          </button>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="recovery-empty">
          <Files size={32} />
          <h3>
            {searchTerm ? "No matching files" : "No files yet"}
          </h3>
          <p>
            {searchTerm
              ? "Try another search term."
              : "Upload your first file to see it here."}
          </p>
        </div>
      ) : (
        <div className="files-grid">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.file_name);
            const extension = file.file_name.split(".").pop().toUpperCase();

            return (
              <div className="premium-file-card" key={file.file_id}>
                <div className="file-card-icon">
                  <Icon size={26} />
                </div>

                <h3 title={file.file_name}>
                  {file.file_name}
                </h3>

                <p>Size: {formatSize(file.original_size)}</p>
                <p>Type: {extension}</p>

                <div className="file-card-actions">
                  <button
                    className="download-btn"
                    onClick={() => handleDownload(file)}
                    disabled={
                      downloadingId === file.file_id ||
                      deletingId === file.file_id
                    }
                  >
                    <Download size={15} />
                    {downloadingId === file.file_id
                      ? "Downloading..."
                      : "Download"}
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(file)}
                    disabled={
                      deletingId === file.file_id ||
                      downloadingId === file.file_id
                    }
                  >
                    <Trash2 size={15} />
                    {deletingId === file.file_id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyFiles;
