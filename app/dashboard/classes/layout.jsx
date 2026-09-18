import { blockIfTeacher } from '@/lib/roleGuard';

export default async function ClassesLayout({ children }) {
  await blockIfTeacher();
  return children;
}
