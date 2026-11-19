import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

export const registerUser = async (userData) => {
  const response = await axios.post(
    `${API_URL}/register`,
    userData
  );

  return response.data;
};

export const loginUser = async (userData) => {
  const response = await axios.post(
    `${API_URL}/login`,
    userData
  );

  return response.data;

  
};


export const updateUsername = async (name) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(
    `${API_URL}/username`,
    { name },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const updatePassword = async (currentPassword, newPassword) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(
    `${API_URL}/password`,
    { currentPassword, newPassword },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
export const deleteAccount = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.delete(
    `${API_URL}/account`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const getProfile = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${API_URL}/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

