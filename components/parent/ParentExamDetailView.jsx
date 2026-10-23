'use client';

import Link from 'next/link';
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUserX,
  FiPrinter,
  FiPercent,
  FiTrendingUp,
  FiClipboard,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi';
import Badge from '@/components/Badge';
import ParentKPICard from '@/components/parent/ParentKPICard';
import { printReportCard } from '@/components/exams/printReportCard';

function subjectPercent(subject) {
  return !subject.isAbsent && subject.maxMarks > 0 ? Math.round((subject.marksObtained / subject.maxMarks) * 100) : 0;
}

// Card (sm and up, 5 across on large screens).
function SubjectMarksCard({ subject }) {
  const percent = subjectPercent(subject);
  return (
    <div className="rounded-2xl border border-gray-100 shadow-sm px-5 py-4 bg-white">
      <p className="text-sm font-semibold text-gray-900 truncate">{subject.subject}</p>

      <div className="flex items-end justify-between gap-2 mt-4">
        {subject.isAbsent ? (
          <span className="inline-flex items-center gap-1.5 text-base font-semibold text-red-600">
            <FiUserX className="w-4 h-4" />
            Absent
          </span>
        ) : (
          <>
            <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">
              {subject.marksObtained}
              <span className="text-lg font-medium text-gray-400"> / {subject.maxMarks}</span>
            </p>
            <span className="text-sm font-medium text-gray-500">{percent}%</span>
          </>
        )}
      </div>

      <div className="h-2 rounded-full bg-gray-100 mt-3 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// Plain list row (mobile only).
function SubjectMarksRow({ subject }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <span className="text-sm font-medium text-gray-800 truncate">{subject.subject}</span>
      {subject.isAbsent ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
          <FiUserX className="w-3.5 h-3.5" />
          Absent
        </span>
      ) : (
        <span className="text-sm text-gray-500 whitespace-nowrap">
          <span className="font-semibold text-gray-900">{subject.marksObtained}</span> / {subject.maxMarks} · {subjectPercent(subject)}%
        </span>
      )}
    </div>
  );
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeRange(start, end) {
  if (!start && !end) return '';
  return [start, end].filter(Boolean).join(' – ');
}

function SectionCard({ icon: Icon, title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <Icon className="w-[18px] h-[18px]" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{title}</p>
            {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function ParentExamDetailView({ exam, schedules, result, student, school }) {
  return (
    <div className="space-y-6">
      <Link href="/parent/exams" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
        <FiArrowLeft className="w-4 h-4" />
        Back to Exams
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">{exam.name}</h1>
        <p className="text-base text-gray-500 mt-1.5">
          {exam.examType} • {exam.academicSession} • {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
        </p>
        {exam.description && <p className="text-sm text-gray-600 mt-2 max-w-2xl">{exam.description}</p>}
      </div>

      {result ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ParentKPICard
              label="Total Marks"
              icon={<FiClipboard className="w-5 h-5" />}
              value={`${result.totalMarks} / ${result.totalMaxMarks}`}
              context={result.isPass ? 'Passed' : 'Did not pass'}
              dotClassName={result.isPass ? 'bg-green-400' : 'bg-red-400'}
            />
            <ParentKPICard
              label="Percentage"
              icon={<FiPercent className="w-5 h-5" />}
              value={`${result.percentage.toFixed(1)}%`}
              context={`${student.firstName} ${student.lastName}`}
              dotClassName="bg-sky-400"
            />
            <ParentKPICard
              label="Grade"
              icon={<FiTrendingUp className="w-5 h-5" />}
              value={result.grade}
              context={student.admissionId}
              dotClassName="bg-amber-400"
            />
          </div>

          <SectionCard
            title="Subject-wise Marks"
            subtitle={`${student.firstName} ${student.lastName} — ${student.admissionId}  |  ${exam.name}`}
            action={
              <span className="flex items-center gap-4 shrink-0">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                    result.isPass ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {result.isPass ? <FiCheckCircle className="w-4 h-4" /> : <FiXCircle className="w-4 h-4" />}
                  {result.isPass ? 'Pass' : 'Fail'}
                </span>
                <span className="hidden sm:block w-px h-8 bg-gray-200" />
                <button
                  type="button"
                  onClick={() => printReportCard({ school, result })}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
                >
                  <FiPrinter className="w-4 h-4" />
                  Print
                </button>
              </span>
            }
          >
            <div className="hidden sm:grid grid-cols-3 lg:grid-cols-5 gap-4 p-5">
              {result.subjectWise.map((s) => (
                <SubjectMarksCard key={s.subject} subject={s} />
              ))}
            </div>
            <div className="sm:hidden divide-y divide-gray-100">
              {result.subjectWise.map((s) => (
                <SubjectMarksRow key={s.subject} subject={s} />
              ))}
            </div>
          </SectionCard>
        </>
      ) : (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm flex flex-col items-center text-center py-10 px-6">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 text-gray-300">
            <FiClock className="w-6 h-6" />
          </span>
          <p className="text-base font-semibold text-gray-800 mt-3">Result not published yet</p>
          <p className="text-sm text-gray-400 mt-1">Check back after the school completes verification.</p>
        </div>
      )}

      <SectionCard icon={FiCalendar} title="Exam Schedule">
        {schedules.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No date sheet published yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {schedules.map((s) => {
              const date = new Date(`${s.examDate}T00:00:00`);
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 shrink-0 leading-tight">
                    <span className="text-base font-bold">{date.getDate()}</span>
                    <span className="text-xs">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.subject}</p>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                      {(s.startTime || s.endTime) && (
                        <span className="flex items-center gap-1">
                          <FiClock className="w-3.5 h-3.5 text-gray-400" />
                          {formatTimeRange(s.startTime, s.endTime)}
                        </span>
                      )}
                      {s.room && (
                        <span className="flex items-center gap-1">
                          <FiMapPin className="w-3.5 h-3.5 text-gray-400" />
                          {s.room}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge label={`Max ${s.maxMarks}`} variant="gray" />
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
