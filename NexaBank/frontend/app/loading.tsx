export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-white/80 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="rounded-2xl border border-blue-100 bg-white px-6 py-5 shadow-[0_20px_60px_rgba(26,115,232,0.12)]">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1a73e8] border-r-[#1a73e8] animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">NexaBank</p>
              <p className="text-xs text-gray-500">Loading your page securely...</p>
            </div>
          </div>

          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-blue-50">
            <div className="h-full w-1/2 rounded-full bg-[#1a73e8] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
