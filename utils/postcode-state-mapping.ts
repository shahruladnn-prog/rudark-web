/**
 * Malaysia Postcode to State Mapping
 * Based on official Malaysia postcode ranges
 */

export interface StateInfo {
    name: string;
    code: string;
}

/**
 * Get Malaysian state from postcode
 * @param postcode - 5-digit Malaysian postcode
 * @returns State name or 'Unknown' if invalid
 */
export function getStateFromPostcode(postcode: string): string {
    // Clean and validate postcode
    const cleanPostcode = postcode.replace(/\s/g, '');
    if (!/^\d{5}$/.test(cleanPostcode)) {
        return 'Unknown';
    }

    // Extract first 2 digits for state identification
    const prefix = parseInt(cleanPostcode.substring(0, 2));

    // Malaysia postcode ranges by state
    // Source: Pos Malaysia official postcode directory

    // Perlis
    if (prefix >= 1 && prefix <= 2) return 'Perlis';

    // Kedah
    if (prefix >= 5 && prefix <= 9) return 'Kedah';
    if (prefix >= 34 && prefix <= 36) return 'Kedah';

    // Penang
    if (prefix >= 10 && prefix <= 14) return 'Pulau Pinang';

    // Perak
    if (prefix >= 30 && prefix <= 36) return 'Perak';

    // Selangor
    if (prefix >= 40 && prefix <= 48) return 'Selangor';
    if (prefix >= 63 && prefix <= 68) return 'Selangor';

    // Kuala Lumpur
    if (prefix >= 50 && prefix <= 60) return 'Kuala Lumpur';

    // Putrajaya
    if (prefix === 62) return 'Putrajaya';

    // Negeri Sembilan
    if (prefix >= 70 && prefix <= 73) return 'Negeri Sembilan';

    // Melaka
    if (prefix >= 75 && prefix <= 78) return 'Melaka';

    // Johor
    if (prefix >= 79 && prefix <= 82) return 'Johor';
    if (prefix >= 83 && prefix <= 86) return 'Johor';

    // Pahang
    if (prefix >= 25 && prefix <= 28) return 'Pahang';
    if (prefix >= 39 && prefix <= 39) return 'Pahang';
    if (prefix >= 49 && prefix <= 49) return 'Pahang';
    if (prefix >= 69 && prefix <= 69) return 'Pahang';

    // Terengganu
    if (prefix >= 20 && prefix <= 24) return 'Terengganu';

    // Kelantan
    if (prefix >= 15 && prefix <= 19) return 'Kelantan';

    // Sabah
    if (prefix >= 87 && prefix <= 91) return 'Sabah';

    // Sarawak
    if (prefix >= 93 && prefix <= 98) return 'Sarawak';

    // Labuan
    if (prefix === 87) return 'Labuan';

    return 'Unknown';
}

/**
 * Validate if postcode is valid Malaysian format
 */
export function isValidMalaysianPostcode(postcode: string): boolean {
    const cleanPostcode = postcode.replace(/\s/g, '');
    return /^\d{5}$/.test(cleanPostcode);
}

/**
 * Test cases for verification
 */
export const TEST_POSTCODES = {
    '31600': 'Perak',      // Your location
    '40150': 'Selangor',   // Sender location
    '50000': 'Kuala Lumpur',
    '10000': 'Pulau Pinang',
    '80000': 'Johor',
    '93000': 'Sarawak',
    '88000': 'Sabah',
    '00000': 'Unknown',    // Invalid
    'ABCDE': 'Unknown'     // Invalid
};
