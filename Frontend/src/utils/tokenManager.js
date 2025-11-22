/**
 * Secure Token Management for JWT Authentication
 * Provides enhanced security for token storage and validation
 */

class TokenManager {
  constructor() {
    this.TOKEN_KEY = 'auth-token';
    this.REFRESH_TOKEN_KEY = 'refresh-token';
    this.TOKEN_EXPIRY_KEY = 'token-expiry';
  }

  /**
   * Store JWT token securely
   * @param {string} token - JWT token
   * @param {number} expiresIn - Token expiration time in seconds
   */
  setToken(token, expiresIn = 3600) {
    try {
      // Validate token format
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token format');
      }

      // Decode token to check expiration
      const payload = this.decodeToken(token);
      if (!payload) {
        throw new Error('Invalid token payload');
      }

      // Store token with expiration
      const expiryTime = Date.now() + (expiresIn * 1000);
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());

      // Also store in sessionStorage as backup
      sessionStorage.setItem(this.TOKEN_KEY, token);
      sessionStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());

      return true;
    } catch (error) {
      console.error('Failed to store token:', error);
      return false;
    }
  }

  /**
   * Retrieve stored token
   * @returns {string|null} JWT token or null if invalid/expired
   */
  getToken() {
    try {
      // Try localStorage first, then sessionStorage as backup
      let token = localStorage.getItem(this.TOKEN_KEY);
      let expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

      // If not in localStorage, try sessionStorage
      if (!token) {
        token = sessionStorage.getItem(this.TOKEN_KEY);
        expiryTime = sessionStorage.getItem(this.TOKEN_EXPIRY_KEY);

        // If found in sessionStorage, restore to localStorage
        if (token) {
          localStorage.setItem(this.TOKEN_KEY, token);
          localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime || '');
        }
      }

      if (!token) {
        return null;
      }

      // Check if token has expired
      if (expiryTime && Date.now() > parseInt(expiryTime)) {
        this.clearToken();
        return null;
      }

      // Additional validation
      const payload = this.decodeToken(token);
      if (!payload || payload.exp * 1000 < Date.now()) {
        this.clearToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      this.clearToken();
      return null;
    }
  }

  /**
   * Clear stored token
   */
  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);

    // Also clear from sessionStorage
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Decode JWT token (client-side validation only)
   * @param {string} token - JWT token
   * @returns {object|null} Token payload or null if invalid
   */
  decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is valid and not expired
   * @returns {boolean} True if token is valid
   */
  isTokenValid() {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const payload = this.decodeToken(token);
    return payload && payload.exp * 1000 > Date.now();
  }

  /**
   * Get time until token expires in seconds
   * @returns {number} Seconds until expiry, or 0 if expired
   */
  getTimeUntilExpiry() {
    const token = this.getToken();
    if (!token) {
      return 0;
    }

    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return 0;
    }

    const expiryTime = payload.exp * 1000;
    const currentTime = Date.now();
    return Math.max(0, Math.floor((expiryTime - currentTime) / 1000));
  }

  /**
   * Get user information from token
   * @returns {object|null} User information or null if invalid
   */
  getUserFromToken() {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const payload = this.decodeToken(token);
    if (!payload) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tenant_id: payload.tenant_id,
      permissions: payload.permissions || []
    };
  }

  /**
   * Check if user has required role
   * @param {string} requiredRole - Required role (super_admin, manager, cashier)
   * @returns {boolean} True if user has required role
   */
  hasRole(requiredRole) {
    const user = this.getUserFromToken();
    if (!user) {
      return false;
    }

    // Super admin has access to everything
    if (user.role === 'super_admin') {
      return true;
    }

    return user.role === requiredRole;
  }

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   */
  hasPermission(permission) {
    const user = this.getUserFromToken();
    if (!user) {
      return false;
    }

    // Super admin has all permissions
    if (user.role === 'super_admin') {
      return true;
    }

    return user.permissions.includes(permission);
  }

  /**
   * Setup automatic token refresh
   * @param {Function} refreshCallback - Function to call for token refresh
   */
  setupAutoRefresh(refreshCallback) {
    const checkAndRefresh = () => {
      const timeUntilExpiry = this.getTimeUntilExpiry();

      // Refresh token when less than 5 minutes remaining
      if (timeUntilExpiry > 0 && timeUntilExpiry < 300) {
        refreshCallback();
      }
    };

    // Check every minute
    setInterval(checkAndRefresh, 60000);
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();
export default tokenManager;