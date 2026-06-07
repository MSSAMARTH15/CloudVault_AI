import axios from "axios";

const API_URL =
  "http://localhost:5000/api/files";

export const uploadFile = async (file) => {
  const token =
    localStorage.getItem("token");

  const formData = new FormData();

  formData.append("file", file);

  const response = await axios.post(
    `${API_URL}/upload`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const getMyFiles = async () => {
  const token =
    localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/myfiles`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const downloadFile = async (
  fileId,
  fileName
) => {
  const token =
    localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/download/${fileId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: "blob",
    }
  );

  const url =
    window.URL.createObjectURL(
      new Blob([response.data])
    );

  const link =
    document.createElement("a");

  link.href = url;

  link.setAttribute(
    "download",
    fileName
  );

  document.body.appendChild(link);

  link.click();

  link.remove();

  window.URL.revokeObjectURL(url);
};

export const deleteFile = async (
  fileId
) => {
  const token =
    localStorage.getItem("token");

  const response =
    await axios.delete(
      `${API_URL}/delete/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

  return response.data;
};