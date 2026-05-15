import React from 'react';

/**
 * Skeleton shimmer block. 
 * Use variant="line"|"card"|"circle"|"paragraph" for preset shapes.
 */
const SkeletonLoader = ({ 
  variant = 'line', 
  className = '', 
  lines = 3,
  width,
  height,
}) => {
  const shimmer = 'relative overflow-hidden bg-white/[0.04] rounded-lg before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.04] before:to-transparent before:skew-x-12';

  if (variant === 'circle') {
    return (
      <div 
        className={`${shimmer} rounded-full shrink-0 ${className}`}
        style={{ width: width || 44, height: height || 44 }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={`glass-card rounded-2xl p-5 space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`${shimmer} rounded-xl`} style={{ width: 44, height: 44 }} />
          <div className="flex-1 space-y-2">
            <div className={`${shimmer} h-3 rounded-full`} style={{ width: '60%' }} />
            <div className={`${shimmer} h-2.5 rounded-full`} style={{ width: '40%' }} />
          </div>
        </div>
        <div className={`${shimmer} h-2.5 rounded-full`} style={{ width: '90%' }} />
        <div className={`${shimmer} h-2.5 rounded-full`} style={{ width: '75%' }} />
      </div>
    );
  }

  if (variant === 'paragraph') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${shimmer} h-3 rounded-full`}
            style={{ width: i === lines - 1 ? '60%' : `${85 + Math.random() * 15}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex gap-3 items-center p-3">
            <div className={`${shimmer} rounded-lg shrink-0`} style={{ width: 36, height: 36 }} />
            <div className="flex-1 space-y-2">
              <div className={`${shimmer} h-3 rounded-full`} style={{ width: `${70 + Math.random() * 25}%` }} />
              <div className={`${shimmer} h-2 rounded-full`} style={{ width: '45%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: single line
  return (
    <div 
      className={`${shimmer} ${className}`}
      style={{ width: width || '100%', height: height || 12 }}
    />
  );
};

// Pre-built skeleton patterns
export const StatSkeleton = () => (
  <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden h-[88px] w-full">
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-12" />
    <div className="w-11 h-11 rounded-xl bg-white/[0.04] shrink-0" />
    <div className="flex flex-col gap-2.5 w-full">
      <div className="h-2 w-1/2 bg-white/[0.04] rounded-full" />
      <div className="h-5 w-1/3 bg-white/[0.06] rounded-lg mt-0.5" />
    </div>
  </div>
);

export const ActivitySkeleton = () => (
  <div className="flex gap-3 items-start p-3 relative overflow-hidden">
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent skew-x-12" />
    <div className="w-9 h-9 rounded-lg bg-white/[0.04] shrink-0" />
    <div className="flex flex-col gap-2 w-full pt-1 flex-1">
      <div className="h-2 w-4/5 bg-white/[0.05] rounded-full" />
      <div className="h-2 w-2/5 bg-white/[0.03] rounded-full" />
    </div>
  </div>
);

export const TodoSkeleton = () => (
  <div className="divide-y divide-white/[0.04]">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="flex items-center gap-3.5 px-5 py-4 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent skew-x-12" />
        <div className="w-5 h-5 rounded-full bg-white/[0.06] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/[0.05] rounded-full" style={{ width: `${55 + Math.random() * 35}%` }} />
          <div className="h-2 bg-white/[0.03] rounded-full w-20" />
        </div>
      </div>
    ))}
  </div>
);

export const FlashcardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-72 glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-12" />
        <div className="flex justify-between mb-6">
          <div className="h-5 w-16 bg-white/[0.06] rounded-full" />
          <div className="w-8 h-8 bg-white/[0.04] rounded-full" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="h-4 w-3/4 bg-white/[0.05] rounded-full" />
          <div className="h-4 w-1/2 bg-white/[0.04] rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

export default SkeletonLoader;
