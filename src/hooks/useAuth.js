import { useState, useEffect } from 'react';
import { API_BASE } from '../constants';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Check for saved token on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setCurrentUser(parsedUser);
      } catch (err) {
        console.error('Error parsing saved user data:', err);
        // Clear invalid data
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
      }
    }
    setInitializing(false);
  }, []);

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      // Get client IP and user agent for tracking
      const clientInfo = {
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent
      };

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...clientInfo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de connexion');
      
      setToken(data.token);
      setCurrentUser(data.user);
      
      // Save token to localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get client IP
  const getClientIP = async () => {
    try {
      // Get the real client IP from server-side headers
      // This is the most reliable method for internal networks
      const response = await fetch(`${API_BASE}/api/auth/client-ip`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.ip;
      } else {
        throw new Error('Server IP detection failed');
      }
    } catch {
      console.log('Server IP detection failed, using fallback...');
      // Fallback to a generic internal IP indicator
      return 'internal-network';
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  };

  return {
    currentUser,
    token,
    loading,
    initializing,
    handleLogin,
    handleLogout
  };
};