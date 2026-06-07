import {
  useEffect,
  useState,
} from "react";

import {
  getMyFiles,
  downloadFile,
  deleteFile,
} from "../services/fileService";

import Sidebar from "../components/Sidebar";

import "../App.css";

function MyFiles() {
  const [files, setFiles] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

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
    fileId
  ) => {
    try {
      await deleteFile(fileId);

      alert(
        "File Deleted Successfully"
      );

      loadFiles();
    } catch (error) {
      console.log(error);
    }
  };

  const getFileIcon = (
    fileName
  ) => {
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

      case "zip":
      case "rar":
        return "📦";

      default:
        return "📁";
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard">
        <h1
          style={{
            marginBottom: "20px",
          }}
        >
          📁 My Files
        </h1>

        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 Search files..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
            className="search-input"
          />
        </div>

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
                key={
                  file.file_id
                }
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
                  {file.file_name
                    .split(".")
                    .pop()
                    .toUpperCase()}
                </p>

                <button
                  className="download-btn"
                  onClick={() =>
                    downloadFile(
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
                      file.file_id
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
  );
}

export default MyFiles;