"use client";
import ZoomableImage from "./ZoomableImage";

// Fotos en una tira horizontal, cada una con su propio zoom.
export default function PhotoStrip({ urls, alt }: { urls: string[]; alt: string }) {
  if (!urls || urls.length === 0) return null;
  if (urls.length === 1) {
    return (
      <div className="photo-tile">
        <ZoomableImage src={urls[0]} alt={alt} className="w-full max-h-96 object-contain" />
      </div>
    );
  }
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x">
      {urls.map((u, i) => (
        <div key={i} className="photo-tile shrink-0 snap-start">
          <ZoomableImage
            src={u}
            alt={`${alt} (${i + 1}/${urls.length})`}
            className="h-72 w-auto max-w-none object-contain"
          />
        </div>
      ))}
    </div>
  );
}
