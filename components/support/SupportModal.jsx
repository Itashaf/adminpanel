'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FiHeadphones,
  FiPlus,
  FiArrowLeft,
  FiSend,
  FiSearch,
  FiChevronRight,
  FiPaperclip,
  FiFileText,
  FiX,
} from 'react-icons/fi';
import Modal from '@/components/Modal';
import Dropdown from '@/components/Dropdown';
import Badge from '@/components/Badge';
import { getSupportTickets, createSupportTicket, getSupportTicket, addSupportTicketReply, uploadSupportAttachment } from '@/lib/api';
import { getPusherClient } from '@/lib/pusherClient';

const CATEGORY_OPTIONS = [
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'FEATURE_REQUEST', label: 'Feature Request' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
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

const CATEGORY_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.value, c.label]));
const PRIORITY_LABEL = Object.fromEntries(PRIORITY_OPTIONS.map((p) => [p.value, p.label]));
const MAX_MESSAGE_LENGTH = 1000;

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

function dayLabel(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// School staff's "Support" popup (Sidebar.jsx's "Support" button). Four
// screens in one modal: a tabbed "My Tickets" list (+ a static "Help
// Center" tab), a dedicated "New Ticket" form, and a dedicated ticket
// thread — the latter two replace the tab bar with a back arrow, matching
// the reference design exactly. Never reachable from the Parent portal
// (ParentSidebar.jsx has no entry point for this at all) — Support is
// staff-only (Admin/Principal/Teacher/Accountant), by omission rather than
// an explicit role check here. The caller (Sidebar.jsx) only mounts this
// while the popup is open, so a fresh mount already starts clean — no
// isOpen-driven reset effect needed.
export default function SupportModal({ onClose, initialTicketId = null, initialScreen = 'tickets' }) {
  const [screen, setScreen] = useState(initialScreen); // 'tickets' | 'help' | 'form' | 'thread'
  const [tickets, setTickets] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTicket, setActiveTicket] = useState(null);
  const [error, setError] = useState('');

  // Notification Bell's "New reply on your ticket" link (see Sidebar.jsx's
  // ?supportTicket=xyz handling) sets initialTicketId before this ever
  // mounts (it's never passed a value that changes afterward — Sidebar.jsx
  // only mounts this component fresh per open) — so jumping straight to
  // that thread instead of the list is mount-time logic, not something
  // reacting to a later prop change.
  useEffect(() => {
    getSupportTickets()
      .then((data) => setTickets(data.tickets))
      .catch((err) => setError(err.message));
    if (initialTicketId) {
      getSupportTicket(initialTicketId)
        .then((data) => {
          setActiveTicket(data.ticket);
          setScreen('thread');
        })
        .catch((err) => setError(err.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openThread = async (ticketId) => {
    setError('');
    try {
      const data = await getSupportTicket(ticketId);
      setActiveTicket(data.ticket);
      setScreen('thread');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreated = (ticket) => {
    setTickets((prev) => [ticket, ...(prev || [])]);
    setScreen('tickets');
  };

  const handleReplied = (updatedTicket) => {
    setActiveTicket(updatedTicket);
    setTickets((prev) =>
      (prev || []).map((t) => (t.id === updatedTicket.id ? { ...t, status: updatedTicket.status, updatedAt: updatedTicket.updatedAt } : t))
    );
  };

  const filteredTickets = (tickets || []).filter((t) => {
    const matchesSearch = !search.trim() || t.subject.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = !statusFilter || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const showTabs = screen === 'tickets' || screen === 'help';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={
        screen === 'thread' && activeTicket ? (
          <span className="flex items-center gap-2">
            Support Team
            <Badge {...(STATUS_BADGE[activeTicket.status] || STATUS_BADGE.OPEN)} />
          </span>
        ) : (
          'Support Team'
        )
      }
      description={
        screen === 'thread' &&
        activeTicket && (
          <span className="text-xs">
            {activeTicket.ticketNumber} | {CATEGORY_LABEL[activeTicket.category] || activeTicket.category} |{' '}
            {PRIORITY_LABEL[activeTicket.priority] || activeTicket.priority} Priority
          </span>
        )
      }
      icon={<FiHeadphones className="w-5 h-5" />}
      headerExtra={
        screen === 'tickets' && (
          <button
            type="button"
            onClick={() => setScreen('form')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
          >
            <FiPlus className="w-4 h-4" />
            New Ticket
          </button>
        )
      }
      size="lg"
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{error}</p>}

      {showTabs && (
        <div className="flex items-center gap-5 border-b border-gray-100 mb-4 -mt-1">
          {[
            { key: 'tickets', label: 'My Tickets' },
            { key: 'form', label: 'New Ticket' },
            { key: 'help', label: 'Help Center' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setScreen(tab.key)}
              className={`relative pb-3 text-sm font-medium cursor-pointer transition ${
                screen === tab.key ? 'text-indigo-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
              {screen === tab.key && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {screen === 'tickets' && (
        <TicketListView
          tickets={tickets}
          filteredTickets={filteredTickets}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onNewTicket={() => setScreen('form')}
          onOpenTicket={openThread}
        />
      )}

      {screen === 'help' && <HelpCenterView />}

      {screen === 'form' && (
        <TicketFormView onCancel={() => setScreen('tickets')} onCreated={handleCreated} setError={setError} />
      )}

      {screen === 'thread' && activeTicket && (
        <TicketThreadView
          ticket={activeTicket}
          onBack={() => setScreen('tickets')}
          onReplied={handleReplied}
          setError={setError}
        />
      )}
    </Modal>
  );
}

function TicketListView({ tickets, filteredTickets, search, setSearch, statusFilter, setStatusFilter, onNewTicket, onOpenTicket }) {
  if (tickets === null) {
    return <p className="text-sm text-gray-400 text-center py-10">Loading...</p>;
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 text-violet-600 mb-4">
          <FiHeadphones className="w-7 h-7" />
        </span>
        <p className="text-base font-bold text-gray-900">No support tickets yet</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">Raise an issue and our team will get back to you as soon as possible.</p>
        <button
          type="button"
          onClick={onNewTicket}
          className="inline-flex items-center gap-1.5 mt-5 px-4 py-2.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          New Ticket
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="w-36 shrink-0">
          <Dropdown options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No tickets match this search/filter.</p>
      ) : (
        <div className="space-y-2 max-h-[48vh] overflow-y-auto">
          {filteredTickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => onOpenTicket(ticket.id)}
              className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border hover:bg-gray-50 transition text-left cursor-pointer ${
                ticket.unread ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {ticket.unread && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                  <p className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ticket.ticketNumber} · {CATEGORY_LABEL[ticket.category] || ticket.category}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge {...(STATUS_BADGE[ticket.status] || STATUS_BADGE.OPEN)} />
                <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">{timeAgo(ticket.updatedAt)}</span>
                <FiChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const HELP_FAQS = [
  { q: 'How do I reset a student or parent password?', a: 'Go to Students → select a student → Portal Access → Reset Password.' },
  { q: 'Why is attendance not saving?', a: 'Check that the date is within the attendance edit window set in School Settings → Attendance Rules.' },
  { q: 'How do I add a new fee structure?', a: 'Fees → Fee Structures → Create Structure, then Generate Fees for the class.' },
  { q: "Can't find what you need?", a: 'Raise a ticket from the "New Ticket" tab and our team will help.' },
];

function HelpCenterView() {
  return (
    <div className="space-y-3 max-h-[52vh] overflow-y-auto">
      {HELP_FAQS.map((item) => (
        <div key={item.q} className="p-3.5 rounded-xl border border-gray-100">
          <p className="text-sm font-medium text-gray-900">{item.q}</p>
          <p className="text-sm text-gray-500 mt-1">{item.a}</p>
        </div>
      ))}
    </div>
  );
}

function AttachmentPicker({ file, onFileChange }) {
  const inputRef = useRef(null);

  if (file) {
    return (
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3.5 py-2.5">
        <FiFileText className="w-4 h-4 text-gray-400 shrink-0" />
        <p className="text-sm text-gray-700 truncate flex-1">{file.name}</p>
        <button type="button" onClick={() => onFileChange(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <FiX className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full flex flex-col items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-xl py-6 text-center hover:bg-gray-50 transition cursor-pointer"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
      />
      <FiPaperclip className="w-5 h-5 text-gray-400" />
      <p className="text-sm">
        <span className="text-indigo-600 font-medium">Click to upload</span> <span className="text-gray-500">or drag and drop</span>
      </p>
      <p className="text-xs text-gray-400">PNG, JPG, PDF (Max 5MB each)</p>
    </button>
  );
}

function TicketFormView({ onCancel, onCreated, setError }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState('NORMAL');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required.');
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setError('Attachment must be 5MB or smaller.');
      return;
    }
    setIsSubmitting(true);
    try {
      const attachmentUrl = file ? await uploadSupportAttachment(file) : undefined;
      const data = await createSupportTicket({ subject, category, priority, message, attachmentUrl });
      onCreated(data.ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={onCancel} className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-4 cursor-pointer">
        <FiArrowLeft className="w-4 h-4" />
        New Ticket
      </button>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter a short subject for your issue"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <Dropdown options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority <span className="text-red-500">*</span>
            </label>
            <Dropdown options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => e.target.value.length <= MAX_MESSAGE_LENGTH && setMessage(e.target.value)}
            placeholder="Describe your issue in detail. You can also add steps to reproduce, screenshots, or any other relevant information."
            rows={5}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">
            {message.length}/{MAX_MESSAGE_LENGTH}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Attachments (Optional)</label>
          <AttachmentPicker file={file} onFileChange={setFile} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-5 mt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </div>
    </div>
  );
}

function TicketThreadView({ ticket, onBack, onReplied, setError }) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const canReply = ticket.status !== 'CLOSED';
  const messagesEndRef = useRef(null);
  const messageCount = ticket.replies.length;

  // Jumps to the latest message whenever the thread grows — a fresh reply
  // from either side, or this screen opening on an existing ticket.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messageCount]);

  // Live thread — a SuperAdmin reply/status change while this is open
  // refetches the ticket instead of the school having to close and reopen
  // it to see it.
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`support-ticket-${ticket.id}`);
    const refetch = () => getSupportTicket(ticket.id).then((data) => onReplied(data.ticket));
    channel.bind('new-reply', refetch);
    channel.bind('status-changed', refetch);
    return () => {
      channel.unbind('new-reply', refetch);
      channel.unbind('status-changed', refetch);
      pusher.unsubscribe(`support-ticket-${ticket.id}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const handleSend = async () => {
    setError('');
    if (!message.trim() && !file) return;
    setIsSending(true);
    try {
      const attachmentUrl = file ? await uploadSupportAttachment(file) : undefined;
      await addSupportTicketReply(ticket.id, message, attachmentUrl);
      const data = await getSupportTicket(ticket.id);
      onReplied(data.ticket);
      setMessage('');
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Groups messages by calendar day for the "Oct 5, 2026" dividers.
  const allMessages = [
    { ...ticket, authorName: ticket.raisedByName, fromSelf: true },
    ...ticket.replies.map((r) => ({ ...r, fromSelf: !r.isSuperAdmin, authorName: r.isSuperAdmin ? 'Support Team' : r.authorName })),
  ];
  let lastDay = null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 min-w-0">
        <button type="button" onClick={onBack} className="text-gray-500 hover:text-gray-700 cursor-pointer shrink-0">
          <FiArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-base font-bold text-gray-900 truncate">{ticket.subject}</p>
      </div>

      <div className="space-y-3 max-h-[42vh] overflow-y-auto mb-4 scrollbar-none">
        {allMessages.map((item, index) => {
          const day = dayLabel(item.createdAt);
          const showDivider = day !== lastDay;
          lastDay = day;
          return (
            <div key={item.id || index}>
              {showDivider && (
                <p className="text-center text-xs text-gray-400 my-3">{day}</p>
              )}
              <ThreadBubble authorName={item.authorName} message={item.message} attachmentUrl={item.attachmentUrl} createdAt={item.createdAt} fromSelf={item.fromSelf} />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {canReply ? (
        <div className="space-y-2">
          {file && (
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
              <FiFileText className="w-4 h-4 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-700 truncate flex-1">{file.name}</p>
              <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <FiX className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer shrink-0">
              <input type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <FiPaperclip className="w-4 h-4" />
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your reply..."
              rows={1}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || (!message.trim() && !file)}
              className="flex items-center justify-center w-11 h-11 rounded-full text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center">This ticket is closed.</p>
      )}
    </div>
  );
}

function ThreadBubble({ message, attachmentUrl, createdAt, fromSelf }) {
  return (
    <div className={`flex ${fromSelf ? 'justify-end' : 'justify-start'}`}>
      <div className="relative max-w-[75%]">
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            fromSelf ? 'bg-indigo-50 text-gray-900 rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }`}
        >
          {message && <p className="text-sm whitespace-pre-wrap">{message}</p>}
          {attachmentUrl && (
            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
              <img src={attachmentUrl} alt="Attachment" className="max-w-full rounded-lg border border-gray-200" />
            </a>
          )}
          <p className="text-[11px] text-gray-400 mt-1">{timeAgo(createdAt)}</p>
        </div>
        <span
          className={`absolute bottom-0 w-2.5 h-2.5 ${fromSelf ? '-right-1 bg-indigo-50' : '-left-1 bg-gray-100'}`}
          style={{ clipPath: fromSelf ? 'polygon(0 0, 100% 100%, 0 100%)' : 'polygon(100% 0, 100% 100%, 0 100%)' }}
        />
      </div>
    </div>
  );
}
