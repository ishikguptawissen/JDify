import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className={`
        relative w-16 h-8 rounded-full transition-all duration-300 p-1 flex items-center 
        cursor-pointer hover:scale-110 active:scale-95 group shadow-sm border
        ${isDark 
          ? 'bg-gray-800 border-indigo-500/30' 
          : 'bg-gray-200 border-gray-300'}
      `}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {/* Icons Background */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none z-0">
        <Sun className={`w-4 h-4 transition-all duration-300 ${!isDark ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] opacity-100' : 'text-gray-400 opacity-50'}`} />
        <Moon className={`w-4 h-4 transition-all duration-300 ${isDark ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)] opacity-100' : 'text-gray-400 opacity-50'}`} />
      </div>

      {/* Sliding Knob */}
      <motion.div
        layout
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        initial={false}
        animate={{
          x: isDark ? 32 : 0,
        }}
        className={`
          w-6 h-6 rounded-full shadow-lg z-10 flex items-center justify-center transition-colors duration-300
          ${isDark ? 'bg-indigo-500' : 'bg-white'}
        `}
      />
    </button>
  );
}
