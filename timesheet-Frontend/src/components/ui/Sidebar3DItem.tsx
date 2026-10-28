import React, { useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface Sidebar3DItemProps {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  badge?: string | number;
  badgeColorClass?: string;
  onClick: () => void;
  isCollapsed?: boolean;
}

export const Sidebar3DItem: React.FC<Sidebar3DItemProps> = ({
  id,
  label,
  desc,
  icon: Icon,
  isActive,
  badge,
  badgeColorClass = 'bg-amber-500 text-slate-900',
  onClick,
  isCollapsed = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div className={`w-full ${isCollapsed ? 'my-1 flex justify-center' : 'my-0.5'} relative`}>
      <motion.button
        type="button"
        data-active={isActive ? 'true' : 'false'}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={isCollapsed ? `${label} • ${desc}` : undefined}
        animate={
          shouldReduceMotion
            ? {}
            : {
                x: isHovered && !isActive && !isCollapsed ? 2 : 0,
                scale: isHovered && isCollapsed ? 1.05 : 1,
              }
        }
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`relative flex items-center transition-all duration-200 group cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
          isCollapsed
            ? 'w-11 h-11 justify-center rounded-xl p-0'
            : 'w-full justify-between p-2.5 text-left rounded-xl overflow-hidden'
        } ${
          isActive
            ? 'active-nav-item font-black bg-gradient-to-r from-indigo-50/90 via-violet-50/60 to-white border border-indigo-200/90 text-indigo-950 shadow-[0_4px_16px_rgba(99,102,241,0.12)]'
            : isHovered
            ? 'bg-slate-50/90 text-slate-900 border border-slate-200/90 shadow-2xs'
            : 'text-slate-600 hover:bg-slate-50/60 border border-transparent'
        }`}
      >
        {/* Subtle active left accent pill */}
        {isActive && (
          <span
            className={`absolute left-0 rounded-r-full bg-gradient-to-b from-indigo-500 via-indigo-600 to-violet-600 shadow-xs ${
              isCollapsed ? 'top-2 bottom-2 w-1' : 'top-1.5 bottom-1.5 w-1'
            }`}
          />
        )}

        <div className={`flex items-center ${isCollapsed ? 'justify-center relative' : 'gap-3 min-w-0 relative z-10 pl-1'}`}>
          {/* Vibrant, high-contrast icon container */}
          <div
            className={`rounded-xl transition-all duration-200 shrink-0 relative flex items-center justify-center ${
              isCollapsed ? 'p-2' : 'p-2'
            } ${
              isActive
                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 scale-105'
                : isHovered
                ? 'bg-indigo-50 text-indigo-600 shadow-2xs group-hover:scale-105'
                : 'bg-slate-100/90 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
            }`}
          >
            <Icon className={`${isCollapsed ? 'w-4.5 h-4.5' : 'w-4 h-4'} shrink-0`} />

            {/* Collapsed Badge Pill on top-right of Icon */}
            {isCollapsed && badge !== undefined && (
              <span
                className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.2 min-w-[16px] text-center text-[9px] font-black rounded-full shadow-xs ring-2 ring-white z-20 ${badgeColorClass}`}
              >
                {badge}
              </span>
            )}
          </div>

          {/* Expanded Labels */}
          {!isCollapsed && (
            <div className="truncate">
              <div className="text-xs font-black leading-tight truncate flex items-center gap-1.5">
                <span className={isActive ? 'text-indigo-950 font-black' : 'text-slate-800 font-bold group-hover:text-slate-950'}>
                  {label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-xs shrink-0 animate-pulse" />
                )}
              </div>
              <div
                className={`text-[10px] truncate mt-0.5 ${
                  isActive ? 'text-indigo-600/80 font-bold' : 'text-slate-400 font-medium group-hover:text-slate-500'
                }`}
              >
                {desc}
              </div>
            </div>
          )}
        </div>

        {/* Expanded Badge */}
        {!isCollapsed && badge !== undefined && (
          <div className="relative z-10">
            <span className={`ml-2 px-2 py-0.5 text-[10px] font-extrabold rounded-full shrink-0 shadow-2xs ${badgeColorClass}`}>
              {badge}
            </span>
          </div>
        )}
      </motion.button>

      {/* Floating Hover Tooltip in Collapsed Mode */}
      {isCollapsed && isHovered && (
        <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl text-xs whitespace-nowrap z-50 pointer-events-none flex flex-col gap-0.5 border border-slate-700/60 min-w-[150px] animate-in fade-in zoom-in-95 duration-150">
          <div className="font-black flex items-center justify-between gap-2">
            <span className="text-white text-xs">{label}</span>
            {badge !== undefined && (
              <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full shadow-xs ${badgeColorClass}`}>
                {badge}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-300 font-medium">{desc}</div>
          {/* Tooltip Arrow pointing left */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900/95" />
        </div>
      )}
    </div>
  );
};
