import { NextResponse } from 'next/server';

// The mobile app talks to /api/** from two very different contexts: a
// native build (iOS/Android), where the browser's CORS rules simply don't
// apply, and Expo Web / any browser-based client, where they do. This app
// had zero CORS handling until now — fine for native, but any /api/** call
// from a browser origin (Expo's web dev server, say) gets silently blocked
// before it ever reaches a route handler ("Failed to fetch", no server log
// at all). This adds the headers every browser client needs, and answers
// the OPTIONS preflight browsers send ahead of any request carrying a
// custom header (our `Authorization: Bearer <token>`) or a JSON body.
//
// `*` (not a specific origin) is fine here because the app never sends
// cookies/credentials cross-origin for these calls — auth is a Bearer token
// in the Authorization header, not a cookie the browser attaches
// automatically, so there's no session to leak to another origin.
export function middleware(request) {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  applyCorsHeaders(response);
  return response;
}

function applyCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export const config = {
  matcher: '/api/:path*',
};
