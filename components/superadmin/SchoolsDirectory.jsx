'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import SchoolsHeader from './SchoolsHeader';
import SchoolsStatsCards from './SchoolsStatsCards';
import SchoolsTable from './SchoolsTable';
import CreateAdminModal from './CreateAdminModal';
import { manageSchool, updateSchoolDirectoryStatus } from '@/lib/api';

export default function SchoolsDirectory({ schools }) {
  const router = useRouter();
  // Seeded once from the server-rendered list, then updated directly on a
  // successful status toggle — avoids a router.refresh() (which re-runs the
  // whole page's data fetch) just to flip one field the client already knows
  // the new value of.
  const [schoolsList, setSchoolsList] = useState(schools);
  const [toastMessage, setToastMessage] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [isToggling, setIsToggling] = useState(false);
  const [assignAdminTarget, setAssignAdminTarget] = useState(null);

  const handleManage = async (id) => {
    setIsSwitching(true);
    try {
      await manageSchool(id);
      router.push('/dashboard');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setIsToggling(true);
    try {
      const nextStatus = toggleTarget.status === 'Active' ? 'Inactive' : 'Active';
      await updateSchoolDirectoryStatus(toggleTarget.id, nextStatus);
      setSchoolsList((prev) => prev.map((s) => (s.id === toggleTarget.id ? { ...s, status: nextStatus } : s)));
      setToggleTarget(null);
      setToastMessage(`${toggleTarget.name} is now ${nextStatus.toLowerCase()}.`);
    } finally {
      setIsToggling(false);
    }
  };

  const handleAssignAdminSuccess = (message) => {
    setSchoolsList((prev) => prev.map((s) => (s.id === assignAdminTarget.id ? { ...s, hasAdmin: true } : s)));
    setAssignAdminTarget(null);
    if (message) setToastMessage(message);
  };

  return (
    <div className="space-y-6">
      <SchoolsHeader />
      <SchoolsStatsCards schools={schoolsList} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {schoolsList.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-16">No schools yet — click "Add School" to onboard the first one.</p>
        ) : (
          <SchoolsTable
            schools={schoolsList}
            onManage={handleManage}
            onToggleStatus={setToggleTarget}
            onAssignAdmin={setAssignAdminTarget}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleStatus}
        title={toggleTarget?.status === 'Active' ? 'Deactivate school?' : 'Activate school?'}
        description={
          toggleTarget?.status === 'Active'
            ? `${toggleTarget?.name} will be marked inactive on the platform.`
            : `${toggleTarget?.name} will be marked active again.`
        }
        confirmLabel={toggleTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        isLoading={isToggling}
      />

      {isSwitching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-4 text-sm font-medium text-gray-700">
            Switching into this school...
          </div>
        </div>
      )}

      <CreateAdminModal
        isOpen={Boolean(assignAdminTarget)}
        onClose={() => setAssignAdminTarget(null)}
        school={assignAdminTarget}
        onSuccess={handleAssignAdminSuccess}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
