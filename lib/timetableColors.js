// Deterministic color per subject — cycles through this palette by the
// subject's position in the master Subjects list (see
// lib/hooks/useSubjects.js), so the same subject always gets the same color
// within a session without needing to store a color on the Subject row
// itself.
const PALETTE = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
  { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100' },
  { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100' },
  { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-100' },
  { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-100' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
];

export function subjectColor(subject, subjectList) {
  const index = Math.max(0, subjectList.indexOf(subject));
  return PALETTE[index % PALETTE.length];
}

// "English" -> "EN", "Social Science" -> "SS", "Computer Applications" -> "CA".
export function subjectInitials(subject) {
  if (!subject) return '';
  const words = subject.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return subject.slice(0, 2).toUpperCase();
}
