'use client';

import Link from 'next/link';
import { FiArrowLeft, FiCalendar, FiClock, FiMapPin, FiAward, FiUserX, FiPrinter } from 'react-icons/fi';
import Badge from '@/components/Badge';
import { printReportCard } from '@/components/exams/printReportCard';

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeRange(start, end) {
  if (!start && !end) return '';
  return [start, end].filter(Boolean).join(' – ');
}

export default function ParentExamDetailView({ exam, schedules, result, student, school }) {
  return (
    <div className="space-y-6">
      <Link href="/parent/exams" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <FiArrowLeft className="w-4 h-4" />
        Back to Exams
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{exam.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {exam.examType} • {exam.academicSession} • {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
        </p>
        {exam.description && <p className="text-sm text-gray-600 mt-2 max-w-2xl">{exam.description}</p>}
      </div>

      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-50 text-violet-600 shrink-0">
              <FiAward className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-900">Result</p>
              <p className="text-xs text-gray-400">
                {student.firstName} {student.lastName} — {student.admissionId}
              </p>
            </div>
            <span className="ml-auto flex items-center gap-3">
              <Badge label={result.isPass ? 'Pass' : 'Fail'} variant={result.isPass ? 'green' : 'red'} />
              <button
                type="button"
                onClick={() => printReportCard({ school, result })}
                className="flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-800 cursor-pointer"
              >
                <FiPrinter className="w-4 h-4" />
                Print
              </button>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500">Total Marks</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">
                {result.totalMarks} / {result.totalMaxMarks}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500">Percentage</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{result.percentage.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500">Grade</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{result.grade}</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subject-wise Marks</p>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {result.subjectWise.map((s) => (
              <div key={s.subject} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-700">{s.subject}</span>
                {s.isAbsent ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                    <FiUserX className="w-3.5 h-3.5" />
                    Absent
                  </span>
                ) : (
                  <span className="text-sm font-medium text-gray-900">
                    {s.marksObtained} / {s.maxMarks}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && (
        <div className="flex flex-col items-center text-center py-6">
          <FiClock className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-gray-500 mt-3">Result not published yet</p>
          <p className="text-xs text-gray-400 mt-1">Check back after the school completes verification.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">Exam Schedule</p>
        </div>
        {schedules.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No date sheet published yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{s.subject}</p>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(s.examDate)}
                    </span>
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
                <span className="text-xs text-gray-500 shrink-0">Max {s.maxMarks}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
