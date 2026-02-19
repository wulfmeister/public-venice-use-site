'use client';

import { formatFileSize } from '@/lib/file-parser';
import { UploadedFile } from '@/lib/types';
import { ImageAttachment } from './input-types';
import { X, BarChart3, FileText, Table2 } from 'lucide-react';

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-[var(--accent)]" />;
  if (ext === 'xlsx' || ext === 'xls') return <Table2 className="w-4 h-4 text-[var(--accent)]" />;
  return <BarChart3 className="w-4 h-4 text-[var(--accent)]" />;
}

interface InputAttachmentsProps {
  uploadedFiles: UploadedFile[];
  imageAttachment: ImageAttachment | null;
  modelSwitchNotice: string;
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
  onRemoveImage: () => void;
}

export default function InputAttachments({
  uploadedFiles,
  imageAttachment,
  modelSwitchNotice,
  onRemoveFile,
  onClearFiles,
  onRemoveImage
}: InputAttachmentsProps) {
  return (
    <>
      {uploadedFiles.length > 0 && (
        <div className="uploaded-files-bar flex items-start gap-3 p-3 mb-3 bg-[var(--accent)] bg-opacity-10 border border-[var(--accent)] rounded-lg animate-slide-down">
          <span className="uploaded-files-label text-[var(--text-secondary)] text-sm font-medium whitespace-nowrap flex items-center gap-1.5">
            <FileIcon name={uploadedFiles[0]?.name ?? 'file.csv'} /> Data loaded:
          </span>
          <div className="uploaded-files-list flex flex-wrap gap-2 flex-1">
            {uploadedFiles.map((file: UploadedFile) => (
              <div key={file.id} className="uploaded-file flex items-center gap-2 px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md text-xs text-[var(--text-primary)]">
                <span className="file-name max-w-40 overflow-hidden text-ellipsis whitespace-nowrap" title={file.name}>
                  {file.name}
                </span>
                <span className="file-size text-[var(--text-secondary)]">
                  {formatFileSize(file.size)}
                </span>
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="remove-file bg-transparent border-none text-[var(--text-secondary)] cursor-pointer p-0 ml-2 flex items-center justify-center w-4 h-4 rounded hover:bg-black hover:bg-opacity-10 hover:text-red-400 transition-all duration-200"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={onClearFiles}
            className="clear-files-btn bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-1 rounded-md text-xs cursor-pointer transition-all duration-200 whitespace-nowrap hover:bg-[var(--border-color)] hover:text-[var(--button-text)]"
          >
            Clear
          </button>
        </div>
      )}

      {imageAttachment && (
        <div className="flex items-center gap-3 p-3 mb-3 bg-[var(--shadow-light)] border border-[var(--border-color)] rounded-lg animate-slide-down">
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center">
            <img
              src={imageAttachment.dataUrl}
              alt={imageAttachment.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--text-primary)] truncate">
              {imageAttachment.name}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {formatFileSize(imageAttachment.size)}
            </div>
          </div>
          <button
            onClick={onRemoveImage}
            className="remove-file bg-transparent border-none text-[var(--text-secondary)] cursor-pointer p-1 ml-2 flex items-center justify-center w-6 h-6 rounded hover:bg-black hover:bg-opacity-10 hover:text-red-400 transition-all duration-200"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {modelSwitchNotice && (
        <div className="text-xs text-[var(--text-secondary)] mb-3 text-center">
          {modelSwitchNotice}
        </div>
      )}
    </>
  );
}
