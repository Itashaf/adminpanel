import { notFound } from 'next/navigation';
import TeacherProfileHeader from '@/components/teachers/TeacherProfileHeader';
import TeacherOverviewCards from '@/components/teachers/TeacherOverviewCards';
import TeacherProfileTabs from '@/components/teachers/TeacherProfileTabs';
import { getTeacherById } from '@/lib/teachers';
import { getClassOptions } from '@/lib/students';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const teacher = await getTeacherById(id, await resolveSchoolId());
  return { title: teacher ? `${teacher.firstName} ${teacher.lastName} | SchoolApp 360` : 'Teacher | SchoolApp 360' };
}

export default async function TeacherProfilePage({ params }) {
  const { id } = await params;
  const schoolId = await resolveSchoolId();
  const [teacher, classOptions] = await Promise.all([getTeacherById(id, schoolId), getClassOptions()]);

  if (!teacher) notFound();

  return (
    <div className="space-y-6">
      <TeacherProfileHeader teacher={teacher} />
      <TeacherOverviewCards teacher={teacher} />
      <TeacherProfileTabs teacher={teacher} classOptions={classOptions} />
    </div>
  );
}
