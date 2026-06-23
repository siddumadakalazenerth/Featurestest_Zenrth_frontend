'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UploadDropzoneProps {
  onUpload: (files: File[]) => Promise<void>;
  onReplace: (photoId: string, file: File) => Promise<void>;
  existingPhotoCount: number;
  existingBytes: number;
}

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

export function UploadDropzone({ onUpload, onReplace, existingPhotoCount, existingBytes }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedRoom, setRequestedRoom] = useState<string | null>(null);
  const [replacementPhotoId, setReplacementPhotoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = !replacementPhotoId && existingPhotoCount >= MAX_PHOTOS;

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ roomType?: string | null; photoId?: string | null }>).detail;
      setRequestedRoom(detail?.roomType || null);
      setReplacementPhotoId(detail?.photoId || null);
      inputRef.current?.click();
    }
    window.addEventListener('zenrth:upload-request', handler);
    return () => window.removeEventListener('zenrth:upload-request', handler);
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const incomingBytes = files.reduce((s, f) => s + f.size, 0);

    if (!replacementPhotoId && existingPhotoCount + files.length > MAX_PHOTOS) {
      setError(`Max 5 photos per listing. You can add ${Math.max(0, MAX_PHOTOS - existingPhotoCount)} more.`);
      return;
    }
    if (!replacementPhotoId && existingBytes + incomingBytes > MAX_BYTES) {
      setError('Photos must total 5 MB or less per listing.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (replacementPhotoId) await onReplace(replacementPhotoId, files[0]);
      else await onUpload(files);
      setRequestedRoom(null);
      setReplacementPhotoId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [existingBytes, existingPhotoCount, onReplace, onUpload, replacementPhotoId]);

  if (atLimit) {
    return (
      <div className="rounded-xl border border-hairline bg-paper px-5 py-4 flex items-center justify-between text-sm text-ink/40">
        <span>5/5 photos uploaded</span>
        <span className="text-xs font-medium text-approved">Photo limit reached</span>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
      onClick={() => !busy && inputRef.current?.click()}
      className={`relative rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all ${
        dragging
          ? 'border-analysis bg-analysis-soft scale-[1.01]'
          : 'border-hairline bg-surface hover:border-analysis/50 hover:bg-paper'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple={!replacementPhotoId}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {busy ? (
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-analysis border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-analysis">Uploading…</p>
        </div>
      ) : (
        <>
          <div className="text-3xl mb-2">{dragging ? '📂' : '📷'}</div>
          <p className="font-display font-semibold text-base">
            {replacementPhotoId
              ? `Choose a replacement ${requestedRoom?.toLowerCase() || 'photo'}`
              : requestedRoom
                ? `Upload a ${requestedRoom.toLowerCase()} photo`
                : 'Drop photos here'}
          </p>
          <p className="text-sm text-ink/45 mt-1">
            {requestedRoom
              ? 'Landscape, from the doorway, lights on'
              : 'or click to browse · up to 5 photos · 5 MB total'}
          </p>
          <p className="text-xs text-ink/30 mt-2">
            {existingPhotoCount}/5 photos · {(existingBytes / 1024 / 1024).toFixed(1)}/5 MB used
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 text-xs text-skip bg-skip-soft rounded-lg px-3 py-2 inline-block">{error}</p>
      )}
    </div>
  );
}
