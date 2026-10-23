'use client';

import { useEffect, useState } from 'react';
import { getClassSectionsMap } from '@/lib/api';

// Fetches the real, per-school class→sections map once per mount — see
// lib/classes.js's getClassSectionsMap for what it contains and why this
// replaced the old hardcoded lib/students.js CLASS_SECTIONS constant
// (section count per class is now the admin's own choice, not fixed).
// Every component that used to `import { CLASS_SECTIONS } from
// '@/lib/students'` calls this instead.
// `academicSession` is optional — omit it for the old cross-session union
// (every form that lets an admin pick any section a class has ever had).
// Pass it when the picker's choice must be valid for ONE specific session
// (e.g. PromoteStudentsExplorer.jsx's "Promote To" section, which must
// exist for the target session, not just some past one).
export function useClassSections(academicSession) {
  const [classSections, setClassSections] = useState({});

  useEffect(() => {
    let cancelled = false;
    getClassSectionsMap(academicSession)
      .then((map) => {
        if (!cancelled) setClassSections(map);
      })
      .catch(() => {
        // A failed fetch just leaves every class looking section-less
        // (empty options, section field disabled) rather than blocking the
        // whole form — same fallback as a class with no sections at all.
      });
    return () => {
      cancelled = true;
    };
  }, [academicSession]);

  return classSections;
}

// `classSections` → Dropdown-ready { value, label } options for one class.
export function getSectionOptions(classSections, className) {
  return (classSections[className] || []).map((section) => ({ value: section, label: `Section ${section}` }));
}

export function classHasSections(classSections, className) {
  return (classSections[className] || []).length > 0;
}
