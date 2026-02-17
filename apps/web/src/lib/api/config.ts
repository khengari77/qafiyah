/**
 * API configuration for the Qafiyah API
 * Simplified config for static site builds
 */

import { API_URL } from '@/constants/globals';

/**
 * Build a full API URL from a path
 */
export function buildApiUrl(path: string): string {
  return `${API_URL}${path}`;
}
