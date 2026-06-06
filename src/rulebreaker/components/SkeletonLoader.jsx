function SkeletonLine({ width = 'w-full', height = 'h-3' }) {
  return <div className={`${width} ${height} skeleton rounded`} />;
}

function SkeletonCard({ children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
      {children}
    </div>
  );
}

export default function SkeletonLoader() {
  return (
    <div className="mt-8">
      <div className="h-px bg-gray-800 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evasion patterns skeleton */}
        <SkeletonCard>
          <SkeletonLine width="w-2/5" height="h-2.5" />
          <div className="flex flex-col gap-5 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-2 border-l-2 border-gray-800 pl-4">
                <div className="flex items-center gap-2">
                  <SkeletonLine width="w-1/3" height="h-3" />
                  <SkeletonLine width="w-12" height="h-5" />
                  <SkeletonLine width="w-12" height="h-5" />
                </div>
                <SkeletonLine width="w-full" height="h-2.5" />
                <SkeletonLine width="w-4/5" height="h-2.5" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {/* Resilience score skeleton */}
        <SkeletonCard>
          <SkeletonLine width="w-2/5" height="h-2.5" />
          <div className="flex justify-center my-2">
            <div className="w-36 h-36 rounded-full skeleton" />
          </div>
          <div className="flex flex-col gap-4 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <SkeletonLine width="w-1/3" height="h-2.5" />
                  <SkeletonLine width="w-8" height="h-2.5" />
                </div>
                <SkeletonLine width="w-full" height="h-1.5" />
              </div>
            ))}
          </div>
          <div className="mt-2 pt-4 border-t border-gray-800 flex flex-col gap-2">
            <SkeletonLine width="w-full" height="h-2.5" />
            <SkeletonLine width="w-3/4" height="h-2.5" />
          </div>
        </SkeletonCard>

        {/* Hardening skeleton */}
        <SkeletonCard>
          <SkeletonLine width="w-2/5" height="h-2.5" />
          <div className="flex flex-col gap-5 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-5 h-5 rounded-full skeleton flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-2 flex-1">
                  <SkeletonLine width="w-4/5" height="h-3" />
                  <SkeletonLine width="w-full" height="h-2.5" />
                  <SkeletonLine width="w-2/3" height="h-2" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}
