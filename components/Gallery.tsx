"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
 
// Galería con deslizar entre fotos (scroll-snap nativo) y zoom con pellizco
// directamente sobre la foto activa (touch-action: pinch-zoom, sin overlay
// aparte): se hace zoom y se puede seguir deslizando a la otra foto sin
// tener que "salir" del zoom primero.
export default function Gallery({
  urls,
  alt,
  ratio = "aspect-[4/3]",
}: {
  urls: string[];
  alt: string;
  ratio?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
 
  if (!urls || urls.length === 0) {
    return (
      <div className={`photo-tile ${ratio} grid place-items-center text-sm text-neutral-500`}>
        Sin foto
      </div>
    );
  }
 
  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }
 
  function go(dir: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * (index + dir), behavior: "smooth" });
  }
 
  return (
    <div className="relative">
      <div
        ref={scroller}
        onScroll={onScroll}
        className={`flex overflow-x-auto snap-x snap-mandatory no-scrollbar photo-tile ${ratio}`}
      >
        {urls.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={u}
            alt={`${alt} ${i + 1}/${urls.length}`}
            className="w-full h-full object-contain shrink-0 snap-center select-none"
            style={{ touchAction: "pan-x pinch-zoom" }}
            draggable={false}
          />
        ))}
      </div>
 
      {urls.length > 1 && (
        <>
          <div className="hidden sm:block">
            {index > 0 && (
              <button onClick={() => go(-1)} aria-label="Anterior" className="icon-btn absolute left-2 top-1/2 -translate-y-1/2 !bg-black/60 text-white">
                <ChevronLeft size={18} />
              </button>
            )}
            {index < urls.length - 1 && (
              <button onClick={() => go(1)} aria-label="Siguiente" className="icon-btn absolute right-2 top-1/2 -translate-y-1/2 !bg-black/60 text-white">
                <ChevronRight size={18} />
              </button>
            )}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {urls.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
          <span className="absolute top-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            {index + 1}/{urls.length}
          </span>
        </>
      )}
    </div>
  );
}
