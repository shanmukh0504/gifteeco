/**
 * Client-side JWT utility functions
 * Note: These functions decode JWT without verification (for expiration checking only)
 */

interface JWTPayload {
  exp?: number;
  iat?: number;
  userId?: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * Decodes a JWT token without verification (client-side only)
 * Returns null if token is invalid
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Checks if a JWT token is expired
 * Returns true if expired or invalid, false if valid
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) {
    return true;
  }

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();

  // Consider token expired if it expires within the next minute (buffer time)
  return currentTime >= expirationTime - 60000;
}

/**
 * Gets the expiration time of a JWT token in milliseconds
 * Returns null if token is invalid or has no expiration
 */
export function getTokenExpirationTime(token: string | null): number | null {
  if (!token) {
    return null;
  }

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return decoded.exp * 1000;
}

/**
 * Gets the time remaining until token expiration in milliseconds
 * Returns 0 if expired, null if invalid
 */
export function getTimeUntilExpiration(token: string | null): number | null {
  const expirationTime = getTokenExpirationTime(token);
  if (expirationTime === null) {
    return null;
  }

  const remaining = expirationTime - Date.now();
  return Math.max(0, remaining);
}


