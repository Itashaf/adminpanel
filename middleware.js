import { NextResponse } from 'next/server';
import { verifySessionToken } from './lib/auth/jwt';

// `jose`-based (not next/headers) — safe to call directly from middleware's
// edge runtime, unlike lib/auth/session.js's getSession() which needs the
// cookies()/headers() helpers only available inside a route/page.
const SESSION_COOKIE = 'edumanage_session';

// Sign-in screens — a visitor who already has a valid session gets bounced
// to their own area instead of seeing a login form again.
const GUEST_ONLY_PATHS = ['/', '/login', '/forgot-password'];

function homePathFor(role) {
  if (role === 'SuperAdmin') return '/super-admin/schools';
  if (role === 'Parent') return '/parent';
  return '/dashboard'; // SchoolAdmin, Teacher
}

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
function handleApiRequest(request) {
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

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    return handleApiRequest(request);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (GUEST_ONLY_PATHS.includes(pathname)) {
    if (session?.role) {
      return NextResponse.redirect(new URL(homePathFor(session.role), request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/super-admin')) {
    if (session?.role !== 'SuperAdmin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    // A Super Admin who has "stepped into" a school (see
    // app/api/schools/[id]/manage/route.js's setActiveSchoolContext +
    // setCurrentRole) keeps their real SuperAdmin session cookie — only
    // lib/currentUser.js's in-memory dashboard-role toggle changes — so
    // SuperAdmin must stay allowed here alongside SchoolAdmin/Teacher.
    if (!['SchoolAdmin', 'Teacher', 'SuperAdmin'].includes(session?.role)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/parent')) {
    // Already enforced in app/parent/layout.jsx too — this just fails fast,
    // before that layout's DB reads ever run, for an outright-unauthenticated
    // hit (a stale bookmark, a shared link, ...).
    if (session?.role !== 'Parent') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/super-admin/:path*', '/parent/:path*', '/', '/login', '/forgot-password'],
};
