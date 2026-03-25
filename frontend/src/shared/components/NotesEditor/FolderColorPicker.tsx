import { FOLDER_COLORS, type FolderColorKey } from '@/shared/types/note.types';

interface FolderColorPickerProps {
  value: string;
  onChange: (color: FolderColorKey) => void;
}

export function FolderColorPicker({ value, onChange }: FolderColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5 p-1">
      {(Object.entries(FOLDER_COLORS) as [FolderColorKey, string][]).map(([key, hex]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`w-5 h-5 rounded-full transition-all hover:scale-110 ${value === key ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-800' : ''}`}
          style={{ backgroundColor: hex }}
          title={key}
        />
      ))}
    </div>
  );
}
