// Centralized API Base URL configuration
// In production on Vercel: uses VITE_API_URL (e.g., https://your-backend.onrender.com)
// In local development: defaults to http://localhost:5000

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export default API_BASE_URL;
