'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FiUsers, FiUserPlus, FiSearch, FiMoreVertical, FiRefreshCw, FiKey, FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import Button from '@/components/Button';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import Dropdown from '@/components/Dropdown';
import Input from '@/components/Input';
import DropdownMenu from '@/components/DropdownMenu';
import { getUsers, createUser, updateUserRole, searchSchools, setUserPassword, sendUserResetLink } from '@/lib/api';
import { assignableRoles, ROLE_KEYS } from '@/lib/rbacConstants';
import { ROLE_BADGE_STYLES, timeAgo } from '@/components/settings/RolesPermissionsExplorer';

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
  const [showAddUser, setShowAddUser] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [resetLinkTarget, setResetLinkTarget] = useState(null);
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
    <div className="space-y-5 pb-12">
      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
      )}

      {/* Heading row: title on the left, the one primary action on the right. */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
            <FiUsers className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Users</h1>
            <p className="text-sm text-gray-500">Everyone with a login, across every school.</p>
          </div>
        </div>
        <Button label="Add User" icon={<FiUserPlus className="w-4 h-4" />} onClick={() => setShowAddUser(true)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters: three equal-height controls on one grid, so their edges line up. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_16rem_11rem] gap-3 p-4 sm:p-5 border-b border-gray-100">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => changeFilter(setSearch)(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-full border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <Dropdown
            placeholder="All Schools"
            value={schoolFilter === 'All' ? '' : schoolFilter}
            onChange={(v) => changeFilter(setSchoolFilter)(v || 'All')}
            options={[{ value: '', label: 'All Schools' }, ...(schools || []).map((s) => ({ value: s.id, label: s.name }))]}
            searchable
          />

          <Dropdown
            placeholder="All Statuses"
            value={statusFilter === 'All' ? '' : statusFilter}
            onChange={(v) => changeFilter(setStatusFilter)(v || 'All')}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
          />
        </div>

        {/* Role tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-5 py-3 border-b border-gray-100 overflow-x-auto">
          {['All', ...ROLE_KEYS].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => changeFilter(setRoleFilter)(key)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                roleFilter === key ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-gray-600 border border-transparent hover:bg-gray-50'
              }`}
            >
              {key} ({tabCounts[key] || 0})
            </button>
          ))}
        </div>

        {!users || !schools ? (
          <div className="p-5 space-y-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3.5 flex-1 bg-gray-100 rounded" />
                <div className="h-3.5 w-24 bg-gray-100 rounded" />
                <div className="h-3.5 w-20 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No users match this search/filter.</p>
        ) : (
          <>
            {/* Fixed column widths (table-fixed + colgroup) so the header and every row share the
                same columns; long values are cut with an ellipsis instead of pushing columns around. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[11%]" />
                  <col className="w-[17%]" />
                  <col className="w-[22%]" />
                  <col className="w-[9%]" />
                  <col className="w-[12%]" />
                  <col className="w-[5%]" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="py-3 pl-5 pr-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">School</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 pl-4 pr-5 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 pl-5 pr-4 align-middle">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{u.name}</p>
                          {u.phone && <p className="text-xs text-gray-400 truncate">{u.phone}</p>}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ROLE_BADGE_STYLES[u.roleKey] || 'bg-gray-100 text-gray-700'}`}>
                          {u.roleKey}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-middle text-gray-600">
                        <span className="block truncate" title={u.roleKey === 'SuperAdmin' ? '' : schoolNameOf(u.schoolId)}>
                          {u.roleKey === 'SuperAdmin' ? '—' : schoolNameOf(u.schoolId)}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-middle text-gray-500">
                        <span className="block truncate" title={u.email}>{u.email}</span>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                            u.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-middle text-gray-500 whitespace-nowrap">{timeAgo(u.lastLoginAt)}</td>
                      <td className="py-3 pl-4 pr-5 align-middle text-right">
                        <DropdownMenu
                          trigger={<FiMoreVertical className="w-4 h-4" />}
                          items={[
                            // Nobody can change the platform Super Admin's role.
                            ...(u.roleKey !== 'SuperAdmin'
                              ? [{ label: 'Change Role', icon: <FiRefreshCw className="w-4 h-4" />, onClick: () => setRoleChangeTarget(u) }]
                              : []),
                            { label: 'Send Reset Link', icon: <FiMail className="w-4 h-4" />, onClick: () => setResetLinkTarget(u) },
                            { label: 'Set Password', icon: <FiKey className="w-4 h-4" />, onClick: () => setPasswordTarget(u) },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <FixedPaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={filteredUsers.length}
        pageSize={PAGE_SIZE}
        itemLabel="users"
      />

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

      {passwordTarget && (
        <SetPasswordModal
          user={passwordTarget}
          onClose={() => setPasswordTarget(null)}
          onDone={() => {
            setToastMessage(`Password updated for ${passwordTarget.name}.`);
            setPasswordTarget(null);
          }}
        />
      )}

      {resetLinkTarget && (
        <SendResetLinkModal
          user={resetLinkTarget}
          onClose={() => setResetLinkTarget(null)}
          onDone={(email) => {
            setToastMessage(`Reset link sent to ${email}.`);
            setResetLinkTarget(null);
          }}
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

function SetPasswordModal({ user, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setIsSaving(true);
    try {
      await setUserPassword(user.id, password);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={`Set Password — ${user.name}`}
      isOpen
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="secondary" onClick={onClose} />
          <Button label={isSaving ? 'Saving...' : 'Set Password'} onClick={handleSubmit} disabled={isSaving} />
        </div>
      }
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-3">{error}</p>}
      <div>
        <div className="py-1.5">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="New password (min 8 characters)"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            endAdornment={
              <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="pointer-events-auto cursor-pointer" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <FiEye /> : <FiEyeOff />}
              </button>
            }
          />
        </div>
        <div className="py-1.5">
          <Input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            endAdornment={
              <button type="button" onClick={() => setShowConfirm((prev) => !prev)} className="pointer-events-auto cursor-pointer" aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                {showConfirm ? <FiEye /> : <FiEyeOff />}
              </button>
            }
          />
        </div>
      </div>
    </Modal>
  );
}

function SendResetLinkModal({ user, onClose, onDone }) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    setIsSending(true);
    try {
      const result = await sendUserResetLink(user.id);
      onDone(result.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      title={`Send Reset Link — ${user.name}`}
      description={`Emails a link to ${user.email} so they can choose a new password. The link works once and expires in 7 days.`}
      isOpen
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="secondary" onClick={onClose} />
          <Button label={isSending ? 'Sending...' : 'Send Link'} onClick={handleSend} disabled={isSending} />
        </div>
      }
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}
    </Modal>
  );
}
