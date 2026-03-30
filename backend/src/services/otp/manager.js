/**
 * OTP Provider Manager
 *
 * Orchestrates OTP delivery across multiple providers with:
 *   - Primary provider (Authentica) with automatic fallback (Twilio)
 *   - Retry logic with exponential backoff
 *   - Circuit breaker pattern for persistent failures
 *   - Provider health tracking and logging
 *   - Verification routing (tracks which provider sent the OTP)
 *
 * Architecture:
 *   sendOTP()   → try primary → retry once → fallback to secondary
 *   verifyOTP() → try provider that sent the OTP → fallback to other
 */

const AuthenticaProvider = require('./authenticaProvider');
const TwilioProvider = require('./twilioProvider');

// ── Circuit Breaker State ──────────────────────────────────────────
// Tracks failures per provider to avoid repeatedly hitting a dead provider
const circuitState = new Map(); // provider name → { failures, lastFailure, open }

const CIRCUIT_FAILURE_THRESHOLD = 3;   // Open circuit after N consecutive failures
const CIRCUIT_RESET_MS = 2 * 60 * 1000; // Try again after 2 minutes

// ── Provider Tracking ──────────────────────────────────────────────
// Tracks which provider was used to send OTP (for verification routing)
// phone → { provider, timestamp }
const providerTracker = new Map();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of providerTracker) {
    if (now - val.timestamp > 10 * 60 * 1000) providerTracker.delete(key);
  }
}, 10 * 60 * 1000).unref();

// ── Health Metrics ─────────────────────────────────────────────────
const metrics = {
  sent: { authentica: 0, twilio: 0 },
  verified: { authentica: 0, twilio: 0 },
  failures: { authentica: 0, twilio: 0 },
  fallbacks: 0,
};

class OTPManager {
  constructor() {
    this.providers = [];
    this.providerMap = {};

    // Initialize providers based on available configuration
    const authentica = new AuthenticaProvider();
    const twilio = new TwilioProvider();

    if (authentica.isConfigured()) {
      this.providers.push(authentica);
      this.providerMap.authentica = authentica;
      console.log('[OTP] ✓ Authentica provider configured (primary)');
    } else {
      console.warn('[OTP] ✗ Authentica not configured — AUTHENTICA_API_KEY missing');
    }

    if (twilio.isConfigured()) {
      this.providers.push(twilio);
      this.providerMap.twilio = twilio;
      console.log('[OTP] ✓ Twilio Verify provider configured (fallback)');
    } else {
      console.warn('[OTP] ✗ Twilio Verify not configured — missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_VERIFY_SERVICE_SID');
    }

    if (this.providers.length === 0) {
      console.error('[OTP] ✗ NO OTP providers configured! OTP delivery will fail.');
    }
  }

  /**
   * Check if a provider's circuit breaker is open (too many recent failures)
   */
  _isCircuitOpen(providerName) {
    const state = circuitState.get(providerName);
    if (!state || !state.open) return false;

    // Check if enough time has passed to try again (half-open)
    if (Date.now() - state.lastFailure > CIRCUIT_RESET_MS) {
      state.open = false;
      state.failures = 0;
      console.log(`[OTP] Circuit breaker RESET for ${providerName} — retrying`);
      return false;
    }

    return true;
  }

  /**
   * Record a provider failure for circuit breaker
   */
  _recordFailure(providerName, error) {
    const state = circuitState.get(providerName) || { failures: 0, lastFailure: 0, open: false };
    state.failures += 1;
    state.lastFailure = Date.now();

    if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) {
      state.open = true;
      console.warn(`[OTP] Circuit breaker OPEN for ${providerName} after ${state.failures} consecutive failures`);
    }

