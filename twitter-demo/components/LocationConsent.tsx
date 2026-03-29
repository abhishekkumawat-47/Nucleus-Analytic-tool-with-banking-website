'use client';

import { useState, useEffect } from 'react';
import { MapPin, ShieldAlert, X } from 'lucide-react';
import { tracker } from '@/lib/tracker';

export default function LocationConsent() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('locationConsent');
    if (!consent) {
      // Small delay so it pops up nicely after login
      const timer = setTimeout(() => setShowModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = async () => {
    setLoading(true);
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });

      const { latitude, longitude } = position.coords;
      
      // Free reverse geocoding API to get Country Name
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
      const data = await response.json();

      if (data.countryName) {
        localStorage.setItem('userCountry', data.countryName);
        localStorage.setItem('locationConsent', 'granted');
        
        // Immediately fire an event to register the newly fetched location in the analytics backend
        tracker.track('location_granted', { location: data.countryName });
      } else {
        throw new Error('Country not found');
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      // Even if it fails, store their consent preference to not ask again
      localStorage.setItem('locationConsent', 'granted_but_failed');
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  const handleDecline = () => {
    localStorage.setItem('locationConsent', 'denied');
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-blue-50 p-6 flex items-center justify-center border-b border-blue-100 relative">
          <button 
            onClick={handleDecline} 
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
            <MapPin className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Location Services</h2>
          <p className="text-gray-600 text-sm text-center mb-6">
            To improve your experience and provide relevant local trends, we'd like to use your geographic location. This data is fully anonymized for analytics purposes.
          </p>

          <div className="flex bg-gray-50 border border-gray-100 rounded-lg p-3 gap-3 mb-6 items-start">
            <ShieldAlert className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong>Your privacy matters.</strong> We only process your country-level location. We do not store precise coordinates or share your identity with third parties.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Not Now
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <span>Allow Location</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
