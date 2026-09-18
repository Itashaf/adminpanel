import { blockIfTeacher } from '@/lib/roleGuard';

export default async function AcademicsLayout({ children }) {
  await blockIfTeacher();
  return children;
}
