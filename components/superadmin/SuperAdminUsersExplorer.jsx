'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FiUsers, FiUserPlus, FiSearch, FiFilter, FiMoreVertical, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import Dropdown from '@/components/Dropdown';
import Input from '@/components/Input';
import DropdownMenu from '@/components/DropdownMenu';
import { getUsers, createUser, updateUserRole, searchSchools } from '@/lib/api';
import { assignableRoles, ROLE_KEYS } from '@/lib/rbacConstants';
import { ROLE_BADGE_STYLES, Avatar, timeAgo } from '@/components/settings/RolesPermissionsExplorer';

const PAGE_SIZE = 10;
// Only these can be created directly (bare identity, no rich profile) —
// same restriction as the school's own Roles & Permissions page
// (Teacher/Parent have their own dedicated creation flows), plus SuperAdmin
// itself is never created here.
const DIRECT_CREATE_ROLES = ['Principal', 'Admin', 'Accountant'];

// Every school's Roles & Permissions page (RolesPermissionsExplorer) shows
// this same Users table scoped to `where: schoolId: user.schoolId` — this
// is that same table for a SuperAdmin, unscoped (GET /api/users already
// returns every school's users when the caller is SuperAdmin) plus a School
// column/filter and a school picker in Add User, since a SuperAdmin has no
// school of their own to default a new user into.
export default function SuperAdminUsersExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState(null);
  const [schools, setSchools] = useState(null);
  const [search, setSearch] = useState('');
  // `school`/`role` seed from the URL so a shared/bookmarked/back-navigated
  // link reopens on the same filter, not a reset "All".
  const [roleFilter, setRoleFilter] = useState(() => searchParams.get('role') || 'All');
  const [schoolFilter, setSchoolFilter] = useState(() => searchParams.get('school') || 'All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    getUsers().then(setUsers).catch((err) => setFormError(err.message));
    searchSchools({ pageSize: 500 }).then((r) => setSchools(r.schools)).catch((err) => setFormError(err.message));
  }, []);

  // Keeps ?school=&role= in the URL in sync with the active filters —
  // replace (not push), so toggling a tab doesn't spam the back button.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (schoolFilter === 'All') params.delete('school');
    else params.set('school', schoolFilter);
    if (roleFilter === 'All') params.delete('role');
    else params.set('role', roleFilter);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolFilter, roleFilter]);

  const schoolNameOf = (schoolId) => schools?.find((s) => s.id === schoolId)?.name || '—';

  const tabCounts = useMemo(() => {
    const counts = { All: users?.length || 0 };
    for (const key of ROLE_KEYS) counts[key] = 0;
    for (const u of users || []) counts[u.roleKey] = (counts[u.roleKey] || 0) + 1;
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (users || []).filter((u) => {
      if (roleFilter !== 'All' && u.roleKey !== roleFilter) return false;
      if (schoolFilter !== 'All' && u.schoolId !== schoolFilter) return false;
      if (statusFilter !== 'All' && u.status !== statusFilter) return false;
      if (query && !u.name.toLowerCase().includes(query) && !u.email.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [users, search, roleFilter, schoolFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filteredUsers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredUsers.length);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const handleUserCreated = (created) => {
    setUsers((prev) => [
      { id: created.id, name: created.name, email: created.email, phone: '', status: 'Active', roleKey: created.roleKey, schoolId: created.schoolId, photoUrl: null, lastLoginAt: null },
      ...(prev || []),
    ]);
    setShowAddUser(false);
    setToastMessage(`${created.name} created for ${schoolNameOf(created.schoolId)} — temporary password: ${created.tempPassword}`);
  };

  const handleRoleChanged = (userId, roleKey) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, roleKey } : u)));
    setRoleChangeTarget(null);
    setToastMessage('Role updated.');
  };

  return (
    <div className="space-y-6">
      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700">
              <FiUsers className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Users</h3>
              <p className="text-sm text-gray-500">Everyone with a login, across every school.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => changeFilter(setSearch)(e.target.value)}
                className="pl-9 pr-3 py-2 w-64 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="w-[22rem]">
              <Dropdown
                placeholder="All Schools"
                value={schoolFilter === 'All' ? '' : schoolFilter}
                onChange={(v) => changeFilter(setSchoolFilter)(v || 'All')}
                options={[{ value: '', label: 'All Schools' }, ...(schools || []).map((s) => ({ value: s.id, label: s.name }))]}
                searchable
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border cursor-pointer transition ${
                  statusFilter !== 'All' ? 'border-indigo-200 text-indigo-700 bg-indigo-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FiFilter className="w-4 h-4" />
                Filters
              </button>
              {showFilters && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg border border-gray-100 shadow-lg py-1 z-20">
                  {['All', 'Active', 'Inactive'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        changeFilter(setStatusFilter)(s);
                        setShowFilters(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                        statusFilter === s ? 'text-indigo-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {s === 'All' ? 'All Statuses' : s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button label="Add User" icon={<FiUserPlus className="w-4 h-4" />} onClick={() => setShowAddUser(true)} />
          </div>
        </div>

        {!users || !schools ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-4 overflow-x-auto">
              {['All', ...ROLE_KEYS].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeFilter(setRoleFilter)(key)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                    roleFilter === key ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-gray-600 border border-transparent hover:bg-gray-50'
                  }`}
                >
                  {key === 'All' ? 'All' : key} ({tabCounts[key] || 0})
                </button>
              ))}
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No users match this search/filter.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="py-2 pr-4">User</th>
                        <th className="py-2 pr-4">Role</th>
                        <th className="py-2 pr-4">School</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Last Login</th>
                        <th className="py-2 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUsers.map((u, i) => (
                        <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.name} photoUrl={u.photoUrl} seed={i} />
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{u.name}</p>
                                {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${ROLE_BADGE_STYLES[u.roleKey] || 'bg-gray-100 text-gray-700'}`}>
                              {u.roleKey}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-600">{u.roleKey === 'SuperAdmin' ? '—' : schoolNameOf(u.schoolId)}</td>
                          <td className="py-3 pr-4 text-gray-500">{u.email}</td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex items-center gap-1.5 text-gray-600">
                              <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-500">{timeAgo(u.lastLoginAt)}</td>
                          <td className="py-3 pr-4 text-right">
                            {u.roleKey !== 'SuperAdmin' ? (
                              <DropdownMenu
                                trigger={<FiMoreVertical className="w-4 h-4" />}
                                items={[
                                  { label: 'Change Role', icon: <FiRefreshCw className="w-4 h-4" />, onClick: () => setRoleChangeTarget(u) },
                                ]}
                              />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    {rangeStart}-{rangeEnd} of {filteredUsers.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <FiChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showAddUser && (
        <AddUserModal schools={schools || []} onClose={() => setShowAddUser(false)} onCreated={handleUserCreated} />
      )}

      {roleChangeTarget && (
        <ChangeRoleModal
          user={roleChangeTarget}
          onClose={() => setRoleChangeTarget(null)}
          onChanged={(roleKey) => handleRoleChanged(roleChangeTarget.id, roleKey)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}

function AddUserModal({ schools, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const roleOptions = assignableRoles('SuperAdmin')
    .filter((k) => DIRECT_CREATE_ROLES.includes(k))
    .map((k) => ({ value: k, label: k }));
  const schoolOptions = schools.map((s) => ({ value: s.id, label: s.name }));

  const handleSubmit = async () => {
    setError('');
    if (!name || !email || !roleKey || !schoolId) {
      setError('Name, email, role and school are required.');
      return;
    }
    setIsSaving(true);
    try {
      const created = await createUser({ name, email, phone, roleKey, schoolId });
      onCreated({ ...created, schoolId });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Add User"
      description="Creates a Principal, Admin or Accountant login for a specific school. Teacher and Parent accounts are created from that school's own dashboard."
      isOpen
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="secondary" onClick={onClose} />
          <Button label={isSaving ? 'Creating...' : 'Create User'} onClick={handleSubmit} disabled={isSaving} />
        </div>
      }
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-3">{error}</p>}
      <div className="space-y-3">
        <Dropdown placeholder="School" options={schoolOptions} value={schoolId} onChange={setSchoolId} />
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Dropdown placeholder="Role" options={roleOptions} value={roleKey} onChange={setRoleKey} />
      </div>
    </Modal>
  );
}

function ChangeRoleModal({ user, onClose, onChanged }) {
  const [roleKey, setRoleKey] = useState(user.roleKey);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const options = assignableRoles('SuperAdmin').map((k) => ({ value: k, label: k }));

  const handleSubmit = async () => {
    setError('');
    setIsSaving(true);
    try {
      await updateUserRole(user.id, roleKey);
      onChanged(roleKey);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={`Change Role — ${user.name}`}
      isOpen
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="secondary" onClick={onClose} />
          <Button label={isSaving ? 'Saving...' : 'Save'} onClick={handleSubmit} disabled={isSaving || roleKey === user.roleKey} />
        </div>
      }
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-3">{error}</p>}
      <Dropdown placeholder="New role" options={options} value={roleKey} onChange={setRoleKey} />
    </Modal>
  );
}
