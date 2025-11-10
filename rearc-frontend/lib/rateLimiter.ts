/**
 * Rate Limiter for RPC Calls
 * 
 * Implements request throttling and exponential backoff to prevent rate limiting
 */

class RateLimiter {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private minDelay = 100; // Minimum 100ms between requests
  private backoffMultiplier = 2;
  private currentBackoff = 0;
  private maxBackoff = 10000; // Max 10 seconds backoff
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 3;

  /**
   * Execute a request with rate limiting
   */
  async execute<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await request();
          this.onSuccess();
          resolve(result);
        } catch (error: any) {
          const isRateLimited = this.isRateLimitError(error);
          if (isRateLimited) {
            this.onRateLimitError();
            // Retry after backoff
            setTimeout(() => {
              this.execute(request).then(resolve).catch(reject);
            }, this.currentBackoff);
          } else {
            this.onError();
            reject(error);
          }
        }
      });

      this.processQueue();
    });
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code;
    
    return (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('rate limited') ||
      errorCode === -32005 ||
      errorCode === 429 ||
      error?.data?.httpStatus === 429
    );
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.consecutiveErrors = 0;
    // Gradually reduce backoff on success
    if (this.currentBackoff > this.minDelay) {
      this.currentBackoff = Math.max(this.minDelay, this.currentBackoff / this.backoffMultiplier);
    }
  }

  /**
   * Handle rate limit error
   */
  private onRateLimitError(): void {
    this.consecutiveErrors++;
    // Exponential backoff
    this.currentBackoff = Math.min(
      this.maxBackoff,
      this.minDelay * Math.pow(this.backoffMultiplier, this.consecutiveErrors)
    );
    console.warn(`[RateLimiter] Rate limited. Backing off for ${this.currentBackoff}ms`);
  }

  /**
   * Handle other errors
   */
  private onError(): void {
    // Reset on non-rate-limit errors
    if (this.consecutiveErrors > 0) {
      this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
    }
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    if (this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      // Wait for minimum delay
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const delay = Math.max(0, this.minDelay - timeSinceLastRequest);
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Add backoff delay if we have one
      if (this.currentBackoff > 0) {
        await new Promise(resolve => setTimeout(resolve, this.currentBackoff));
      }

      this.lastRequestTime = Date.now();
      await request();
    }

    this.isProcessing = false;
  }

  /**
   * Clear the queue and reset state
   */
  reset(): void {
    this.requestQueue = [];
    this.currentBackoff = 0;
    this.consecutiveErrors = 0;
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

