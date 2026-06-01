/** Player positions used across frontend and backend */
export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD';

/** Standard API success wrapper */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/** Standard API error wrapper */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/** Health check payload returned by the backend */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
  };
}
