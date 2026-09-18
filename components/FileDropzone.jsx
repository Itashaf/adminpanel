'use client';

import { useState, useRef } from 'react';
import { FiUploadCloud, FiFile, FiX } from 'react-icons/fi';

export default function FileDropzone({ label, accept, value, onFileSelect, error, required = false }) {
  const [internalFile, setInternalFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef(null);

  const isControlled = value !== undefined;
  const file = isControlled ? value : internalFile;

  const handleFile = (selected) => {
    if (!selected) return;
    if (!isControlled) setInternalFile(selected);
    onFileSelect?.(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleRemove = () => {
    if (!isControlled) setInternalFile(null);
    onFileSelect?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isFileObject = file instanceof File;
  // A stored value can be a real uploaded URL (e.g. Student Photo's
  // photoUrl) rather than a freshly-picked File — preview that as an image
  // too instead of falling through to the generic file icon + raw URL text.
  const isRemoteImageUrl = !isFileObject && typeof file === 'string' && /^https?:\/\//.test(file);
  const isImage = (isFileObject && file.type?.startsWith('image/')) || isRemoteImageUrl;
  const fileName = isFileObject ? file.name : file;
  const previewSrc = isFileObject ? URL.createObjectURL(file) : file;

  return (
    <div className="w-28">
      {file ? (
        <div
          className={`relative w-28 h-28 border rounded-lg overflow-hidden bg-gray-50 ${
            error ? 'border-red-400' : 'border-gray-200'
          }`}
        >
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-1 right-1 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-white shadow text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <FiX className="w-3 h-3" />
          </button>
          {isImage ? (
            <img
              src={previewSrc}
              alt={isRemoteImageUrl ? 'Preview' : fileName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-violet-700">
              <FiFile className="w-9 h-9" />
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
          className={`flex items-center justify-center w-28 h-28 border-2 border-dashed rounded-lg cursor-pointer transition ${
            error
              ? 'border-red-300 bg-red-50/40'
              : isDragActive
              ? 'border-indigo-400 bg-indigo-50/50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <FiUploadCloud className="w-6 h-6 text-gray-400" />
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      <p className="w-28 mt-2 text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2 break-words">
        {label} {required && <span className="text-red-500">*</span>}
      </p>

      {error && <p className="w-28 text-xs text-red-500 mt-1 text-center">{error}</p>}
    </div>
  );
}
