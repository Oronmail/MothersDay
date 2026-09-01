import { useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { getProductDetailLightboxImageUrl } from "@/lib/imageTransforms";

interface ImageLightboxProps {
  images: { url: string; altText?: string | null }[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const ImageLightbox = ({ images, currentIndex, open, onClose, onNavigate }: ImageLightboxProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") onNavigate((currentIndex + 1) % images.length);
    if (e.key === "ArrowRight") onNavigate((currentIndex - 1 + images.length) % images.length);
  }, [open, currentIndex, images.length, onClose, onNavigate]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown, open]);

  // Move focus into the dialog on open, and return it to the element that
  // opened the lightbox when it closes (or unmounts while open).
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => {
      triggerRef.current?.focus();
      triggerRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  const image = images[currentIndex];
  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="תצוגת תמונה מוגדלת"
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        ref={closeButtonRef}
        onClick={onClose}
        aria-label="סגירה"
        className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex + 1) % images.length); }}
            aria-label="התמונה הבאה"
            className="absolute left-4 text-white/60 hover:text-white z-10 p-2"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex - 1 + images.length) % images.length); }}
            aria-label="התמונה הקודמת"
            className="absolute right-14 text-white/60 hover:text-white z-10 p-2"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Image */}
      <img
        src={getProductDetailLightboxImageUrl(image.url)}
        alt={image.altText || ""}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
};
