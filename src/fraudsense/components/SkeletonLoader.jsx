// Skeleton placeholders for all four panels while the API call is in flight.

function Bar({ w = 'w-full', h = 'h-3', extra = '' }) {
  return <div className={`skeleton rounded-lg ${h} ${w} ${extra}`} />;
}

function PanelShell({ children }) {
  return (
    <div className="panel overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between">
        <Bar w="w-32" h="h-3" />
        <Bar w="w-8" h="h-5" />
      </div>
      {children}
    </div>
  );
}

function SignalsSkeleton() {
  return (
    <PanelShell>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Bar w="w-5" h="h-4" />
            <div className="flex-1 space-y-1.5">
              <Bar w="w-1/2" />
              <Bar w="w-4/5" h="h-2" />
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function ClassificationSkeleton() {
  return (
    <PanelShell>
      <Bar w="w-2/3" h="h-7" extra="mb-4" />
      <Bar w="w-40" h="h-2" extra="mb-4" />
      <div className="space-y-2">
        <Bar />
        <Bar w="w-11/12" />
        <Bar w="w-3/4" />
      </div>
    </PanelShell>
  );
}

function BlockSkeleton({ lines = 4 }) {
  return (
    <PanelShell>
      <div className="space-y-4">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Bar w="w-24" h="h-2" />
            <Bar w={i % 2 ? 'w-5/6' : 'w-full'} />
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function ScoreSkeleton() {
  return (
    <PanelShell>
      <Bar w="w-24" h="h-10" extra="mb-3" />
      <Bar h="h-2" extra="mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} w={i % 2 ? 'w-2/3' : 'w-3/4'} h="h-2" />
        ))}
      </div>
    </PanelShell>
  );
}

export default function SkeletonLoader() {
  return (
    <div className="mx-auto grid max-w-[1100px] gap-4 lg:grid-cols-2">
      <ScoreSkeleton />
      <BlockSkeleton lines={2} />
      <SignalsSkeleton />
      <ClassificationSkeleton />
      <BlockSkeleton lines={4} />
      <BlockSkeleton lines={3} />
      <div className="lg:col-span-2">
        <BlockSkeleton lines={3} />
      </div>
    </div>
  );
}
