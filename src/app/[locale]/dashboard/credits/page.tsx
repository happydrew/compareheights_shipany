export default function CreditsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-3 sm:px-0">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Credits</h1>
        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          Manage your credits balance
        </p>
      </div>

      {/* Coming Soon Placeholder */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center sm:p-8 lg:p-12">
        <div className="mb-4 text-gray-400">
          <svg
            className="mx-auto h-20 w-20 sm:h-24 sm:w-24"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 sm:text-xl">
          Credits Management Coming Soon
        </h3>
        <p className="mx-auto max-w-md text-sm text-gray-500 sm:text-base">
          We're working on bringing you a comprehensive credits management system
        </p>
      </div>
    </div>
  );
}