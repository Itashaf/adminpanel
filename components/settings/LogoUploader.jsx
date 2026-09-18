'use client';

import { useRef, useState } from 'react';
import { FiUploadCloud, FiImage, FiX, FiRefreshCw, FiLoader } from 'react-icons/fi';
import { uploadSchoolLogo } from '@/lib/api';
import { STUDENT_PHOTO_ACCEPT_TYPES, MAX_STUDENT_PHOTO_BYTES } from '@/lib/studentConstants';

// Uploads straight to R2 (resized + re-encoded to WebP first — see
// lib/imageCompression.js), the same real-storage pattern every other
// photo in the app uses. Used to read the whole file as a base64 data URI
// and store that raw string directly in School.logoUrl — no compression at
// all, and every getSchoolSettings() read anywhere in the app dragged that
// multi-megabyte string along with it. `value`/`onChange` still carry a
// plain URL string, so BrandingForm.jsx's Controller wiring is unchanged.
export default function LogoUploader({ value, onChange, error }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef(null);

  const readFile = async (file) => {
    setUploadError('');
    if (!file) return;
    if (!STUDENT_PHOTO_ACCEPT_TYPES.includes(file.type)) {
      setUploadError('Only JPG, PNG, or WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_STUDENT_PHOTO_BYTES) {
      setUploadError('Logo must be 2MB or smaller.');
      return;
    }
    setIsUploading(true);
    try {
      const publicUrl = await uploadSchoolLogo(file);
      onChange(publicUrl);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    readFile(e.dataTransfer.files?.[0]);
  };

  const displayError = error || uploadError;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {value ? (
          <div
            className={`relative w-40 h-40 rounded-2xl overflow-hidden border bg-gray-50 shrink-0 ${
              displayError ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            <img src={value} alt="School logo" className="w-full h-full object-contain p-3" />
            {isUploading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <FiLoader className="w-6 h-6 text-violet-600 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 w-40 h-40 rounded-2xl border-2 border-dashed text-center px-3 cursor-pointer transition shrink-0 ${
              displayError
                ? 'border-red-300 bg-red-50/40'
                : isDragActive
                ? 'border-indigo-400 bg-indigo-50/50'
                : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
            }`}
          >
            {isUploading ? (
              <FiLoader className="w-7 h-7 text-violet-600 animate-spin" />
            ) : (
              <>
                <FiUploadCloud className="w-7 h-7 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Upload School Logo</p>
                <p className="text-xs text-gray-400">Drag &amp; drop or click</p>
              </>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => readFile(e.target.files?.[0])}
          />

          {value ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3.5 py-2 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-white border border-gray-200 rounded-lg px-3.5 py-2 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
              >
                <FiX className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <FiImage className="w-3.5 h-3.5 shrink-0" />
              Recommended: square PNG, at least 512×512px, transparent background works best.
            </p>
          )}
          {displayError && <p className="text-xs text-red-500 mt-2">{displayError}</p>}
        </div>
      </div>
    </div>
  );
}
