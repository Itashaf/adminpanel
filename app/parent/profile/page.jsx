import { redirect } from 'next/navigation';
import { FiUser, FiLayers } from 'react-icons/fi';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import InfoCard from '@/components/students/InfoCard';

export const metadata = {
  title: 'My Child | SchoolApp 360 Parent Portal',
};

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Only what a parent would actually reference — current class placement and
// the basics that matter day-to-day (blood group for an emergency, DOB for
// permission slips/age checks). Previous-school history, guardian contact
// details, emergency contacts, and address are all either administrative
// record-keeping or literally the parent's own info reflected back at
// them — dropped, not just re-tabbed, since none of it is something a
// parent needs *from* this page.
export default async function ParentProfilePage() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {student.firstName} {student.lastName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{student.admissionId}</p>
      </div>

      <InfoCard
        title="Academic Record"
        subtitle="Current class placement and enrollment status."
        icon={FiLayers}
        fields={[
          { label: 'Academic Session', value: student.academicSession },
          { label: 'Class', value: student.class },
          { label: 'Section', value: student.section },
          { label: 'Admission Date', value: formatDate(student.admissionDate) },
          { label: 'Status', value: student.status },
        ]}
      />

      <InfoCard
        title="Personal Information"
        subtitle="Basic identity details."
        icon={FiUser}
        fields={[
          { label: 'Date of Birth', value: formatDate(student.dob) },
          { label: 'Gender', value: student.gender },
          { label: 'Blood Group', value: student.bloodGroup },
        ]}
      />
    </div>
  );
}
