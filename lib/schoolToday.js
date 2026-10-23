// "Today" as a YYYY-MM-DD string in the SCHOOL'S time zone.
//
// The server (Vercel) runs on UTC. For a school in India, between 00:00 and 05:30
// local time the server still thinks it is the previous day, so "mark today's
// attendance", the exam "upcoming / ongoing" lists, the fee-term start check and
// the staff check-in all used yesterday's date. Reading the date in the school's
// zone fixes that. Every school defaults to Asia/Kolkata (School.timezone's own
// default); set SCHOOL_TIMEZONE to change it for the whole app.
//
// Pure Intl: no database or server-only imports, safe to import anywhere.
const DEFAULT_TIMEZONE = process.env.SCHOOL_TIMEZONE || 'Asia/Kolkata';

export function todayInSchoolTz(now = new Date(), timeZone = DEFAULT_TIMEZONE) {
  // The 'en-CA' locale formats a date as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