    circuitState.set(providerName, state);
    metrics.failures[providerName] = (metrics.failures[providerName] || 0) + 1;
  }

  /**
   * Record a provider success (resets circuit breaker)
   */
  _recordSuccess(providerName) {
    circuitState.set(providerName, { failures: 0, lastFailure: 0, open: false });
  }

  /**
   * Determine if an error is retryable
   */
  _isRetryable(error) {
    // Retryable: 5xx server errors, network errors, timeouts
    if (error.status && error.status >= 500) return true;
    if (error.name === 'AbortError') return true; // timeout
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') return true;
    if (error.message && (
      error.message.includes('fetch failed') ||
      error.message.includes('network') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('certificate') ||
      error.message.includes('socket hang up')
    )) return true;
    return false;
  }

  /**
   * Attempt OTP send with a single provider, with one retry
   */
  async _trySendWithRetry(provider, phone, countryCode, options, maxRetries = 1) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`[OTP] Retrying ${provider.name} (attempt ${attempt + 1}) after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await provider.sendOTP(phone, countryCode, options);
        this._recordSuccess(provider.name);
        metrics.sent[provider.name] = (metrics.sent[provider.name] || 0) + 1;
        return result;
      } catch (error) {
        lastError = error;
        console.error(`[OTP] ${provider.name} send failed (attempt ${attempt + 1}):`, error.message);

        // Don't retry non-retryable errors (4xx, validation errors)
        if (!this._isRetryable(error)) {
          throw error;
        }
      }
    }

    this._recordFailure(provider.name, lastError);
    throw lastError;
  }

  /**
   * Send OTP with automatic provider fallback
   *
   * Flow:
   *   1. Try primary provider (with 1 retry)
   *   2. If primary fails with retryable error → try fallback provider
   *   3. Track which provider was used (for verification routing)
   *
   * @param {string} phone - Phone without country code
   * @param {string} countryCode - e.g. "+966"
   * @param {object} options - { method, lang }
   * @returns {Promise<{success, message, provider, expiresIn, resendCooldown}>}
   */
  async sendOTP(phone, countryCode = '+966', options = {}) {
    if (this.providers.length === 0) {
      throw new Error('No OTP providers configured');
    }

    const errors = [];
    const trackingKey = `${countryCode}${phone}`;

    // Build ordered provider list: skip providers with open circuits
    const orderedProviders = this.providers.filter(p => {
      if (this._isCircuitOpen(p.name)) {
        console.log(`[OTP] Skipping ${p.name} — circuit breaker is open`);
        return false;
      }
      return true;
    });

    // If all circuits are open, try them anyway (last resort)
    const candidates = orderedProviders.length > 0 ? orderedProviders : this.providers;

    for (let i = 0; i < candidates.length; i++) {
      const provider = candidates[i];
      const isFallback = i > 0;

      if (isFallback) {
        console.log(`[OTP] Falling back to ${provider.name}...`);
        metrics.fallbacks++;
      }

      try {
        const result = await this._trySendWithRetry(provider, phone, countryCode, options);

        // Track which provider sent the OTP
        providerTracker.set(trackingKey, {
          provider: provider.name,
          timestamp: Date.now(),
        });

        if (isFallback) {
          console.log(`[OTP] Fallback to ${provider.name} succeeded`);
        }

        return {
          ...result,
          expiresIn: 300,       // 5 minutes
          resendCooldown: 30,   // 30 seconds
        };
      } catch (error) {
        errors.push({ provider: provider.name, error });

        // If error is NOT retryable (e.g. 400 bad request), don't try fallback
        if (!this._isRetryable(error)) {
          throw error;
        }
      }
    }

    // All providers failed
    const errorSummary = errors.map(e => `${e.provider}: ${e.error.message}`).join('; ');
    console.error(`[OTP] All providers failed for ${trackingKey}: ${errorSummary}`);
    throw new Error(`Failed to send OTP: ${errors[errors.length - 1]?.error.message || 'All providers unavailable'}`);
  }

  /**
   * Verify OTP — routes to the provider that sent it
   *
   * @param {string} phone
   * @param {string} countryCode
   * @param {string} otp
   * @returns {Promise<{valid: boolean, message: string, provider: string}>}
   */
  async verifyOTP(phone, countryCode = '+966', otp) {
    const trackingKey = `${countryCode}${phone}`;
    const tracked = providerTracker.get(trackingKey);

    // Determine provider order for verification
    let verifyOrder;
    if (tracked && this.providerMap[tracked.provider]) {
      // Try the provider that sent the OTP first
      verifyOrder = [
        this.providerMap[tracked.provider],
        ...this.providers.filter(p => p.name !== tracked.provider),
      ];
    } else {
      // Unknown — try all providers in order
      verifyOrder = [...this.providers];
    }

    let lastError;

    for (const provider of verifyOrder) {
      try {
        const result = await provider.verifyOTP(phone, countryCode, otp);

        if (result.valid) {
          metrics.verified[provider.name] = (metrics.verified[provider.name] || 0) + 1;
          providerTracker.delete(trackingKey); // Clean up tracking
        }

        return result;
      } catch (error) {
        console.error(`[OTP] ${provider.name} verify failed:`, error.message);
        lastError = error;
        // Try next provider
      }
    }

    // If all providers fail to verify, return invalid (don't throw)
    return {
      valid: false,
      message: lastError?.message || 'OTP verification failed',
      provider: 'none',
    };
  }

  /**
   * Get health/status info for monitoring
   */
  getHealth() {
    const providerHealth = {};
    for (const provider of this.providers) {
      const circuit = circuitState.get(provider.name) || { failures: 0, open: false };
      providerHealth[provider.name] = {
        configured: provider.isConfigured(),
        circuitOpen: circuit.open,
        consecutiveFailures: circuit.failures,
      };
    }

    return {
      providers: providerHealth,
      metrics: { ...metrics },
      activeProviders: this.providers.filter(p => !this._isCircuitOpen(p.name)).map(p => p.name),
    };
  }
}

// Singleton instance
const otpManager = new OTPManager();

module.exports = otpManager;
