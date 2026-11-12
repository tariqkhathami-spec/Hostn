'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2, LocateFixed } from 'lucide-react';
import { propertiesApi } from '@/lib/api';

interface LocationPickerProps {
  value?: { lat: number; lng: number };
  onChange: (coords: { lat: number; lng: number }) => void;
  onAddressResolved?: (address: { city: string; district: string; address: string }) => void;
  className?: string;
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

// Default center: Riyadh, Saudi Arabia
const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };

export default function LocationPicker({ value, onChange, onAddressResolved, className = '' }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  const resolveAddress = useCallback(async (lat: number, lng: number) => {
    if (!onAddressResolved) return;
    try {
      const res = await propertiesApi.reverseGeocode(lat, lng);
      if (res.data?.data) {
        onAddressResolved(res.data.data);
      }
    } catch {
      // Geocoding is optional — silent fail
    }
  }, [onAddressResolved]);

  useEffect(() => {
    if (!MAPS_KEY || !mapRef.current) {
      setLoading(false);
      return;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initMap = () => {
      if (!mapRef.current || !(window as unknown as Record<string, unknown>).google) return;

      const google = (window as unknown as { google: typeof globalThis.google }).google;
      const center = value || DEFAULT_CENTER;

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: value ? 15 : 6,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
      });

      const marker = new google.maps.Marker({
        position: center,
        map,
        draggable: true,
        title: 'اسحب العلامة لتحديد الموقع',
      });
      markerRef.current = marker;

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          const coords = { lat: pos.lat(), lng: pos.lng() };
          onChange(coords);
          resolveAddress(coords.lat, coords.lng);
        }
      });

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          marker.setPosition(e.latLng);
          const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          onChange(coords);
          resolveAddress(coords.lat, coords.lng);
        }
      });

      setLoading(false);
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else if ((window as unknown as Record<string, unknown>).google) {
      initMap();
    } else {
      script.addEventListener('load', initMap);
    }
  }, [value, onChange, resolveAddress]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(coords);
        resolveAddress(coords.lat, coords.lng);
        if (markerRef.current) {
          const google = (window as unknown as { google: typeof globalThis.google }).google;
          markerRef.current.setPosition(new google.maps.LatLng(coords.lat, coords.lng));
          const map = markerRef.current.getMap();
          if (map && 'panTo' in map) {
            (map as google.maps.Map).panTo(new google.maps.LatLng(coords.lat, coords.lng));
          }
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!MAPS_KEY) {
    return (
      <div className={`bg-gray-100 rounded-xl p-6 text-center ${className}`}>
        <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">الخريطة غير متاحة حالياً. اكتب المدينة والحي والعنوان، وتقدر تحدّد الموقع لاحقاً.</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full min-h-[300px]" />
      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={locating}
        className="absolute bottom-4 ltr:right-4 rtl:left-4 bg-white px-3 py-2 rounded-lg shadow-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 z-20"
      >
        {locating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LocateFixed className="w-4 h-4" />
        )}
        موقعي الحالي
      </button>
    </div>
  );
}
