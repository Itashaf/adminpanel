'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FiShield,
  FiUsers,
  FiUser,
  FiUserPlus,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiChevronLeft,
  FiChevronRight,
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiFileText,
  FiDollarSign,
  FiBell,
  FiBarChart2,
  FiSettings,
} from 'react-icons/fi';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import Toggle from '@/components/Toggle';
import Dropdown from '@/components/Dropdown';
import Input from '@/components/Input';
import DropdownMenu from '@/components/DropdownMenu';
import { getRoles, getPermissionsCatalog, updateRolePermissions, getUsers, createUser, updateUserRole } from '@/lib/api';
import { assignableRoles, ROLE_KEYS } from '@/lib/rbacConstants';

const PAGE_SIZE = 10;

export const ROLE_BADGE_STYLES = {
  SuperAdmin: 'bg-gray-100 text-gray-700',
  Principal: 'bg-violet-50 text-violet-700',
  Admin: 'bg-blue-50 text-blue-700',
  Teacher: 'bg-emerald-50 text-emerald-700',
  Accountant: 'bg-amber-50 text-amber-700',
  Parent: 'bg-pink-50 text-pink-700',
};

const AVATAR_PALETTE = [
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
];

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
}

export function Avatar({ name, photoUrl, seed }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  const palette = AVATAR_PALETTE[seed % AVATAR_PALETTE.length];
  return (
    <span className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold shrink-0 ${palette.bg} ${palette.text}`}>
      {initialsOf(name)}
    </span>
  );
}

// "2 hours ago" / "5 days ago" style, extended out to months/years since a
// login can be much older than the notification-bell version of this same
// idea (components/dashboard/NotificationBell.jsx) ever needs to show.
export function timeAgo(iso) {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

const MODULE_LABELS = {
  students: 'Students',
  teachers: 'Teachers',
  'attendance.student': 'Student Attendance',
  'attendance.teacher': 'Teacher Attendance',
  leave: 'Leave',
  classes: 'Classes',
  subjects: 'Subjects',
  timetable: 'Timetable',
  exams: 'Exams & Results',
  fees: 'Fees',
  notices: 'Notices',
  users: 'Users',
  roles: 'Roles & Permissions',
  reports: 'Reports',
  settings: 'Settings',
};

// Purely decorative per-module icon + color for the permission grid — no
// meaning beyond visual grouping, same role as MODULE_LABELS above.
const MODULE_ICONS = {
  students: { icon: FiUsers, bg: 'bg-violet-100', text: 'text-violet-700' },
  teachers: { icon: FiUser, bg: 'bg-indigo-100', text: 'text-indigo-700' },
  'attendance.student': { icon: FiUsers, bg: 'bg-teal-100', text: 'text-teal-700' },
  'attendance.teacher': { icon: FiUser, bg: 'bg-emerald-100', text: 'text-emerald-700' },
  leave: { icon: FiClock, bg: 'bg-orange-100', text: 'text-orange-700' },
  classes: { icon: FiBook, bg: 'bg-blue-100', text: 'text-blue-700' },
  subjects: { icon: FiBookOpen, bg: 'bg-sky-100', text: 'text-sky-700' },
  timetable: { icon: FiCalendar, bg: 'bg-cyan-100', text: 'text-cyan-700' },
  exams: { icon: FiFileText, bg: 'bg-rose-100', text: 'text-rose-700' },
  fees: { icon: FiDollarSign, bg: 'bg-amber-100', text: 'text-amber-700' },
  notices: { icon: FiBell, bg: 'bg-yellow-100', text: 'text-yellow-700' },
  users: { icon: FiUsers, bg: 'bg-purple-100', text: 'text-purple-700' },
  roles: { icon: FiShield, bg: 'bg-violet-100', text: 'text-violet-700' },
  reports: { icon: FiBarChart2, bg: 'bg-gray-100', text: 'text-gray-700' },
  settings: { icon: FiSettings, bg: 'bg-gray-100', text: 'text-gray-700' },
};

const ROLE_PILL_STYLES = {
  SuperAdmin: { bg: 'bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600', text: 'text-white' },
  Principal: { bg: 'bg-violet-50', text: 'text-violet-700' },
  Admin: { bg: 'bg-blue-50', text: 'text-blue-700' },
  Teacher: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Accountant: { bg: 'bg-amber-50', text: 'text-amber-700' },
  Parent: { bg: 'bg-pink-50', text: 'text-pink-700' },
};

const ROLE_ICONS = {
  SuperAdmin: FiShield,
  Principal: FiBookOpen,
  Admin: FiSettings,
  Teacher: FiUsers,
  Accountant: FiDollarSign,
  Parent: FiUsers,
};

// Tasks 23-25. `can` (from the Server Component page, real permission
// resolution off the signed-in session — not guessed client-side) decides
// which sections/actions render at all; every route behind them still
// re-checks the same permission server-side (see app/api/roles/**,
// app/api/users/**) — this is "hide", not the actual enforcement boundary.
export default function RolesPermissionsExplorer({ can, actorRoleKey, actorUserId }) {
  const [roles, setRoles] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [users, setUsers] = useState(null);
  const [permSearch, setPermSearch] = useState('');
  const [savingCells, setSavingCells] = useState(new Set());
  const [toastMessage, setToastMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (can.viewRoles) getRoles().then(setRoles).catch((err) => setFormError(err.message));
    if (can.viewPermissions) getPermissionsCatalog().then(setCatalog).catch((err) => setFormError(err.message));
    if (can.viewUsers) getUsers().then(setUsers).catch((err) => setFormError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirrors the backend's own rule (app/api/roles/[id]/permissions/route.js)
  // so a toggle doesn't invite a click that the API will just 403 — the API
  // still re-checks this itself regardless.
  const canEditRole = (role) => can.managePermissions && (role.key !== 'SuperAdmin' || actorRoleKey === 'SuperAdmin');

  const cellKey = (roleId, permKey) => `${roleId}:${permKey}`;

  // One toggle = one immediate save (full-replace, matching the API's own
  // shape) — no separate "Save" step, no local draft state to go stale.
  // Optimistic-ish: the toggle already reflects the click instantly via
  // `roles` state below; a failed save reverts it and surfaces the error.
  const handleToggleCell = async (role, permKey, nextChecked) => {
    const key = cellKey(role.id, permKey);
    setSavingCells((prev) => new Set(prev).add(key));
    const nextKeys = nextChecked ? [...role.permissionKeys, permKey] : role.permissionKeys.filter((k) => k !== permKey);
    setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, permissionKeys: nextKeys } : r)));
    try {
      const updated = await updateRolePermissions(role.id, nextKeys);
      setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, permissionKeys: updated.permissionKeys } : r)));
    } catch (err) {
      setFormError(err.message);
      setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, permissionKeys: role.permissionKeys } : r)));
    } finally {
      setSavingCells((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const filteredModules = useMemo(() => {
    if (!catalog) return {};
    const query = permSearch.trim().toLowerCase();
    if (!query) return catalog.modules;
    const result = {};
    for (const [moduleKey, perms] of Object.entries(catalog.modules)) {
      const moduleLabel = (MODULE_LABELS[moduleKey] || moduleKey).toLowerCase();
      if (moduleLabel.includes(query)) {
        result[moduleKey] = perms;
        continue;
      }
      const matchingPerms = perms.filter((p) => p.label.toLowerCase().includes(query));
      if (matchingPerms.length) result[moduleKey] = matchingPerms;
    }
    return result;
  }, [catalog, permSearch]);

  const handleUserCreated = (created) => {
    setUsers((prev) => [
      { id: created.id, name: created.name, email: created.email, phone: '', status: 'Active', roleKey: created.roleKey, photoUrl: null, lastLoginAt: null },
      ...(prev || []),
    ]);
    setShowAddUser(false);
    setToastMessage(`${created.name} created — temporary password: ${created.tempPassword}`);
  };

  const handleRoleChanged = (userId, roleKey) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, roleKey } : u)));
    setRoleChangeTarget(null);
    setToastMessage('Role updated.');
  };

  // Tab counts come from the full unfiltered list — a tab always shows how
  // many users have that role, not how many match the current search/status
  // filter too (matches the reference: "Teacher (16)" doesn't shrink while
  // typing in the search box).
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
      if (statusFilter !== 'All' && u.status !== statusFilter) return false;
      if (query && !u.name.toLowerCase().includes(query) && !u.email.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filteredUsers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredUsers.length);

  // Any filter/search change that could shrink the result set below the
  // current page resets back to page 1, rather than showing an empty page.
  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const allPagedSelected = pagedUsers.length > 0 && pagedUsers.every((u) => selectedIds.has(u.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allPagedSelected) {
        const next = new Set(prev);
        pagedUsers.forEach((u) => next.delete(u.id));
        return next;
      }
      const next = new Set(prev);
      pagedUsers.forEach((u) => next.add(u.id));
      return next;
    });
  };
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
      )}

      {can.viewUsers && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700">
                <FiUsers className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Users</h3>
                <p className="text-sm text-gray-500">Everyone with a login to this school.</p>
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

              {can.createUsers && (
                <Button label="Add User" icon={<FiUserPlus className="w-4 h-4" />} onClick={() => setShowAddUser(true)} />
              )}
            </div>
          </div>

          {!users ? (
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
                          <th className="py-2 pr-3 w-8">
                            <input type="checkbox" checked={allPagedSelected} onChange={toggleSelectAll} className="rounded border-gray-300" />
                          </th>
                          <th className="py-2 pr-4">User</th>
                          <th className="py-2 pr-4">Role</th>
                          <th className="py-2 pr-4">Email</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Last Login</th>
                          <th className="py-2 pr-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedUsers.map((u, i) => {
                          const canChangeRole = can.updateUsers && u.id !== actorUserId && assignableRoles(actorRoleKey).length > 0;
                          return (
                            <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                              <td className="py-3 pr-3">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(u.id)}
                                  onChange={() => toggleSelectOne(u.id)}
                                  className="rounded border-gray-300"
                                />
                              </td>
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
                              <td className="py-3 pr-4 text-gray-500">{u.email}</td>
                              <td className="py-3 pr-4">
                                <span className="inline-flex items-center gap-1.5 text-gray-600">
                                  <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                  {u.status}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-gray-500">{timeAgo(u.lastLoginAt)}</td>
                              <td className="py-3 pr-4 text-right">
                                {canChangeRole ? (
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
                          );
                        })}
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
      )}

      {can.viewRoles && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 text-violet-700">
                <FiShield className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Roles &amp; Permissions</h3>
                <p className="text-sm text-gray-500">Manage what each role can access and do in the system.</p>
              </div>
            </div>
          </div>

          {!roles || (can.viewPermissions && !catalog) ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : (
            <>
              {/* Summary strip — counts only, not tabs: every role already
                  renders as its own column below, there's nothing to switch
                  into. */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
                {roles.map((r) => {
                  const style = ROLE_PILL_STYLES[r.key] || { bg: 'bg-gray-50', text: 'text-gray-700' };
                  const RoleIcon = ROLE_ICONS[r.key] || FiShield;
                  return (
                    <span
                      key={r.id}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${style.bg} ${style.text}`}
                    >
                      <RoleIcon className="w-4 h-4" />
                      {r.name}
                      <span className="text-xs opacity-70">{r.userCount}</span>
                    </span>
                  );
                })}
              </div>

              {catalog && (
                <>
                  <div className="relative mb-5">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search modules or permissions..."
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      className="pl-9 pr-3 py-2.5 w-full max-w-sm text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="overflow-x-auto -mx-2 px-2">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-2 pr-4 sticky left-0 bg-white">Module</th>
                          <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-2 pr-4">Permission</th>
                          {roles.map((r) => (
                            <th key={r.id} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide py-2 px-3 whitespace-nowrap">
                              {r.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(filteredModules).length === 0 ? (
                          <tr>
                            <td colSpan={2 + roles.length} className="text-center text-sm text-gray-400 py-8">
                              No modules or permissions match &quot;{permSearch}&quot;.
                            </td>
                          </tr>
                        ) : (
                          Object.entries(filteredModules).map(([moduleKey, perms]) => {
                            const moduleStyle = MODULE_ICONS[moduleKey] || { icon: FiShield, bg: 'bg-gray-100', text: 'text-gray-700' };
                            const ModuleIcon = moduleStyle.icon;
                            return perms.map((p, i) => (
                              <tr key={p.key} className="border-b border-gray-50 last:border-0">
                                {i === 0 && (
                                  <td rowSpan={perms.length} className="align-top py-3 pr-4 sticky left-0 bg-white">
                                    <div className="flex items-center gap-2.5">
                                      <span className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${moduleStyle.bg} ${moduleStyle.text}`}>
                                        <ModuleIcon className="w-4 h-4" />
                                      </span>
                                      <span className="font-semibold text-gray-900">{MODULE_LABELS[moduleKey] || moduleKey}</span>
                                    </div>
                                  </td>
                                )}
                                <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{p.label}</td>
                                {roles.map((r) => {
                                  const editable = canEditRole(r);
                                  const checked = r.permissionKeys.includes(p.key);
                                  const saving = savingCells.has(cellKey(r.id, p.key));
                                  return (
                                    <td key={r.id} className="py-3 px-3 text-center">
                                      <div className="flex justify-center">
                                        <Toggle
                                          checked={checked}
                                          disabled={!editable || saving}
                                          onChange={(next) => handleToggleCell(r, p.key, next)}
                                        />
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ));
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!can.managePermissions && (
                    <p className="text-xs text-gray-400 mt-4">You can view permissions but not edit them.</p>
                  )}
                  {can.managePermissions && actorRoleKey !== 'SuperAdmin' && (
                    <p className="text-xs text-gray-400 mt-4">Only Super Admin can edit the Super Admin column.</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {showAddUser && (
        <AddUserModal actorRoleKey={actorRoleKey} onClose={() => setShowAddUser(false)} onCreated={handleUserCreated} />
      )}

      {roleChangeTarget && (
        <ChangeRoleModal
          user={roleChangeTarget}
          actorRoleKey={actorRoleKey}
          onClose={() => setRoleChangeTarget(null)}
          onChanged={(roleKey) => handleRoleChanged(roleChangeTarget.id, roleKey)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}

// Only Principal/Admin/Accountant — Teacher/Parent have their own dedicated
// creation flows (Add Teacher, a student's Portal Access action) that carry
// the rich profile data (classes/subjects, linked children) a bare identity
// form here can't; the API rejects those two roleKeys anyway
// (app/api/users/route.js), this just doesn't offer them in the first
// place.
const DIRECT_CREATE_ROLES = ['Principal', 'Admin', 'Accountant'];

function AddUserModal({ actorRoleKey, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const options = assignableRoles(actorRoleKey)
    .filter((k) => DIRECT_CREATE_ROLES.includes(k))
    .map((k) => ({ value: k, label: k }));

  const handleSubmit = async () => {
    setError('');
    if (!name || !email || !roleKey) {
      setError('Name, email and role are required.');
      return;
    }
    setIsSaving(true);
    try {
      const created = await createUser({ name, email, phone, roleKey });
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Add User"
      description="Teacher and Parent accounts are created from their own pages — Add Teacher, and a student's Portal Access action."
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
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Dropdown placeholder="Role" options={options} value={roleKey} onChange={setRoleKey} />
      </div>
    </Modal>
  );
}

function ChangeRoleModal({ user, actorRoleKey, onClose, onChanged }) {
  const [roleKey, setRoleKey] = useState(user.roleKey);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const options = assignableRoles(actorRoleKey).map((k) => ({ value: k, label: k }));

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
