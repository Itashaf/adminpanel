import { notFound } from 'next/navigation';
import SectionDetailsHeader from '@/components/classes/SectionDetailsHeader';
import SectionOverviewCard from '@/components/classes/SectionOverviewCard';
import SectionStudentPreview from '@/components/classes/SectionStudentPreview';
import { getSectionDetail } from '@/lib/classes';

export async function generateMetadata({ params }) {
  const { id, sectionId } = await params;
  const detail = await getSectionDetail(id, sectionId);
  return {
    title: detail ? `${detail.class.name} · Section ${detail.section.name} | SchoolApp 360` : 'Section | SchoolApp 360',
  };
}

export default async function SectionDetailsPage({ params }) {
  const { id, sectionId } = await params;
  const detail = await getSectionDetail(id, sectionId);

  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <SectionDetailsHeader classInfo={detail.class} section={detail.section} />
      <SectionOverviewCard classInfo={detail.class} section={detail.section} />
      <SectionStudentPreview classInfo={detail.class} section={detail.section} students={detail.studentPreview} />
    </div>
  );
}
