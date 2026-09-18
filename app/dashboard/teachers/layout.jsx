import { blockIfTeacher } from '@/lib/roleGuard';

export default async function TeachersLayout({ children }) {
  await blockIfTeacher();
  return children;
}
