import { useEffect, useState } from 'react';
import { getRestaurantSettings } from '../services/db';

interface SplashProps {
  restaurantId: string;
  onComplete: () => void;
}

export default function Splash({ restaurantId, onComplete }: SplashProps) {
  const [restaurantName, setRestaurantName] = useState('Restaurant');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    let active = true;
    getRestaurantSettings(restaurantId).then(settings => {
      if (active && settings) {
        setRestaurantName(settings.restaurantName || 'Restaurant');
        setLogoUrl(settings.logoUrl || '');
      }
    }).catch(console.error);

    // Force call onComplete after 3 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [restaurantId, onComplete]);

  const initials = restaurantName.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 w-full h-full bg-white flex flex-col items-center justify-center z-[9999] overflow-hidden select-none">
      {/* Animated Rings and Logo/Initials Container */}
      <div className="relative w-44 h-44 flex items-center justify-center">
        {/* Outer Golden Spinner Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-t-[#d4af37] border-r-transparent border-b-[#d4af37] border-l-transparent animate-[spin_3s_linear_infinite]" />
        
        {/* Inner Royal Blue Pulse Ring */}
        <div className="absolute inset-2 rounded-full border-2 border-[#005dac] opacity-40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />

        {/* Center Logo/Avatar */}
        <div className="w-32 h-32 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-md relative z-10">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={restaurantName} 
              className="w-full h-full object-cover animate-[fadeInScale_1.2s_ease-out_forwards]"
            />
          ) : (
            <span className="text-4xl font-extrabold font-royal text-[#005dac] drop-shadow-[0_2px_4px_rgba(212,175,55,0.15)] animate-[fadeInScale_1s_ease-out_forwards]">
              {initials}
            </span>
          )}
        </div>
      </div>

      {/* Typography Section */}
      <div className="mt-8 flex flex-col items-center justify-center px-6 text-center animate-[fadeInUp_1.2s_ease-out_forwards]">
        <h1 className="font-royal text-3xl sm:text-4xl font-black text-slate-800 tracking-tight mb-1.5">
          {restaurantName}
        </h1>
        <p className="font-sans text-[10px] uppercase tracking-[0.25em] font-extrabold text-[#d4af37] opacity-90">
          Smart QR Dining
        </p>
      </div>

      {/* Ambient subtle background glow */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] bg-[#005dac]/10 rounded-full blur-[100px]" />
      </div>

      {/* Inline styles for GPU-accelerated 60fps animations */}
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
