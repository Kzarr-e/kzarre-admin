'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from "next/script";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Play animation first, then reveal login options
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

 const handleLogin = (type: 'superadmin' | 'admin') => {
  if (type === 'superadmin') router.push('/superadmin/login');
  else router.push('/admin/login');
};

  return (
    <>  
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#F8F9FA] to-[#E8F5E9] relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-[#A0EDA8]/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-[#000]/10 rounded-full blur-3xl animate-pulse" />

      {/* Main Card */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.1)] rounded-3xl px-10 py-12 w-[90%] sm:w-[480px] text-center border border-gray-100">
        {/* Logo / Animation */}
        <div className="flex justify-center mb-6">
          {/* <DotLottieReact
            src="https://lottie.host/e7734f21-27e6-4769-9e36-eb602fe2643b/AU382x6oe3.lottie"
            loop
            autoplay
            speed={3}
            style={{ width: 220, height: 220 }}
          /> */}
        </div>

        {/* Loading Animation */}
        {loading ? (
          <div className="flex flex-col items-center justify-center">
            <p className="text-gray-600 text-sm mb-4 font-medium tracking-wide">
              Preparing your secure portal...
            </p>
            <div className="w-10 h-10 border-4 border-[#A0EDA8] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to KZARRĒ Admin Portal</h1>
            <p className="text-gray-600 mb-6 text-sm">
              Choose your login type to continue
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* <button
                onClick={() => handleLogin('superadmin')}
                className="px-6 py-3 w-full sm:w-auto bg-black badge-text-white rounded-xl shadow-md hover:shadow-lg hover:bg-gray-800 transition-all duration-300 font-medium"
              >
                Super Admin
              </button> */}
              <button
                onClick={() => handleLogin('admin')}
                className="px-9 py-3 w-full sm:w-auto bg-[#A0EDA8] text-black rounded-xl shadow-md hover:shadow-lg hover:bg-[var(--accent-green)] hover:text-white transition-all duration-300 font-medium"
              >
              Login
              </button>
            </div>
          </>
        )}
      </div>
    
    </div>
    </>
  );
}
