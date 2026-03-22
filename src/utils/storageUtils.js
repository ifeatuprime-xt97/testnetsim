/**
 * storageUtils.js
 * Handles reading and writing simulation runs to browser localStorage.
 */

const STORAGE_KEY = 'testnetsim_history';
const MAX_SESSIONS = 15; // Rolling window limit to prevent QuotaExceeded errors

/**
 * Saves a completed simulation session to localStorage.
 * Keeps only the most recent MAX_SESSIONS.
 */
export function saveSession(results, stats, config, network, tokenAddress) {
    try {
        const existing = getSessions();

        const newSession = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            network,
            tokenAddress: tokenAddress || 'Unknown',
            config,
            stats,
            results,
        };

        // Add to front of array
        const updated = [newSession, ...existing];

        // Slice to enforce quota
        if (updated.length > MAX_SESSIONS) {
            updated.length = MAX_SESSIONS;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return newSession.id;
    } catch (err) {
        console.warn('[TestnetSim] Failed to save session to localStorage', err);
        return null; // Silent catch, likely QuotaExceededError indicating payload is too large
    }
}

/**
 * Retrieves all saved simulation sessions, sorted newest first.
 */
export function getSessions() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.warn('[TestnetSim] Failed to parse session history', err);
        return [];
    }
}

/**
 * Deletes a session by ID or deletes all sessions if no ID is provided.
 */
export function deleteSession(id) {
    try {
        if (!id) {
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }

        const existing = getSessions();
        const filtered = existing.filter(session => session.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return filtered;
    } catch (err) {
        console.warn('[TestnetSim] Failed to delete session history', err);
        return getSessions();
    }
}
