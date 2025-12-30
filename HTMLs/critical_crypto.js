/**
 * CRITICAL JUNCTURE OPERATIONS // CRYPTO CORE (v65.60)
 * Native Web Crypto implementation for client-side E2EE.
 * PBKDF2 Key Derivation + AES-GCM Encryption.
 */

const CriticalCrypto = {
    /**
     * Derives a cryptographic key from a password and salt.
     * @param {string} password - The user's PIN or passphrase.
     * @param {string} salt - A unique string (like Class Code).
     * @returns {Promise<CryptoKey>}
     */
    async deriveKey(password, salt) {
        const enc = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            "PBKDF2",
            false,
            ["deriveKey"]
        );

        return await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: enc.encode(salt),
                iterations: 100000,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    },

    /**
     * Encrypts a string using a CryptoKey.
     * @param {string} plaintext - Content to protect.
     * @param {CryptoKey} key - The derived AES key.
     * @returns {Promise<string>} Base64 encoded payload: IV:Ciphertext
     */
    async encrypt(plaintext, key) {
        const enc = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const cipherBuffer = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(plaintext)
        );

        const ivBase64 = btoa(String.fromCharCode(...iv));
        const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));

        return `${ivBase64}:${cipherBase64}`;
    },

    /**
     * Decrypts a base64 payload.
     * @param {string} payload - "IV:Ciphertext" string.
     * @param {CryptoKey} key - The derived AES key.
     * @returns {Promise<string>} Plaintext content.
     */
    async decrypt(payload, key) {
        try {
            const [ivBase64, cipherBase64] = payload.split(':');
            const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
            const ciphertext = new Uint8Array(atob(cipherBase64).split('').map(c => c.charCodeAt(0)));

            const decBuffer = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );

            return new TextDecoder().decode(decBuffer);
        } catch (e) {
            console.error("DECRYPTION_FAILURE: Incorrect key or corrupted payload.");
            throw e;
        }
    }
};
