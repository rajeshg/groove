import { COLOR_PRESETS } from "../constants/colors";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className="w-8 h-8 rounded transition-all hover:scale-110 shadow-sm border border-slate-300 dark:border-slate-600 relative flex items-center justify-center font-bold text-white"
            style={{ backgroundColor: preset.value }}
            title={preset.name}
            aria-label={`Select ${preset.name} color`}
          >
            {value === preset.value && (
              <span className="text-sm drop-shadow-md">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
