'use client';

import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { FiUploadCloud, FiDownload, FiFileText, FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Dropdown from '@/components/Dropdown';
import MonthPicker from '@/components/MonthPicker';
import { previewMonthlyImport, commitMonthlyImport } from '@/lib/api';
import { useClassSections, getSectionOptions, classHasSections } from '@/lib/hooks/useClassSections';

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

// Same Download Template -> Fill Excel -> Upload -> Preview -> Validate ->
// Import flow as the old /monthly/import page — this modal just replaces
// that dedicated screen, it doesn't change the underlying flow or API
// calls (previewMonthlyImport/commitMonthlyImport still both hit real
// server validation).
export default function BulkImportModal({
  isOpen,
  onClose,
  classOptions,
  defaultAcademicSession,
  defaultMonth,
  defaultClassName = '',
  defaultSectionName = '',
  onImported,
}) {
  const fileInputRef = useRef(null);
  const classSections = useClassSections();

  const [academicSession, setAcademicSession] = useState(defaultAcademicSession);
  const [month, setMonth] = useState(defaultMonth || currentMonth());
  const [className, setClassName] = useState(defaultClassName);
  const [sectionName, setSectionName] = useState(defaultSectionName);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState(null);
  const [preview, setPreview] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  // Popup opens pre-filled with whatever session/month/class/section the
  // dashboard behind it is currently filtered to, instead of always
  // starting blank — re-synced every time it opens, not just on first mount.
  useEffect(() => {
    if (!isOpen) return;
    setAcademicSession(defaultAcademicSession);
    setMonth(defaultMonth || currentMonth());
    setClassName(defaultClassName);
    setSectionName(defaultSectionName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const needsSection = className ? classHasSections(classSections, className) : true;
  const scopeReady = academicSession && className && (!needsSection || sectionName);
  const templateUrl = scopeReady
    ? `/api/performance/monthly/import/template?${new URLSearchParams({ class: className, section: sectionName, academicSession }).toString()}`
    : null;

  const reset = () => {
    setFileName('');
    setParsedRows(null);
    setPreview(null);
    setCommitResult(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file) => {
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

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!scopeReady) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleImport = async () => {
    setIsBusy(true);
    setError('');
    try {
      const result = await commitMonthlyImport({ className, sectionName, academicSession, month, ...parsedRows });
      setCommitResult(result);
      onImported?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      icon={<FiFileText className="w-6 h-6" />}
      title="Bulk Import"
      description={`Session ${academicSession}`}
      size="xl"
      footer={
        commitResult ? (
          <Button label="Close" fullWidth onClick={handleClose} />
        ) : (
          <div className="flex gap-3">
            <Button label="Cancel" variant="secondary" fullWidth onClick={handleClose} />
            <Button
              label={isBusy ? 'Importing...' : 'Import'}
              fullWidth
              onClick={handleImport}
              disabled={isBusy || !preview || preview.successCount === 0}
            />
          </div>
        )
      }
    >
      <div className="space-y-4 pb-[10px]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">Month</label>
            <MonthPicker value={month} onChange={setMonth} placeholder="Select month" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Class</label>
            <Dropdown
              placeholder="Class"
              value={className}
              onChange={(v) => {
                setClassName(v);
                setSectionName('');
              }}
              options={classOptions}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Section</label>
            <Dropdown
              placeholder={!className ? 'Section' : needsSection ? 'Section' : 'No sections for this class'}
              value={sectionName}
              onChange={setSectionName}
              options={getSectionOptions(classSections, className)}
              disabled={!className || !needsSection}
            />
          </div>
        </div>

        {!commitResult && scopeReady && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                <FiFileText className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900">Download Template</p>
                <p className="text-sm text-gray-500">Use this template to add all students data at once </p>
              </div>
            </div>
            <a href={templateUrl} className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-white text-gray-900 hover:bg-gray-50 transition cursor-pointer"
              >
                Download
                <FiDownload className="w-4 h-4" />
              </button>
            </a>
          </div>
        )}

        {!commitResult && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (scopeReady) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${isDragging ? 'border-indigo-400 bg-indigo-50/50' : 'border-gray-200 bg-gray-50/50'
              } ${!scopeReady ? 'opacity-50' : ''}`}
          >
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <FiUploadCloud className="w-6 h-6" />
            </div>
            <p className="font-bold text-gray-900">Upload Excel File</p>
            <p className="text-sm text-gray-500 mt-1 hidden sm:block">Drag and drop your file here, or click to browse</p>
            <p className="text-sm text-gray-500 mt-1 sm:hidden">Tap to choose file or select from files</p>
            <p className="text-xs text-gray-400 mt-1">Only .xlsx or .xls files are allowed (max 5MB)</p>
            <label className="inline-flex mt-4">
              <Button label={fileName || 'Choose File'} icon={<FiUploadCloud className="w-4 h-4" />} disabled={!scopeReady} onClick={() => fileInputRef.current?.click()} />
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFile(e.target.files?.[0])}
                disabled={!scopeReady}
                className="hidden"
              />
            </label>
            {!scopeReady && <p className="text-xs text-gray-400 mt-3">Pick a session, class and section first.</p>}
          </div>
        )}

        {!commitResult && (
          <details className="bg-gray-50 rounded-xl px-4 py-2.5" open>
            <summary className="flex items-center gap-2 text-xs font-semibold text-gray-900 cursor-pointer">
              <FiInfo className="w-3.5 h-3.5 text-gray-400" />
              Important Instructions
            </summary>
            <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-gray-500 list-disc pl-8">
              <li>Use only the provided template.</li>
              <li>Keep sheet names & headers unchanged.</li>
            </ul>
          </details>
        )}

        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

        {isBusy && !preview && !commitResult && <p className="text-sm text-gray-400 text-center py-4">Validating...</p>}

        {preview && !commitResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Total Records" value={preview.totalRecords} />
              <MiniStat label="Success" value={preview.successCount} accent="text-emerald-600" />
              <MiniStat label="Errors" value={preview.errorCount} accent="text-red-600" />
              <MiniStat label="Warnings" value={preview.warnings.length} accent="text-amber-600" />
            </div>
            {preview.errors.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {preview.errors.map((e, i) => (
                  <p key={i} className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    <FiAlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {e.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {commitResult && (
          <div className="text-center space-y-3 py-2">
            <FiCheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-lg font-bold text-gray-900">{commitResult.successCount} of {commitResult.totalRecords} imported</p>
            {commitResult.errorCount > 0 && <p className="text-sm text-red-500">{commitResult.errorCount} row(s) failed — see details below.</p>}
            {commitResult.errors.length > 0 && (
              <div className="text-left space-y-1.5 max-h-40 overflow-y-auto">
                {commitResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{e.message}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function MiniStat({ label, value, accent = 'text-gray-900' }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}
