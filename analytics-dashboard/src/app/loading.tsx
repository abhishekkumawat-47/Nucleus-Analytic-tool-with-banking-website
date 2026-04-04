export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-gray-100/50 flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full border-2 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1a73e8] border-r-[#1a73e8] animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Loading analytics</p>
              <p className="text-xs text-gray-500">Preparing dashboard insights...</p>
            </div>
          </div>

          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-blue-50">
            <div className="h-full w-1/3 rounded-full bg-[#1a73e8] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
