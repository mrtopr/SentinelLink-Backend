/**
 * Earth's radius in meters (mean radius)
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance between two geographic coordinates using the Haversine formula
 * 
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @returns Distance in meters
 * 
 * @see https://en.wikipedia.org/wiki/Haversine_formula
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c;
}

/**
 * Check if two coordinates are within a specified distance
 * 
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @param maxDistanceMeters - Maximum allowed distance in meters
 * @returns true if points are within the specified distance
 */
export function isWithinDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    maxDistanceMeters: number
): boolean {
    return calculateDistance(lat1, lon1, lat2, lon2) <= maxDistanceMeters;
}
