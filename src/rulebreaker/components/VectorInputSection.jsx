const EXAMPLE_VECTORS = `[
  {"user_id": "u_4421", "amount": 9.99, "merchant": "crypto_exchange_A", "velocity_1h": 12, "new_device": true, "account_age_days": 2},
  {"user_id": "u_8832", "amount": 9.99, "merchant": "crypto_exchange_A", "velocity_1h": 11, "new_device": true, "account_age_days": 1},
  {"user_id": "u_1193", "amount": 9.99, "merchant": "crypto_exchange_A", "velocity_1h": 14, "new_device": true, "account_age_days": 3},
  {"user_id": "u_5567", "amount": 9.99, "merchant": "crypto_exchange_A", "velocity_1h": 9,  "new_device": true, "account_age_days": 2}
]`;

export default function VectorInputSection({
  vectors,
  setVectors,
  onSubmit,
  isLoading,
  validationError,
  setValidationError,
}) {
  return (
    <section className="mb-8">
      <div className="mb-1">
        <label
          htmlFor="vector-input"
          className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2"
        >
          Flagged Transaction Vectors
        </label>
        <p className="text-xs text-gray-600 mb-3">
          Paste JSON, CSV, or raw rows of suspicious transactions from your live system. The more signals per row, the sharper the generated rules.
        </p>
        <textarea
          id="vector-input"
          value={vectors}
          onChange={(e) => {
            setVectors(e.target.value);
            if (validationError) setValidationError('');
          }}
          placeholder="Paste your flagged transaction data here..."
          rows={8}
          className={`w-full bg-gray-900 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600
            border resize-none transition-all duration-200 font-mono
            focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/50
            hover:border-gray-600/60
            ${validationError ? 'border-red-500/60' : 'border-gray-700/60'}`}
        />
        {validationError && (
          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {validationError}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
            bg-indigo-600 hover:bg-indigo-500 text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150 active:scale-[0.97]
            focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:ring-offset-gray-950
            whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Generate Rules
            </>
          )}
        </button>

        <button
          onClick={() => {
            setVectors(EXAMPLE_VECTORS);
            if (validationError) setValidationError('');
          }}
          disabled={isLoading}
          className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors disabled:opacity-40"
        >
          Load example vectors
        </button>
      </div>
    </section>
  );
}
