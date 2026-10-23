import FeeStructuresExplorer from '@/components/fees/FeeStructuresExplorer';
import { getFeeStructures } from '@/lib/fees';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getClassOptions } from '@/lib/students';
import { blockIfTeacher } from '@/lib/roleGuard';

export const metadata = {
  title: 'Fee Structures | SchoolApp 360',
};

export default async function FeeStructuresPage() {
  await blockIfTeacher();
  const [structures, sessions, activeSession, classOptions] = await Promise.all([
    getFeeStructures(),
    getAllSessions(),
    getActiveSession(),
    getClassOptions(),
  ]);

  const sessionOptions = sessions.map((s) => ({ value: s.name, label: s.name }));

  return (
    <FeeStructuresExplorer
      structures={structures}
      sessionOptions={sessionOptions}
      classOptions={classOptions}
      defaultSession={activeSession?.name || sessionOptions[0]?.value || ''}
    />
  );
}
