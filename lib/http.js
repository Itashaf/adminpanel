// Small helpers shared by the API routes.

// Reads a request's JSON body. A missing or malformed body used to throw out of
// the route handler as an uncaught error (an HTTP 500 with a stack trace in the
// logs); now it comes back as an empty object, so each route's own "missing
// required fields" check answers with a clean 400.
export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

// Plain-value checks the money / bulk routes use before touching the database.
export const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

export function isIdList(value, max = 500) {
  return Array.isArray(value) && value.length > 0 && value.length <= max && value.every(isNonEmptyString);
}
