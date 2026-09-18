'use client';

import { useEffect, useState } from 'react';
import { getSubjects } from '@/lib/api';

// Fetches the real, per-school master Subject list once per mount — see
// lib/subjects.js. Every component that used to `import { SUBJECT_OPTIONS }
// from '@/lib/classConstants'` calls this instead, so subjects added/renamed/
// removed on the Academics > Subjects screen show up everywhere immediately.
export function useSubjects() {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getSubjects()
      .then((rows) => {
        if (!cancelled) setSubjects(rows.map((s) => s.name));
      })
      .catch(() => {
        // A failed fetch just leaves every subject picker empty rather than
        // blocking the whole form — same fallback as useClassSections.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return subjects;
}

// Same fetch, but as the full rows ({id, name, code, type}) rather than just
// names — for pickers that also show the code/type (e.g. the Timetable's
// "+ Add" subject popover).
export function useSubjectRows() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getSubjects()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return rows;
}

// Same fetch, but keyed as { [subjectName]: code } — for the Print
// Marksheet's abbreviated table headers, which used to read the hardcoded
// SUBJECT_ABBREVIATIONS map in lib/classConstants.js. Falls back to the full
// name when a subject has no code set, same as the old subjectAbbreviation()
// helper's fallback.
export function useSubjectCodes() {
  const [codes, setCodes] = useState({});

  useEffect(() => {
    let cancelled = false;
    getSubjects()
      .then((rows) => {
        if (!cancelled) setCodes(Object.fromEntries(rows.map((s) => [s.name, s.code || s.name])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return codes;
}
