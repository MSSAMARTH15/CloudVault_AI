
import axios from "axios";

const API_URL = "http://localhost:5000/api/monitoring";

export const getStorageMetrics = async () => {
  const response = await axios.get(`${API_URL}/metrics`);

  return response.data;
};

export const getAnomalyAnalysis = async () => {
  const response = await axios.get(`${API_URL}/anomalies`);

  return response.data;
};
