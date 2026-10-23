import { verifyPassword } from './password';

export const AMBIGUOUS_LOGIN_MESSAGE =
  'This email is used by more than one school, so we cannot tell which account to sign you in to. Please contact support.';

// Teacher, Parent and Principal/Accountant emails are only unique per school (or
// not at all), so "find the first account with this email" could sign someone in
// to a different school's account, or lock them out of their own. This checks the
// password against EVERY account with that email and accepts only when exactly one
// matches.
//   { account }   exactly one account matches the password
//   { ambiguous } more than one account matches (same email AND same password)
//   {}            none matches
export async function pickAccountByPassword(rows, password, getHash) {
  const matches = [];
  for (const row of rows) {
    const hash = getHash(row);
    if (hash && (await verifyPassword(password, hash))) matches.push(row);
  }
  if (matches.length === 1) return { account: matches[0] };
  if (matches.length > 1) return { ambiguous: true };
  return {};
}
