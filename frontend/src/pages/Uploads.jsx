import { useState } from "react";

import {
  uploadFile,
} from "../services/fileService";

import Sidebar from "../components/Sidebar";

import "../App.css";

function Uploads() {
  const [file, setFile] =
    useState(null);

  const handleUpload =
    async () => {
      if (!file) {
        alert("Select a file");
        return;
      }

      try {
        await uploadFile(file);

        alert(
          "File Uploaded Successfully"
        );

        setFile(null);
      } catch (error) {
        console.log(error);
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
          📤 Upload Files
        </h1>

        <div className="upload-card">
          <h3>
            Upload New File
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
      </div>
    </div>
  );
}

export default Uploads;