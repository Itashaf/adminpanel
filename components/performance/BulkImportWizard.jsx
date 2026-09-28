'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiDownload, FiUploadCloud, FiCheckCircle, FiAlertTriangle, FiFile } from 'react-icons/fi';
import Button from '@/components/Button';
import Dropdown from '@/components/Dropdown';
import { previewMonthlyImport, commitMonthlyImport } from '@/lib/api';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function parseWorkbook(workbook) {
  const sheetRows = (name) => {
    const sheet = workbook.Sheets[name];
    return sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) : [];
  };
  return {
    activities: sheetRows('Activities'),
    holistic: sheetRows('Holistic Assessment'),
    remarks: sheetRows('Remarks'),
  };
}

// Download Template -> Fill Excel -> Upload -> Preview -> Validate ->
// Import, exactly the flow the plan promised. Preview and Import both hit
// real server validation (previewMonthlyImport/commitMonthlyImport) —
// Import re-validates from scratch rather than trusting the preview
// result, since a locked report or a since-transferred student could have
// changed state in between.
export default function BulkImportWizard({ classOptions, sessionOptions, defaultAcademicSession }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const classSections = useClassSections();

  const [academicSession, setAcademicSession] = useState(defaultAcademicSession);
  const [month, setMonth] = useState(currentMonth());
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState(null);
  const [preview, setPreview] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const scopeReady = academicSession && className && sectionName;

  const templateUrl = scopeReady
    ? `/api/performance/monthly/import/template?${new URLSearchParams({ class: className, section: sectionName, academicSession }).toString()}`
    : null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setParsedRows(null);
    setPreview(null);
    setCommitResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const rows = parseWorkbook(workbook);
      setParsedRows(rows);

      setIsBusy(true);
      const result = await previewMonthlyImport({ className, sectionName, academicSession, ...rows });
      setPreview(result);
    } catch (err) {
      setError(err.message || 'Could not read this file. Make sure it is a valid .xlsx file.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async () => {
    setIsBusy(true);
    setError('');
    try {
      const result = await commitMonthlyImport({ className, sectionName, academicSession, month, ...parsedRows });
      setCommitResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        type="button"
        onClick={() => router.push('/dashboard/performance/monthly')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
      >
        <FiArrowLeft className="w-4 h-4" />
        Monthly Reports
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Import</h1>
        <p className="text-sm text-gray-500 mt-1">Activities, Holistic Assessment and Remarks — one Excel file, three sheets.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Dropdown placeholder="Session" value={academicSession} onChange={setAcademicSession} options={sessionOptions} />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Dropdown
            placeholder="Class"
            value={className}
            onChange={(v) => {
              setClassName(v);
              setSectionName('');
            }}
            options={classOptions}
          />
          <Dropdown placeholder="Section" value={sectionName} onChange={setSectionName} options={getSectionOptions(classSections, className)} disabled={!className} />
        </div>

        {!scopeReady && <p className="text-xs text-gray-400">Pick a session, class and section to download the template for.</p>}

        {scopeReady && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
            <a href={templateUrl} className="inline-flex">
              <Button label="Download Template" variant="secondary" icon={<FiDownload className="w-4 h-4" />} />
            </a>

            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
              <FiUploadCloud className="w-4 h-4" />
              {fileName || 'Upload filled Excel'}
              <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      {isBusy && !preview && <p className="text-sm text-gray-400 text-center py-6">Validating...</p>}

      {preview && !commitResult && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Preview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat label="Total Records" value={preview.totalRecords} />
            <MiniStat label="Success" value={preview.successCount} accent="text-emerald-600" />
            <MiniStat label="Errors" value={preview.errorCount} accent="text-red-600" />
            <MiniStat label="Warnings" value={preview.warnings.length} accent="text-amber-600" />
          </div>

          {preview.errors.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {preview.errors.map((e, i) => (
                <p key={i} className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <FiAlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {e.message}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button label={isBusy ? 'Importing...' : `Import ${preview.successCount} Record${preview.successCount === 1 ? '' : 's'}`} onClick={handleImport} disabled={isBusy || preview.successCount === 0} />
          </div>
        </div>
      )}

      {commitResult && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-3">
          <FiCheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="text-lg font-bold text-gray-900">{commitResult.successCount} of {commitResult.totalRecords} imported</p>
          {commitResult.errorCount > 0 && <p className="text-sm text-red-500">{commitResult.errorCount} row(s) failed — see details below.</p>}
          {commitResult.errors.length > 0 && (
            <div className="text-left space-y-1.5 max-h-48 overflow-y-auto">
              {commitResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{e.message}</p>
              ))}
            </div>
          )}
          <Button label="Back to Dashboard" onClick={() => router.push(`/dashboard/performance/monthly?academicSession=${encodeURIComponent(academicSession)}&month=${month}`)} />
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        <FiFile className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
        Only fill in rows for students you have something to record — a blank row is skipped, not an error.
      </p>
    </div>
  );
}

function MiniStat({ label, value, accent = 'text-gray-900' }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}
