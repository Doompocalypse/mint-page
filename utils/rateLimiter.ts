interface RateLimitResult {
  allowed: boolean;
  timeLeft?: number;
}

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // 5 requests per minute

const requestLog: Map<string, number[]> = new Map();

export function rateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Get existing requests
  let requests = requestLog.get(identifier) || [];
  
  // Filter out old requests
  requests = requests.filter(timestamp => timestamp > windowStart);
  
  // Check if limit exceeded
  if (requests.length >= MAX_REQUESTS) {
    const oldestRequest = requests[0];
    const timeLeft = oldestRequest - windowStart;
    return { allowed: false, timeLeft };
  }
  
  // Add new request
  requests.push(now);
  requestLog.set(identifier, requests);
  
  return { allowed: true };
} 