import { notFound } from 'next/navigation';
import ClassDetailsClient from '@/components/classes/ClassDetailsClient';
import { getClassById, getActiveTeacherOptions } from '@/lib/classes';
import { blockIfAccountant } from '@/lib/roleGuard';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const cls = await getClassById(id);
  return { title: cls ? `${cls.name} | SchoolApp 360` : 'Class | SchoolApp 360' };
}

export default async function ClassDetailsPage({ params }) {
  await blockIfAccountant();
  const { id } = await params;
  const [cls, teacherOptions] = await Promise.all([getClassById(id), getActiveTeacherOptions()]);

  if (!cls) notFound();

  return <ClassDetailsClient cls={cls} teacherOptions={teacherOptions} />;
}
