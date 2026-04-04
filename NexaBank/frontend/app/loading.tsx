export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">NexaBank</p>
              <p className="text-xs text-gray-500">Loading your page securely...</p>
            </div>
          </div>

          <div className="mt-5 flex gap-1.5">
            <span className="h-1.5 flex-1 rounded-full bg-blue-100 animate-pulse" />
            <span className="h-1.5 flex-1 rounded-full bg-blue-200 animate-pulse [animation-delay:120ms]" />
            <span className="h-1.5 flex-1 rounded-full bg-blue-300 animate-pulse [animation-delay:240ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
