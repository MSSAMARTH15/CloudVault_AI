import axios from "axios";

const API_URL = "http://localhost:5000/api/recovery";

export const getRecoveryStatus = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${API_URL}/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};