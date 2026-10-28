/**
 * Utility to extract clean, human-friendly error messages from API responses,
 * RTK Query errors, or JavaScript Error instances.
 * Guarantees no "[object Object]", technical stack traces, or raw schema validator dumps.
 */
export function getErrorMessage(error: any, fallback: string = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallback;

  // 1. Direct string error
  if (typeof error === 'string') return error;

  // 2. Check if error payload from RTK Query / fetch response
  const data = error.data || error.response?.data;

  if (data) {
    // If backend provided a custom message
    if (typeof data.message === 'string' && data.message.trim() && data.message.toLowerCase() !== 'validation error') {
      return data.message;
    }

    // If backend provided a detail string
    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }

    // If backend provided detail as array of validation errors
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      const first = data.detail[0];
      if (typeof first === 'string') return first;
      if (first && typeof first.msg === 'string') {
        let msg = first.msg;
        if (msg.startsWith('Value error, ')) msg = msg.replace('Value error, ', '');
        if (msg.startsWith('Assertion failed, ')) msg = msg.replace('Assertion failed, ', '');
        return msg.charAt(0).toUpperCase() + msg.slice(1);
      }
    }

    // If backend provided errors array
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      if (typeof first === 'string') return first;
      if (first && typeof first.message === 'string') return first.message;
      if (first && typeof first.msg === 'string') return first.msg;
    }

    // If data itself is a string
    if (typeof data === 'string' && data.trim()) return data;
  }

  // 3. Check JavaScript Error object or RTK Query error message
  if (typeof error.message === 'string' && error.message.trim()) {
    const msg = error.message.toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    return error.message;
  }

  // 4. Fallback
  return fallback;
}
