const CATEGORIES = [
  'Account Abuse',
  'Payment Fraud',
  'Seller Fraud',
  'Returns Abuse',
  'ATO',
  'Other',
];

const EXAMPLES = [
  'Flag orders where 3+ accounts share the same device within 24 hours',
  'Block transactions where a new account places an order above $500 within 1 hour of registration',
  'Suspend sellers whose cancellation rate exceeds 20% in a 7-day window',
];

export default function InputSection({
  rule,
  setRule,
  category,
  setCategory,
  onSubmit,
  isLoading,
  validationError,
  setValidationError,
}) {
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isLoading) {
      onSubmit();
    }
  };

  return (
    <section className="mb-8">
      <div className="mb-4">
        <label
          htmlFor="rule-input"
          className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2"
        >
          Fraud Detection Rule
        </label>
        <textarea
          id="rule-input"
          value={rule}
          onChange={(e) => {
            setRule(e.target.value);
            if (validationError) setValidationError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Describe your fraud detection rule in plain English..."
          rows={4}
          className={`w-full bg-gray-900 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600
            border resize-none transition-all duration-200
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

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 mb-5">
        <div>
          <label
            htmlFor="category-select"
            className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2"
          >
            Rule Category
          </label>
          <select
            id="category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-gray-900 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2.5
              focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/50
              hover:border-gray-600/60 transition-all duration-200 cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

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
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Stress Test This Rule
            </>
          )}
        </button>

        <span className="text-xs text-gray-600 sm:ml-1 self-center">
          ⌘ + Enter to run
        </span>
      </div>

      <div>
        <p className="text-xs text-gray-600 mb-2 font-medium">Try an example rule:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example, i) => (
            <button
              key={i}
              onClick={() => {
                setRule(example);
                if (validationError) setValidationError('');
              }}
              className="text-xs bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50 hover:border-gray-600/60
                text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-full transition-all duration-200
                focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-left"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
