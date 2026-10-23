'use client';

import { useEffect, useRef, useState } from 'react';
import { FiHelpCircle, FiSend } from 'react-icons/fi';
import Badge from '@/components/Badge';
import Dropdown from '@/components/Dropdown';
import { getSupportTickets, getSupportTicket, addSupportTicketReply, updateSupportTicketStatus } from '@/lib/api';
import { getPusherClient } from '@/lib/pusherClient';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const STATUS_BADGE = {
  OPEN: { label: 'Open', variant: 'blue' },
  IN_PROGRESS: { label: 'In Progress', variant: 'violet' },
  RESOLVED: { label: 'Resolved', variant: 'green' },
  CLOSED: { label: 'Closed', variant: 'gray' },
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// SuperAdmin's "Support" inbox (SuperAdminNav.jsx) — every school's ticket,
// filterable by status; selecting one opens its thread alongside the list,
// where a SuperAdmin can reply and change status. Mirrors
// components/support/SupportModal.jsx's thread view, just the other side
// of the same conversation (isSuperAdmin: true on every reply sent here).
export default function SupportInboxExplorer({ initialTickets }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [statusFilter, setStatusFilter] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    getSupportTickets(statusFilter).then((data) => setTickets(data.tickets));
  }, [statusFilter]);

  // Jumps to the latest message whenever the open thread grows.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [activeTicket?.replies?.length]);

  useEffect(() => {
    if (!activeId) return;
    getSupportTicket(activeId).then((data) => setActiveTicket(data.ticket));
  }, [activeId]);

  // Live list — any school submitting/replying refreshes the whole list
  // (cheap enough; this inbox is never going to have thousands of rows).
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe('support-superadmin');
    const refetchList = () => getSupportTickets(statusFilter).then((data) => setTickets(data.tickets));
    channel.bind('ticket-updated', refetchList);
    return () => {
      channel.unbind('ticket-updated', refetchList);
      pusher.unsubscribe('support-superadmin');
    };
  }, [statusFilter]);

  // Live thread — a school's reply while this ticket is open refetches it.
  useEffect(() => {
    if (!activeId) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`support-ticket-${activeId}`);
    const refetch = () => getSupportTicket(activeId).then((data) => setActiveTicket(data.ticket));
    channel.bind('new-reply', refetch);
    return () => {
      channel.unbind('new-reply', refetch);
      pusher.unsubscribe(`support-ticket-${activeId}`);
    };
  }, [activeId]);

  const refreshTicket = async () => {
    const data = await getSupportTicket(activeId);
    setActiveTicket(data.ticket);
    setTickets((prev) => prev.map((t) => (t.id === data.ticket.id ? { ...t, status: data.ticket.status, updatedAt: data.ticket.updatedAt } : t)));
  };

  const handleSend = async () => {
    setError('');
    if (!message.trim()) return;
    setIsSending(true);
    try {
      await addSupportTicketReply(activeId, message);
      await refreshTicket();
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (status) => {
    setError('');
    setIsUpdatingStatus(true);
    try {
      await updateSupportTicketStatus(activeId, status);
      await refreshTicket();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start h-full">
      <div className="flex-1 min-w-0 w-full space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <div className="w-48">
            <Dropdown options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {tickets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No support tickets.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setActiveId(ticket.id)}
                  className={`w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition cursor-pointer ${
                    activeId === ticket.id ? 'bg-indigo-50/60' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                      {ticket.unread && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                      {ticket.subject} <span className="text-gray-400 font-normal">{ticket.ticketNumber}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ticket.schoolName} · {ticket.raisedByName} · {timeAgo(ticket.updatedAt)}
                    </p>
                  </div>
                  <Badge {...(STATUS_BADGE[ticket.status] || STATUS_BADGE.OPEN)} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeTicket && (
        <div className="w-full lg:w-96 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-6">
          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</p>}

          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100 text-violet-600 shrink-0">
              <FiHelpCircle className="w-4 h-4" />
            </span>
            <p className="text-sm font-bold text-gray-900 truncate">{activeTicket.subject}</p>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {activeTicket.ticketNumber} · {activeTicket.schoolName} · {activeTicket.raisedByName} ({activeTicket.raisedByRoleKey})
          </p>

          <div className="w-40 mb-4">
            <Dropdown
              options={STATUS_OPTIONS.slice(1)}
              value={activeTicket.status}
              onChange={handleStatusChange}
              disabled={isUpdatingStatus}
            />
          </div>

          <div className="space-y-3 max-h-[45vh] overflow-y-auto mb-4 scrollbar-none">
            <ThreadBubble
              authorName={activeTicket.raisedByName}
              message={activeTicket.message}
              attachmentUrl={activeTicket.attachmentUrl}
              createdAt={activeTicket.createdAt}
            />
            {activeTicket.replies.map((reply) => (
              <ThreadBubble
                key={reply.id}
                authorName={reply.isSuperAdmin ? 'You' : reply.authorName}
                message={reply.message}
                attachmentUrl={reply.attachmentUrl}
                createdAt={reply.createdAt}
                fromSelf={reply.isSuperAdmin}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a reply..."
              rows={2}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-full text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThreadBubble({ authorName, message, attachmentUrl, createdAt, fromSelf }) {
  return (
    <div className={`flex ${fromSelf ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${fromSelf ? 'bg-indigo-50 text-gray-900' : 'bg-gray-100 text-gray-900'}`}>
        <p className="text-xs font-semibold text-gray-500 mb-0.5">{authorName}</p>
        {message && <p className="text-sm whitespace-pre-wrap">{message}</p>}
        {attachmentUrl && (
          <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
            <img src={attachmentUrl} alt="Attachment" className="max-w-full rounded-lg border border-gray-200" />
          </a>
        )}
        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(createdAt)}</p>
      </div>
    </div>
  );
}
