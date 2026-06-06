import EvasionCard from './EvasionCard';
import ResilienceCard from './ResilienceCard';
import HardeningCard from './HardeningCard';
import SkeletonLoader from './SkeletonLoader';

const CATEGORY_STYLES = {
  'Payment Fraud': 'text-red-400 bg-red-500/10 border-red-500/25',
  'Account Abuse': 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  'ATO': 'text-orange-400 bg-orange-500/10 border-orange-500/25',
  'Seller Fraud': 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  'Returns Abuse': 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  'Other': 'text-gray-400 bg-gray-500/10 border-gray-500/25',
};

export default function GeneratedRuleResult({ ruleData, index }) {
  const { rule, category, rationale, stressTest } = ruleData;
  const categoryStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES['Other'];

  return (
    <div className="mb-10">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold font-mono flex items-center justify-center">
              {index + 1}
            </span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Generated Rule</span>
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border font-mono flex-shrink-0 ${categoryStyle}`}>
            {category}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-100 leading-snug mb-2">{rule}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{rationale}</p>
      </div>

      {stressTest === 'error' && (
        <div className="p-4 rounded-xl bg-red-500/8 border border-red-500/25">
          <p className="text-sm text-red-300">Stress test failed for this rule. Try running again.</p>
        </div>
      )}

      {stressTest === null && (
        <div>
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Stress-testing this rule...
          </p>
          <SkeletonLoader />
        </div>
      )}

      {stressTest && stressTest !== 'error' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
          <EvasionCard patterns={stressTest.evasion_patterns} />
          <ResilienceCard score={stressTest.resilience_score} />
          <HardeningCard recommendations={stressTest.hardening_recommendations} />
        </div>
      )}
    </div>
  );
}
