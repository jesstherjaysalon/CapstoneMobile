// api.js

import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = "http://192.168.1.44:8000/api";

// Token management
export const getToken = async () => {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const setToken = async (token) => {
  try {
    await AsyncStorage.setItem('auth_token', token);
  } catch (error) {
    console.error('Error setting token:', error);
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem('auth_token');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};
// =========================
// Generic GET request
// =========================
export const getRequest = async (endpoint) => {
  try {
    const token = await getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers,
    });
    return await response.json();
  } catch (error) {
    console.log("GET Error:", error);
    return { success: false, message: "Network error" };
  }
};

// =========================
// Generic POST request
// =========================
export const postRequest = async (endpoint, data) => {
  try {
    const isFormData = data instanceof FormData;
    const token = await getToken();
    const headers = isFormData ? {} : {
      "Content-Type": "application/json",
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });

    const text = await response.text();
    const status = response.status;
    const contentType = response.headers && response.headers.get ? response.headers.get('content-type') : '';
    console.log('POST Response status:', status, 'content-type:', contentType);

    if (contentType && contentType.indexOf('application/json') !== -1) {
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.log('POST Error: JSON parse failed', parseError, text);
        return { success: false, message: 'Invalid JSON response from server.' };
      }
    }

    console.log('POST Error: Non-JSON response', text);
    return { success: false, message: `Unexpected server response (status ${status}).` };
  } catch (error) {
    console.log("POST Error:", error);
    return { success: false, message: "Network error" };
  }
};

// =========================
// Generic PUT request
// =========================
export const putRequest = async (endpoint, data) => {
  try {
    const token = await getToken();
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    return await response.json();
  } catch (error) {
    console.log("PUT Error:", error);
    return { success: false, message: "Network error" };
  }
};

// =========================
// Generic DELETE request
// =========================
export const deleteRequest = async (endpoint) => {
  try {
    const token = await getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers,
    });

    return await response.json();
  } catch (error) {
    console.log("DELETE Error:", error);
    return { success: false, message: "Network error" };
  }
};