import { SignJWT, jwtVerify } from 'jose';

const encodedSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set.');
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
};

const SESSION_DURATION = '7d';

// `payload` is whatever a route wants embedded (role + the id(s) needed to
// re-look-up that user) — verifySessionToken() hands it back verbatim, it is
// never re-derived from the DB on every request.
export async function signSessionToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(encodedSecret());
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, encodedSecret());
    return payload;
  } catch {
    return null;
  }
}
