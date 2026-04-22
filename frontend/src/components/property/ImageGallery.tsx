'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Grid3X3, Video } from 'lucide-react';
import { PropertyImage } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface ImageGalleryProps {
  images: PropertyImage[];
  title: string;
  videoCount?: number;
  onVideoClick?: () => void;
}

export default function ImageGallery({ images, title, videoCount = 0, onVideoClick }: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // Sort so that the isPrimary image appears first, then take the first 5
  const sorted = [...images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  const primaryImages = sorted.slice(0, 5);

  const prev = () => setCurrentIndex((i) => (i === 0 ? sorted.length - 1 : i - 1));
  const next = () => setCurrentIndex((i) => (i === sorted.length - 1 ? 0 : i + 1));

  const openAtIndex = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      {/* Grid layout */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* PR G: removed `unoptimized` so Next.js serves AVIF/WebP with a
            proper srcset. Each image gets a `sizes` hint matching its
            container so the CDN picks an appropriately-sized variant. */}
        {primaryImages.length === 1 ? (
          <div className="aspect-[16/9] relative cursor-pointer" onClick={() => openAtIndex(0)}>
            <Image
              src={primaryImages[0].url}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 960px"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 h-80 md:h-[28rem] lg:h-[32rem]">
            {/* Main image — always left half */}
            <div className="relative cursor-pointer" onClick={() => openAtIndex(0)}>
              <Image
                src={primaryImages[0]?.url || ''}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover hover:brightness-90 transition-all"
                priority
              />
            </div>
            {/* Side images — right half, nested grid */}
            {primaryImages.length === 2 ? (
              <div className="relative cursor-pointer" onClick={() => openAtIndex(1)}>
                <Image
                  src={primaryImages[1].url}
                  alt={`${title} 2`}
                  fill
                  sizes="(max-width: 768px) 50vw, 50vw"
                  className="object-cover hover:brightness-90 transition-all"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 grid-rows-2 gap-2">
                {primaryImages.slice(1, 5).map((img, i) => (
                  <div key={i} className="relative cursor-pointer" onClick={() => openAtIndex(i + 1)}>
                    <Image
                      src={img.url}
                      alt={`${title} ${i + 2}`}
                      fill
                      sizes="(max-width: 768px) 25vw, 25vw"
                      className="object-cover hover:brightness-90 transition-all"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom-right buttons */}
        <div className="absolute bottom-4 ltr:right-4 rtl:left-4 flex items-center gap-2">
          {videoCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onVideoClick?.(); }}
              className="bg-white text-gray-800 text-sm font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Video className="w-4 h-4" />
              {videoCount} {isAr ? 'فيديو' : videoCount === 1 ? 'Video' : 'Videos'}
            </button>
          )}
          {sorted.length > 5 && (
            <button
              onClick={() => openAtIndex(0)}
              className="bg-white text-gray-800 text-sm font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Grid3X3 className="w-4 h-4" />
              {isAr ? `عرض جميع ${sorted.length} صور` : `Show all ${sorted.length} photos`}
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 ltr:right-4 rtl:left-4 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={prev}
            className="absolute ltr:left-4 rtl:right-4 text-white bg-white/10 rounded-full p-3 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
          </button>

          <div className="relative w-full max-w-4xl mx-16 aspect-video">
            <Image
              src={sorted[currentIndex]?.url || ''}
              alt={`${title} ${currentIndex + 1}`}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-contain"
              priority
            />
          </div>

          <button
            onClick={next}
            className="absolute ltr:right-4 rtl:left-4 text-white bg-white/10 rounded-full p-3 hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-6 h-6 rtl:rotate-180" />
          </button>

          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <span className="text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full">
              {currentIndex + 1} / {sorted.length}
            </span>
          </div>

          {/* Thumbnails */}
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 overflow-x-auto px-4">
            {sorted.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                  i === currentIndex ? 'border-primary-400' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
