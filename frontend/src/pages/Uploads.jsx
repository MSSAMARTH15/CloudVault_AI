
import { useRef, useState } from "react";
import {
  UploadCloud,
  File,
  FileText,
  FileImage,
  FileArchive,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { uploadFile } from "../services/fileService";
import "../App.css";

function Uploads() {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const inputRef = useRef(null);

  const addFiles = (selectedFiles) => {
    const newFiles = Array.from(selectedFiles);

    setFiles((previous) => {
      const additions = newFiles
        .filter((file) => {
          const exists = previous.some(
            (item) =>
              item.file.name === file.name &&
              item.file.size === file.size &&
              item.file.lastModified === file.lastModified
          );

          return !exists;
        })
        .map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          progress: 0,
          status: "pending",
          error: "",
        }));

      return [...previous, ...additions];
    });
  };

  const removeFile = (id) => {
    if (uploading) return;

    setFiles((previous) =>
      previous.filter((item) => item.id !== id)
    );
  };

  const handleUpload = async () => {
    if (files.length === 0 || uploading) return;

    setUploading(true);

    // Upload one file at a time using the existing backend endpoint.
    for (const item of files) {
      if (item.status === "success") continue;

      setFiles((previous) =>
        previous.map((f) =>
          f.id === item.id
            ? { ...f, status: "uploading", progress: 0, error: "" }
            : f
        )
      );

      try {
        await uploadFile(item.file, (percentage) => {
          setFiles((previous) =>
            previous.map((f) =>
              f.id === item.id
                ? { ...f, progress: percentage }
                : f
            )
          );
        });

        setFiles((previous) =>
          previous.map((f) =>
            f.id === item.id
              ? { ...f, status: "success", progress: 100 }
              : f
          )
        );
      } catch (error) {
        console.error(`Upload failed: ${item.file.name}`, error);

        setFiles((previous) =>
          previous.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "error",
                  error:
                    error.response?.data?.message ||
                    "Upload failed. Please retry.",
                }
              : f
          )
        );
      }
    }

    setUploading(false);
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();

    if (["pdf", "doc", "docx", "txt"].includes(extension)) {
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
    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const completedCount = files.filter(
    (item) => item.status === "success"
  ).length;

  const failedCount = files.filter(
    (item) => item.status === "error"
  ).length;

  const hasPending = files.some(
    (item) => item.status !== "success"
  );

  return (
    <div className="dashboard uploads-page">
      <div className="files-page-header">
        <div>
          <h1>Upload Files</h1>
          <p>
            Upload and distribute multiple files across CloudVault nodes.
          </p>
        </div>
      </div>

      <section
        className={`upload-dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);

          if (!uploading) {
            addFiles(e.dataTransfer.files);
          }
        }}
      >
        <div className="upload-dropzone-icon">
          <UploadCloud size={36} />
        </div>

        <h3>Drag and drop your files here</h3>
        <p>Or select multiple files from your computer</p>

        <button
          className="monitoring-refresh"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          Browse Files
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          disabled={uploading}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </section>

      {files.length > 0 && (
        <section className="upload-queue">
          <div className="upload-queue-header">
            <div>
              <h3>Upload Queue</h3>
              <p>
                {files.length} files · {completedCount} completed ·{" "}
                {failedCount} failed
              </p>
            </div>

            {!uploading && (
              <button
                className="upload-btn"
                onClick={handleUpload}
                disabled={!hasPending}
              >
                <UploadCloud size={16} />
                {failedCount > 0 ? "Retry Pending / Failed" : "Upload All"}
              </button>
            )}
          </div>

          <div className="upload-queue-list">
            {files.map((item) => {
              const Icon = getFileIcon(item.file.name);

              return (
                <div className="upload-queue-item" key={item.id}>
                  <div className="upload-queue-file">
                    <Icon size={23} />

                    <div>
                      <strong title={item.file.name}>
                        {item.file.name}
                      </strong>
                      <span>{formatSize(item.file.size)}</span>
                    </div>
                  </div>

                  <div className="upload-queue-status">
                    {item.status === "success" && (
                      <span className="queue-success">
                        <CheckCircle2 size={15} /> Uploaded
                      </span>
                    )}

                    {item.status === "error" && (
                      <span className="queue-error">
                        <AlertCircle size={15} /> Failed
                      </span>
                    )}

                    {item.status === "uploading" && (
                      <span className="queue-uploading">
                        <Loader2 size={15} className="spin" />
                        {item.progress}%
                      </span>
                    )}

                    {item.status === "pending" && (
                      <span className="queue-pending">Waiting</span>
                    )}

                    {!uploading && item.status !== "uploading" && (
                      <button
                        className="upload-remove-btn"
                        onClick={() => removeFile(item.id)}
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>

                  {item.status === "uploading" && (
                    <div className="queue-progress-track">
                      <div
                        className="queue-progress-fill"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {item.error && (
                    <p className="queue-error-message">{item.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default Uploads;
