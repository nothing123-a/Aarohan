import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface FileUploadProps {
  label?: string;
  description?: string;
  accept?: string;
  maxSizeBytes?: number;
  value?: File | null;
  onChange?: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function FileUpload({
  label,
  description = "PDF, JPG, or PNG up to 15MB",
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeBytes = 15 * 1024 * 1024, // 15MB default
  value,
  onChange,
  error: externalError,
  disabled = false,
  required = false,
  className,
}: FileUploadProps) {
  const [internalFile, setInternalFile] = useState<File | null>(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const file = value !== undefined ? value : internalFile;
  const activeError = externalError || validationError;

  const handleFileSelect = (selectedFile: File) => {
    setValidationError(null);

    // Validate size
    if (selectedFile.size > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      setValidationError(`File exceeds maximum size limit of ${maxMb}MB.`);
      return;
    }

    setInternalFile(selectedFile);
    onChange?.(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalFile(null);
    setValidationError(null);
    onChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      return <Image size={18} className="text-orange-500" />;
    }
    return <FileText size={18} className="text-orange-600" />;
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label}
          {required && <span className="text-orange-500 ml-0.5">*</span>}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {!file ? (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "p-6 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer select-none",
            isDragging
              ? "border-orange-500 bg-orange-50/60 scale-[0.99]"
              : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-orange-300",
            disabled && "opacity-60 cursor-not-allowed",
            activeError && "border-red-300 bg-red-50/30"
          )}
        >
          <div className="flex justify-center mb-2.5">
            <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <Upload size={18} />
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-800">
            <span className="text-orange-600 hover:underline">Click to upload document</span> or drag & drop
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{description}</p>
        </div>
      ) : (
        <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
              {getFileIcon(file.name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                {file.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className="text-green-600 font-medium flex items-center gap-0.5">
                  <CheckCircle2 size={10} /> Ready for scrutiny
                </span>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleRemove}
            aria-label="Remove file"
            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
          >
            <X size={14} />
          </Button>
        </div>
      )}

      {activeError && (
        <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
          <AlertCircle size={12} className="flex-shrink-0" />
          <span>{activeError}</span>
        </p>
      )}
    </div>
  );
}
