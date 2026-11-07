// Centralized API Base URL configuration
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

// Added '/api' to match index.js
export const fetchVenues = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/venues`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch venues:', error);
    throw error;
  }
};

// Added '/api' here as well
export const fetchVenue = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/venues/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch venue ${id}:`, error);
    throw error;
  }
};

export default API_BASE_URL;