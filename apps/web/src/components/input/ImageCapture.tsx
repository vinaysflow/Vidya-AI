import { useRef, useState, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw, Check } from 'lucide-react';

interface ImageCaptureProps {
  onImageCaptured: (base64: string) => void;
  onCancel: () => void;
}

export function ImageCapture({ onImageCaptured, onCancel }: ImageCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) handleFile(file);
    },
    [handleFile],
  );

  if (preview) {
    return (
      <div className="relative bg-slate-900 rounded-xl overflow-hidden">
        <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" />
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
          <button
            onClick={() => setPreview(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700/90 text-white rounded-full text-sm hover:bg-slate-600"
          >
            <RotateCcw className="h-4 w-4" /> Retake
          </button>
          <button
            onClick={() => onImageCaptured(preview)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/90 text-white rounded-full text-sm hover:bg-blue-500"
          >
            <Check className="h-4 w-4" /> Use Photo
          </button>
        </div>
        <button
          onClick={onCancel}
          className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center"
    >
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Take a photo or upload an image of your problem
      </p>
      <div className="flex justify-center gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500"
        >
          <Camera className="h-4 w-4" /> Camera
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-300"
        >
          <Upload className="h-4 w-4" /> Upload
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
