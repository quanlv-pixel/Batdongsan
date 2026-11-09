'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ListingImage } from '@/types';
import { useDictionary } from '@/i18n';

interface PropertyGalleryProps {
  images: ListingImage[];
  title: string;
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const dict = useDictionary();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const safeImages = Array.isArray(images) ? images : [];
  const totalCount = safeImages.length;
  const primaryImage = safeImages[0];
  const sideImages = safeImages.slice(1, 5);

  const openLightbox = (index: number) => {
    if (totalCount > 0) {
      setLightboxIndex(Math.max(0, Math.min(index, totalCount - 1)));
    }
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const showPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev > 0 ? prev - 1 : totalCount - 1;
    });
  }, [totalCount]);

  const showNext = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev < totalCount - 1 ? prev + 1 : 0;
    });
  }, [totalCount]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        showPrev();
      } else if (e.key === 'ArrowRight') {
        showNext();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxIndex, closeLightbox, showPrev, showNext]);

  if (totalCount === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mb-6">
        <div className="w-full h-64 sm:h-80 md:h-96 rounded-xl border border-slate-200 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-2">
            photo_camera
          </span>
          <p className="text-sm font-medium">
            {dict.PropertyDetail.gallery.noPhotos}
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        data-testid="property-gallery"
        className="max-w-7xl mx-auto px-4 sm:px-8 mb-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-auto lg:h-[460px] rounded-xl overflow-hidden border border-[#E2E8F0] bg-white shadow-sm p-1.5">
          {/* Primary Main Image (65% width on Desktop) */}
          <div
            data-testid="gallery-main-button"
            className={`relative rounded-lg overflow-hidden group cursor-pointer ${
              sideImages.length > 0 ? 'lg:col-span-8 h-72 sm:h-96 lg:h-full' : 'lg:col-span-12 h-80 sm:h-96 lg:h-[448px]'
            }`}
            onClick={() => openLightbox(0)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(0);
              }
            }}
            aria-label={title}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryImage.url}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              loading="eager"
            />

            {/* Mobile View All Trigger Badge */}
            <div className="lg:hidden absolute bottom-4 right-4">
              <span
                data-testid="gallery-mobile-badge"
                className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">
                  photo_camera
                </span>
                {dict.PropertyDetail.gallery.photoCount
                  .replace('{current}', '1')
                  .replace('{total}', String(totalCount))}
              </span>
            </div>
          </div>

          {/* Right Thumbnails Cluster (35% width on Desktop) */}
          {sideImages.length > 0 && (
            <div className="hidden lg:grid lg:col-span-4 grid-cols-2 gap-2 h-full">
              {sideImages.map((img, idx) => {
                const actualIndex = idx + 1;
                const isFourthThumbnail = idx === 3;
                const hasMorePhotos = totalCount > 5;

                return (
                  <div
                    key={img.id || actualIndex}
                    className="relative rounded-lg overflow-hidden h-full group cursor-pointer"
                    onClick={() => openLightbox(actualIndex)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openLightbox(actualIndex);
                      }
                    }}
                    aria-label={`${title} - ${dict.PropertyDetail.gallery.photoCount
                      .replace('{current}', String(actualIndex + 1))
                      .replace('{total}', String(totalCount))}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`${title} - ${actualIndex + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Overlay on 4th thumbnail if there are more than 5 images */}
                    {isFourthThumbnail && hasMorePhotos && (
                      <div className="absolute inset-0 bg-[#142B4A]/70 hover:bg-[#142B4A]/80 transition-colors flex flex-col items-center justify-center text-white p-2 text-center backdrop-blur-[2px]">
                        <span className="material-symbols-outlined text-2xl mb-1">
                          photo_camera
                        </span>
                        <span className="text-xs font-semibold">
                          {dict.PropertyDetail.gallery.viewAllPhotos.replace(
                            '{count}',
                            String(totalCount),
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Fullscreen Accessible Lightbox Modal */}
      {lightboxIndex !== null && (
        <div
          data-testid="gallery-lightbox-modal"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between"
          role="dialog"
          aria-modal="true"
          aria-label={dict.PropertyDetail.gallery.viewAllPhotos.replace(
            '{count}',
            String(totalCount),
          )}
        >
          {/* Modal Header */}
          <div className="w-full px-4 sm:px-8 py-4 flex items-center justify-between text-white bg-black/40 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span
                data-testid="lightbox-counter"
                className="text-sm font-semibold tracking-wide"
              >
                {dict.PropertyDetail.gallery.photoCount
                  .replace('{current}', String(lightboxIndex + 1))
                  .replace('{total}', String(totalCount))}
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-300 truncate max-w-md">
                {title}
              </span>
            </div>

            <button
              type="button"
              data-testid="lightbox-close-btn"
              onClick={closeLightbox}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
              aria-label={dict.PropertyDetail.gallery.closeModal}
              autoFocus
            >
              <span className="material-symbols-outlined text-lg">close</span>
              <span>{dict.PropertyDetail.gallery.closeModal}</span>
            </button>
          </div>

          {/* Modal Body / Main Image Stage */}
          <div className="relative flex-1 flex items-center justify-center p-4">
            {/* Prev Button */}
            {totalCount > 1 && (
              <button
                type="button"
                data-testid="lightbox-prev-btn"
                onClick={showPrev}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-sm z-10"
                aria-label={dict.PropertyDetail.gallery.prevPhoto}
              >
                <span className="material-symbols-outlined text-2xl">
                  chevron_left
                </span>
              </button>
            )}

            {/* Active Image */}
            <div className="max-w-5xl max-h-[72vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={safeImages[lightboxIndex].url}
                alt={`${title} - ${lightboxIndex + 1}`}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
              />
            </div>

            {/* Next Button */}
            {totalCount > 1 && (
              <button
                type="button"
                data-testid="lightbox-next-btn"
                onClick={showNext}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-sm z-10"
                aria-label={dict.PropertyDetail.gallery.nextPhoto}
              >
                <span className="material-symbols-outlined text-2xl">
                  chevron_right
                </span>
              </button>
            )}
          </div>

          {/* Modal Footer: Thumbnail Strip */}
          {totalCount > 1 && (
            <div className="w-full px-4 py-3 bg-black/40 border-t border-white/10 overflow-x-auto">
              <div className="flex items-center justify-center gap-2 max-w-5xl mx-auto">
                {safeImages.map((img, i) => (
                  <button
                    key={img.id || i}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className={`relative w-16 h-12 rounded-md overflow-hidden shrink-0 border-2 transition-all ${
                      i === lightboxIndex
                        ? 'border-[#0F766E] scale-105 shadow-md'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    aria-label={`${dict.PropertyDetail.gallery.photoCount
                      .replace('{current}', String(i + 1))
                      .replace('{total}', String(totalCount))}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
