import { blockIfTeacher } from '@/lib/roleGuard';

export default async function SessionsLayout({ children }) {
  await blockIfTeacher();
  return children;
}
