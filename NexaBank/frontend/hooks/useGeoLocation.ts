import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';

export const useGeoLocation = (userId: string | undefined) => {
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    if (!userId || captured) return;

    if ('geolocation' in navigator) {
      const geoTimeout = setTimeout(() => {
        if (!captured) {
          console.warn("Geolocation request timed out");
          captureFallback();
        }
      }, 10000); // 10 second timeout

      const captureFallback = async () => {
        const userAgent = navigator.userAgent || "";
        const platform = navigator.platform || (navigator as any).userAgentData?.platform || "";
        const deviceType = /Mobi|Android/i.test(userAgent) ? "mobile" : /Tablet|iPad/i.test(userAgent) ? "tablet" : "desktop";
        
        await axios.post(`${API_BASE_URL}/events/location`, {
           deviceType, platform, userAgent
        }, { withCredentials: true }).catch(console.error);
        if (!captured) setCaptured(true);
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(geoTimeout);
          try {
            let city = null;
            let country = null;
            
            const userAgent = navigator.userAgent || "";
            const platform = navigator.platform || (navigator as any).userAgentData?.platform || "";
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(userAgent);
            const deviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

            // Try precise geocoding first
            try {
              const nominatimRes = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
                { timeout: 5000 }
              );
              city = nominatimRes.data?.address?.city || nominatimRes.data?.address?.town || nominatimRes.data?.address?.village || null;
              country = nominatimRes.data?.address?.country || null;
            } catch (err) {
              try {
                const geoResponse = await axios.get("https://ipapi.co/json/", { timeout: 3000 });
                city = geoResponse.data.city;
                country = geoResponse.data.country_name;
              } catch (fallbackErr) {}
            }

            await axios.post(`${API_BASE_URL}/events/location`, {
               latitude: position.coords.latitude,
               longitude: position.coords.longitude,
               city,
               country,
               deviceType,
               platform,
               userAgent
            }, { withCredentials: true });
            setCaptured(true);
          } catch (e) {
            console.error("Location tracking failed", e);
            captureFallback();
          }
        },
        async (error) => {
          clearTimeout(geoTimeout);
          captureFallback();
        },
        { timeout: 8000 }
      );
    } else {
      const _nav = navigator as any;
      const userAgent = _nav?.userAgent || "";
      const platform = _nav?.platform || "";
      const deviceType = "desktop";
      axios.post(`${API_BASE_URL}/events/location`, { deviceType, platform, userAgent }, { withCredentials: true }).catch(console.error);
      setCaptured(true);
    }
  }, [userId, captured]);
};
