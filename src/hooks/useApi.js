import { API_BASE } from '../constants';

export const useApi = () => {
  const apiCall = async (endpoint, options = {}) => {
    const { token, ...fetchOptions } = options;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const mergedOptions = {
      ...defaultOptions,
      ...fetchOptions,
      headers: {
        ...defaultOptions.headers,
        ...fetchOptions.headers
      }
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, mergedOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  const get = (endpoint, token) => apiCall(endpoint, { method: 'GET', token });
  const post = (endpoint, data, token) => apiCall(endpoint, { method: 'POST', body: JSON.stringify(data), token });
  const put = (endpoint, data, token) => apiCall(endpoint, { method: 'PUT', body: JSON.stringify(data), token });
  const del = (endpoint, token) => apiCall(endpoint, { method: 'DELETE', token });

  // For file uploads
  const upload = async (endpoint, formData, token) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  // For file downloads
  const download = async (endpoint, token) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  };

  return {
    get,
    post,
    put,
    del,
    upload,
    download
  };
};