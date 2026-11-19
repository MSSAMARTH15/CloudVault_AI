
import axios from "axios";

const API_URL = "http://localhost:5000/api/files";

export const getReplicationData = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/replication`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
