"use client";
import { useState } from "react";

export default function ZoomableImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className={`${className || ""} cursor-zoom-in`}
      />
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain cursor-zoom-out"
          />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full w-9 h-9"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
