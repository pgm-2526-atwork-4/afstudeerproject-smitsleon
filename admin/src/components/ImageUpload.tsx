import { useRef, useState } from 'react';
import { supabaseAdmin } from '../lib/supabase';

interface Props {
  value: string | null;
  folder: string;
  onChange: (url: string | null) => void;
}

export default function ImageUpload({ value, folder, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${folder}/${Date.now()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from('admin-images')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      console.error('Upload error:', error);
      alert('Upload mislukt. Probeer opnieuw.');
      setUploading(false);
      return;
    }

    const { data } = supabaseAdmin.storage.from('admin-images').getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <label className="block text-xs text-cb-text-muted mb-1">Afbeelding</label>

      {/* Preview */}
      {value && (
        <div className="relative mb-2 inline-block">
          <img
            src={value}
            alt="Preview"
            className="h-24 w-24 rounded-lg object-cover border border-cb-border"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-cb-error text-white text-xs flex items-center justify-center hover:bg-cb-error/80 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload button */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-lg border border-dashed border-cb-border bg-cb-surface-light/50 hover:bg-cb-surface-light px-3 py-2 text-sm text-cb-text-secondary transition-colors cursor-pointer disabled:opacity-50"
      >
        {uploading ? 'Uploaden...' : value ? 'Andere afbeelding kiezen' : 'Afbeelding uploaden'}
      </button>
    </div>
  );
}
