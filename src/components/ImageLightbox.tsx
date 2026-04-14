import { useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { getProductDetailLightboxImageUrl } from "@/lib/imageTransforms";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  images: { url: string; altText?: string | null }[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const ImageLightbox = ({ images, currentIndex, open, onClose, onNavigate }: ImageLightboxProps) => {
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

  if (!open) return null;

  const image = images[currentIndex];
  if (!image) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex + 1) % images.length); }}
            className="absolute left-4 text-white/60 hover:text-white z-10 p-2"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex - 1 + images.length) % images.length); }}
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
