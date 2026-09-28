"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

function Tile({ src, cover, onRemove }: { src: string; cover: boolean; onRemove: () => void }) {
  return (
    <div className="relative aspect-square photo-tile">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="w-full h-full object-cover" />
      {cover && (
        <span className="absolute bottom-1 left-1 bg-brand text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
          Portada
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar foto"
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white grid place-items-center"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Selector de fotos: muestra cuántas van, cuál es la portada y deja quitar/agregar.
export default function PhotoPicker({
  existing = [],
  onExistingChange,
  files,
  onFilesChange,
  max = 6,
}: {
  existing?: string[];
  onExistingChange?: (urls: string[]) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previews]);

  const total = existing.length + files.length;

  function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    const room = Math.max(max - total, 0);
    const picked = Array.from(list).slice(0, room);
    setNote(list.length > room ? `Solo caben ${max} fotos: se agregaron ${picked.length}.` : null);
    onFilesChange([...files, ...picked]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-semibold">Fotos</p>
        <p className="text-sm text-muted">
          <span className={total >= max ? "text-brand-text font-semibold" : ""}>
            {total}/{max}
          </span>
        </p>
      </div>

      {total === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-line py-8 grid place-items-center gap-1 text-muted hover:border-brand hover:text-fg transition"
        >
          <ImagePlus size={28} />
          <span className="font-semibold text-fg">Toca para agregar fotos</span>
          <span className="text-xs">Hasta {max} fotos — útil para lotes de varios autos</span>
        </button>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {existing.map((u, i) => (
            <Tile
              key={u}
              src={u}
              cover={i === 0}
              onRemove={() => onExistingChange?.(existing.filter((x) => x !== u))}
            />
          ))}
          {previews.map((u, i) => (
            <Tile
              key={u}
              src={u}
              cover={existing.length === 0 && i === 0}
              onRemove={() => onFilesChange(files.filter((_, j) => j !== i))}
            />
          ))}
          {total < max && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-line grid place-items-center text-muted hover:border-brand hover:text-fg transition"
            >
              <span className="grid place-items-center gap-0.5 text-xs font-semibold">
                <ImagePlus size={22} />
                Agregar
              </span>
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-muted mt-2">
        La primera foto es la portada. Toca la X para quitar una.
      </p>
      {note && <p className="text-xs text-flame mt-1">{note}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />
    </div>
  );
}
