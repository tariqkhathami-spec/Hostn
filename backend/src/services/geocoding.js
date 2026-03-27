/**
 * Geocoding service — abstracted provider layer.
 * Currently uses Google Maps Geocoding API.
 * Swap the implementation to Mapbox/OSM without changing callers.
 */

const GOOGLE_MAPS_SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Check if geocoding is available (API key configured).
 */
function isAvailable() {
  return Boolean(GOOGLE_MAPS_SERVER_KEY);
}

/**
 * Geocode an address string to coordinates.
 * @param {string} address - Human-readable address
 * @returns {Promise<{ lat: number; lng: number; formattedAddress: string } | null>}
 */
async function geocodeAddress(address) {
  if (!GOOGLE_MAPS_SERVER_KEY) {
    console.warn('[Geocoding] No GOOGLE_MAPS_SERVER_KEY set — skipping geocode');
    return null;
  }

  try {
    const params = new URLSearchParams({
      address,
      key: GOOGLE_MAPS_SERVER_KEY,
      region: 'sa',
      language: 'en',
    });
    const resp = await fetch(`${GEOCODE_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return null;
    }

    const result = data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (err) {
    console.error('[Geocoding] geocodeAddress failed:', err.message);
    return null;
  }
}

/**
 * Reverse geocode coordinates to an address.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ city: string; district: string; address: string } | null>}
 */
async function reverseGeocode(lat, lng) {
  if (!GOOGLE_MAPS_SERVER_KEY) {
    console.warn('[Geocoding] No GOOGLE_MAPS_SERVER_KEY set — skipping reverse geocode');
    return null;
  }

  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: GOOGLE_MAPS_SERVER_KEY,
      language: 'en',
    });
    const resp = await fetch(`${GEOCODE_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return null;
    }

    const result = data.results[0];
    const components = result.address_components || [];

    let city = '';
    let district = '';

    for (const c of components) {
      if (c.types.includes('locality')) city = c.long_name;
      if (c.types.includes('sublocality') || c.types.includes('sublocality_level_1')) district = c.long_name;
      if (!city && c.types.includes('administrative_area_level_1')) city = c.long_name;
    }

    return {
      city,
      district,
      address: result.formatted_address,
    };
  } catch (err) {
    console.error('[Geocoding] reverseGeocode failed:', err.message);
    return null;
  }
}

module.exports = { isAvailable, geocodeAddress, reverseGeocode };
