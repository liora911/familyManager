"use client";

import { useState, useRef, useCallback } from "react";
import { clientUpload, isAllowedFile, formatFileSize } from "@/lib/upload";

export interface Attachment {
  url: string;
  filename: string;
  label?: string;
}

interface FileUploadProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
}

export default function FileUpload({ attachments, onChange }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isAllowedFile(file)) {
        setError("סוג קובץ לא נתמך. ניתן: PDF, תמונות");
        return;
      }
      setError("");
      setIsUploading(true);
      setProgress(0);

      const result = await clientUpload(file, setProgress);

      setIsUploading(false);
      setProgress(0);

      if (result.success && result.url) {
        onChange([
          ...attachments,
          { url: result.url, filename: result.filename || file.name },
        ]);
      } else {
        setError(result.error || "העלאה נכשלה");
      }
    },
    [attachments, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = (index: number) => {
    onChange(attachments.filter((_, i) => i !== index));
  };

  const isImage = (url: string) =>
    /\.(jpg|jpeg|png|webp|gif|heic)(\?|$)/i.test(url);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-secondary">
        קבצים מצורפים
      </label>

      {/* Uploaded files list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att, i) => (
            <div
              key={att.url}
              className="flex items-center gap-2 bg-tag rounded-lg px-3 py-2"
            >
              <span className="text-sm">
                {isImage(att.url) ? "🖼️" : "📄"}
              </span>
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-link hover:underline truncate flex-1"
              >
                {att.label || att.filename}
              </a>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="text-muted hover:text-red-500 text-xs px-1 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / upload button */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
          isUploading
            ? "border-border bg-surface cursor-not-allowed"
            : isDragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-border hover:border-secondary hover:bg-hover"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div>
            <div className="text-sm text-secondary mb-2">
              מעלה... {progress > 0 && `${progress}%`}
            </div>
            {progress > 0 && (
              <div className="w-full max-w-[200px] mx-auto bg-border rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="text-lg mb-1">📎</div>
            <p className="text-xs text-secondary">גרור קובץ או לחץ להעלאה</p>
            <p className="text-[10px] text-muted mt-0.5">
              PDF, תמונות — עד 10MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-badge-red-bg rounded-lg px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
}
