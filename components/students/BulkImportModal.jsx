'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { FiUploadCloud, FiDownload, FiFileText, FiCheckCircle, FiAlertTriangle, FiFile, FiX, FiUsers, FiCheck } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { parseSheetNameForClassSection, normalizeRow, isRowBlank } from '@/lib/bulkImportColumns';
import { buildBulkImportRowSchema } from '@/lib/schemas';
import { bulkImportStudents } from '@/lib/api';
import { useClassSections } from '@/lib/hooks/useClassSections';

// Reads every sheet in the workbook (not just the active/first one) — a
// workbook with classwise tabs ("Class 6 - A", "Class 8 - B", ...) imports
// all of them in one go, with each row's own Class/Section columns (if
// filled) taking priority over the tab name.
function parseWorkbook(workbook) {
  const rows = [];
  workbook.SheetNames.forEach((sheetName) => {
    if (sheetName.trim().toLowerCase() === 'instructions') return;
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    const fallback = parseSheetNameForClassSection(sheetName);

    rawRows.forEach((rawRow, index) => {
      const row = normalizeRow(rawRow, fallback);
      if (isRowBlank(row)) return;
      rows.push({ ...row, _sheet: sheetName, _rowNumber: index + 2 });
    });
  });
  return rows;
}

function validateRows(rows, classSections) {
  const schema = buildBulkImportRowSchema(classSections);
  return rows.map((row) => {
    const result = schema.safeParse(row);
    const errors = result.success ? [] : result.error.issues.map((issue) => issue.message);
    return { row, errors };
  });
}

// Same flow as the single Add Student form, just batched: pick a file →
// preview what will/won't import → commit → see what landed. Lives in a
// modal (not its own page) so it can hand the newly created students
// straight back to StudentsExplorer's local state — same optimistic-update
// convention as every other mutation in this module, no router.refresh().
export default function BulkImportModal({ isOpen, onClose, onImported }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState(null);
  const [parseError, setParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);
  const classSections = useClassSections();

  const validCount = parsedRows ? parsedRows.filter((r) => r.errors.length === 0).length : 0;
  const invalidCount = parsedRows ? parsedRows.length - validCount : 0;

  const resetState = () => {
    setFileName('');
    setParsedRows(null);
    setParseError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setParsedRows(null);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const rows = parseWorkbook(workbook);
      if (rows.length === 0) {
        setParseError('No student rows found in this file — check the sheet has data below the header row.');
        return;
      }
      setParsedRows(validateRows(rows, classSections));
    } catch (err) {
      setParseError('Could not read this file. Make sure it is a valid .xlsx or .csv file.');
    }
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.errors.length === 0).map((r) => r.row);
    setIsImporting(true);
    try {
      const response = await bulkImportStudents(validRows);
      setResult(response);
      if (response.imported.length > 0) onImported(response.imported);
    } catch (err) {
      setParseError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      title="Bulk Import Students"
      description="Add many students at once from an Excel or CSV file."
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      footer={
        result ? (
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={resetState}
              className="px-4 py-2.5 rounded-lg font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
            >
              Import Another File
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
            >
              OK
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <div className="w-full sm:w-auto">
              <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
            </div>
            {parsedRows && (
              <button
                type="button"
                onClick={handleImport}
                disabled={validCount === 0 || isImporting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Importing...' : `Import ${validCount} Student(s)`}
              </button>
            )}
          </div>
        )
      }
    >
      <div className="space-y-4 py-1">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-600">
              A workbook can have multiple classwise tabs (e.g. "Class 8 - A") — every tab is imported together.
            </p>
            <div className="flex gap-2 shrink-0">
              <a
                href="/api/students/bulk-import/blank-template"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
              >
                <FiFileText className="w-4 h-4" />
                Blank Template
              </a>
              <a
                href="/api/students/bulk-import/template"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
              >
                <FiDownload className="w-4 h-4" />
                Sample Excel
              </a>
            </div>
          </div>
        </div>

        {!fileName ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition cursor-pointer"
          >
            <FiUploadCloud className="w-8 h-8 text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">Click to choose a .xlsx or .csv file</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50">
            <FiFile className="w-5 h-5 text-indigo-600 shrink-0" />
            <span className="text-sm text-gray-700 flex-1 truncate">{fileName}</span>
            <button type="button" onClick={resetState} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {parseError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{parseError}</p>
        )}

        {parsedRows && !result && (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="text-green-700 font-medium">{validCount} ready to import</span>
              {invalidCount > 0 && (
                <span className="text-amber-600 font-medium"> · {invalidCount} need fixing (won't be imported)</span>
              )}
            </p>

            <div className="overflow-x-auto max-h-[320px] overflow-y-auto border border-gray-100 rounded-xl">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="py-2 px-3">Sheet</th>
                    <th className="py-2 px-3">Row</th>
                    <th className="py-2 px-3">Admission No.</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Class</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map(({ row, errors }, index) => (
                    <tr key={index} className={`border-t border-gray-100 ${errors.length > 0 ? 'bg-red-50/50' : ''}`}>
                      <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{row._sheet}</td>
                      <td className="py-2 px-3 text-gray-500">{row._rowNumber}</td>
                      <td className="py-2 px-3 text-gray-900 whitespace-nowrap">{row.admissionNumber || '—'}</td>
                      <td className="py-2 px-3 text-gray-900 whitespace-nowrap">
                        {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                        {row.class}
                        {row.section ? ` - ${row.section}` : ''}
                      </td>
                      <td className="py-2 px-3">
                        {errors.length === 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                            <FiCheckCircle className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700"
                            title={errors.join(' ')}
                          >
                            <FiAlertTriangle className="w-3.5 h-3.5 shrink-0" /> {errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 mb-4">
                <FiUsers className="w-9 h-9 text-indigo-600" />
                <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-white ring-4 ring-white">
                  <FiCheck className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Successfully added {result.importedCount} student{result.importedCount === 1 ? '' : 's'}
              </h3>
              {result.skipped.length > 0 && (
                <p className="text-sm text-amber-600 mt-1">{result.skipped.length} row(s) skipped — see below</p>
              )}
            </div>

            {result.skipped.length > 0 && (
              <div className="overflow-x-auto max-h-[240px] overflow-y-auto border border-gray-100 rounded-xl">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="py-2 px-3">Admission No.</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Reason skipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.skipped.map(({ row, reason }, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="py-2 px-3 text-gray-900 whitespace-nowrap">{row.admissionNumber || '—'}</td>
                        <td className="py-2 px-3 text-gray-900 whitespace-nowrap">
                          {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="py-2 px-3 text-amber-700">{reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
