import { FiMapPin, FiPhoneCall, FiUser } from 'react-icons/fi';
import Badge from '@/components/Badge';

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function FieldGrid({ fields, columns = 'sm:grid-cols-4' }) {
  return (
    <dl className={`grid grid-cols-2 ${columns} gap-3`}>
      {fields.map(({ label, value }) => (
        <div key={label} className="rounded-xl bg-gray-50 px-4 py-3 min-w-0">
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
          <dd className="text-sm font-semibold text-gray-900 mt-1 break-words">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function GroupCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <p className="text-base font-bold text-gray-900">{title}</p>
      </div>
      {children}
    </div>
  );
}

function parentFields(parent) {
  return [
    { label: 'Full Name', value: parent?.fullName },
    { label: 'Phone', value: parent?.phone },
    { label: 'Email', value: parent?.email },
    { label: 'Occupation', value: parent?.occupation },
  ];
}

function contactLabel(contact) {
  if (!contact?.name) return '';
  return contact.relationship ? `${contact.name} (${contact.relationship})` : contact.name;
}

// What a parent would actually reference — class placement, the basics that
// matter day-to-day, and the contact details the school holds on file.
// Aadhaar, previous-school history and fee discounts are administrative
// record-keeping, so they're not shown here.
export default function ParentProfileView({ student }) {
  const basics = [
    { label: 'Academic Session', value: student.academicSession },
    { label: 'Class', value: student.class },
    { label: 'Section', value: student.section },
    { label: 'Admission Date', value: formatDate(student.admissionDate) },
    { label: 'Date of Birth', value: formatDate(student.dob) },
    { label: 'Gender', value: student.gender },
    { label: 'Blood Group', value: student.bloodGroup },
    { label: 'WhatsApp Number', value: student.whatsappNumber },
    { label: 'Status', value: student.status },
  ];

  const address = student.address;
  const addressFields = [
    { label: 'Address', value: [address?.line1, address?.line2].filter(Boolean).join(', ') },
    { label: 'City', value: address?.city },
    { label: 'State', value: address?.state },
    { label: 'PIN Code', value: address?.pinCode },
  ];

  const contacts = student.emergencyContacts;
  // Only the contacts that were actually filled in — a school may have just
  // one on file, and empty tiles would only add noise.
  const emergencyFields = [
    { label: 'Primary Contact', value: contactLabel(contacts?.primary) },
    { label: 'Primary Phone', value: contacts?.primary?.phone },
    { label: 'Secondary Contact', value: contactLabel(contacts?.secondary) },
    { label: 'Secondary Phone', value: contacts?.secondary?.phone },
    { label: 'Trusted Relative Phone', value: contacts?.trustedRelativePhone },
  ].filter((field) => field.value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-base text-gray-500 mt-1.5">Your child&apos;s school record at a glance.</p>
      </div>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 text-center sm:text-left">
          {student.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.photoUrl} alt={`${student.firstName} ${student.lastName}`} className="w-16 h-16 rounded-full object-cover shrink-0" />
          ) : (
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 text-white text-xl font-semibold shrink-0">
              {student.initials}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {student.firstName} {student.lastName}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {student.class}
              {student.section ? ` - ${student.section}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge label={`Admission No. ${student.admissionId}`} variant="violet" />
            <Badge label={student.status} variant={student.status === 'Active' ? 'green' : 'gray'} />
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100">
          <FieldGrid fields={basics} columns="sm:grid-cols-3" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GroupCard icon={FiUser} title="Father Details">
          <FieldGrid fields={parentFields(student.guardian)} columns="sm:grid-cols-2" />
        </GroupCard>
        <GroupCard icon={FiUser} title="Mother Details">
          <FieldGrid fields={parentFields(student.secondaryGuardian)} columns="sm:grid-cols-2" />
        </GroupCard>
      </div>

      <GroupCard icon={FiMapPin} title="Address">
        <FieldGrid fields={addressFields} />
      </GroupCard>

      {emergencyFields.length > 0 && (
        <GroupCard icon={FiPhoneCall} title="Emergency Contacts">
          <FieldGrid fields={emergencyFields} />
        </GroupCard>
      )}
    </div>
  );
}
