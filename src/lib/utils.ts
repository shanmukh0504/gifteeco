import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Decodes a JWT token and checks if it's expired
 * @param token - The JWT token string
 * @returns true if token is valid and not expired, false otherwise
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;

  try {
    // JWT tokens have three parts: header.payload.signature
    // We only need to decode the payload to check expiration
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));

    // Check if token has expiration claim
    if (!payload.exp) return true;

    // Compare expiration time (in seconds) with current time (in seconds)
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    // If decoding fails, consider token invalid
    console.error('Error decoding token:', error);
    return true;
  }
}
