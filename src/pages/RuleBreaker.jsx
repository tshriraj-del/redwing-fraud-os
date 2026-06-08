import { useState, useEffect } from 'react';
import TabBar from '../rulebreaker/components/TabBar.jsx';
import InputSection from '../rulebreaker/components/InputSection.jsx';
import VectorInputSection from '../rulebreaker/components/VectorInputSection.jsx';
import PatternPanel from '../rulebreaker/components/PatternPanel.jsx';
import GeneratedRuleResult from '../rulebreaker/components/GeneratedRuleResult.jsx';
import SkeletonLoader from '../rulebreaker/components/SkeletonLoader.jsx';
import ResultsSection from '../rulebreaker/components/ResultsSection.jsx';
import { analyzeRule, generateRulesFromVectors } from '../rulebreaker/api.js';

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="mt-2 mb-4 p-4 rounded-xl bg-red-500/8 border border-red-500/25 flex items-start gap-3">
      <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <div className="flex-1">
        <p className="text-sm text-red-300">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-red-400 hover:text-red-300 underline underline-offset-2 flex-shrink-0 transition-colors">
          Retry
        </button>
      )}
    </div>
  );
}

const DEMO_RULE = 'Block transaction if amount > $500 AND first-time recipient AND account age < 30 days';
const DEMO_RESULTS = {
  evasion_patterns: [
    { name: 'Amount fragmentation', description: 'Split $1,200 into three $399 transactions to stay under the $500 threshold. Each individual transfer passes the rule but the aggregate constitutes the same fraud.', difficulty: 'Easy', detectability: 'Low' },
    { name: 'Aged mule account seeding', description: 'Pre-age a mule account with low-value legitimate transactions for 31 days before executing the fraud. Account age check passes; recipient is still fraudulent.', difficulty: 'Medium', detectability: 'Medium' },
    { name: 'Recipient rotation with delay', description: 'Establish a new "recipient" with a small $5 transfer 7 days prior. On day 8, the large transfer goes to an established (non-first-time) recipient that is actually a mule.', difficulty: 'Hard', detectability: 'Low' },
  ],
  resilience_score: 28,
  hardening_recommendations: [
    { title: 'Add velocity window', description: 'Track cumulative transfers to any recipient cluster over a 72-hour window. Flag when aggregate > $500 even if individual transfers are below threshold.', priority: 'High' },
    { title: 'Recipient trust score', description: 'Replace binary new/known recipient with a trust score based on transaction history, age of relationship, and shared device fingerprints with known bad actors.', priority: 'High' },
    { title: 'Network graph check', description: 'Before approving, check if the recipient is connected within 2 hops to any blocked or flagged account in the fraud ring graph.', priority: 'Medium' },
  ],
};

export default function RuleBreaker() {
  const [activeTab, setActiveTab] = useState('stress-test');

  const [rule, setRule]                     = useState(DEMO_RULE);
  const [category, setCategory]             = useState('Account Abuse');
  const [isLoading, setIsLoading]           = useState(false);
  const [results, setResults]               = useState(null);
  const [error, setError]                   = useState(null);
  const [validationError, setValidationError] = useState('');

  const [vectors, setVectors]               = useState('');
  const [vectorsError, setVectorsError]     = useState('');
  const [isGenerating, setIsGenerating]     = useState(false);
  const [learnError, setLearnError]         = useState(null);
  const [patternData, setPatternData]       = useState(null);
  const [ruleResults, setRuleResults]       = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(2500) })
      .catch(() => setResults(DEMO_RESULTS));
  }, []);

  const handleSubmit = async () => {
    if (rule.trim().length < 15) {
      setValidationError('Please provide more detail — at least 15 characters.');
      return;
    }
    setValidationError('');
    setError(null);
    setResults(null);
    setIsLoading(true);
    try {
      const data = await analyzeRule(rule.trim(), category);
      setResults(data);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLearn = async () => {
    if (vectors.trim().length < 20) {
      setVectorsError('Please paste at least a few transaction rows.');
      return;
    }
    setVectorsError('');
    setLearnError(null);
    setPatternData(null);
    setRuleResults([]);
    setIsGenerating(true);
    try {
      const data = await generateRulesFromVectors(vectors.trim());
      setPatternData(data.pattern_analysis);
      const initialResults = data.generated_rules.map(r => ({ ...r, stressTest: null }));
      setRuleResults(initialResults);
      setIsGenerating(false);
      data.generated_rules.forEach((r, i) => {
        analyzeRule(r.rule, r.category)
          .then(st => setRuleResults(prev => prev.map((item, idx) => idx === i ? { ...item, stressTest: st } : item)))
          .catch(() => setRuleResults(prev => prev.map((item, idx) => idx === i ? { ...item, stressTest: 'error' } : item)));
      });
    } catch (err) {
      setIsGenerating(false);
      setLearnError(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-full bg-gray-950 text-gray-100 flex flex-col overflow-auto">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === 'stress-test' && (
          <>
            <InputSection
              rule={rule}
              setRule={setRule}
              category={category}
              setCategory={setCategory}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              validationError={validationError}
              setValidationError={setValidationError}
            />
            {error && <ErrorBanner message={error} onRetry={handleSubmit} />}
            {isLoading && <SkeletonLoader />}
            {results && !isLoading && <ResultsSection results={results} />}
          </>
        )}

        {activeTab === 'learn' && (
          <>
            <VectorInputSection
              vectors={vectors}
              setVectors={setVectors}
              onSubmit={handleLearn}
              isLoading={isGenerating}
              validationError={vectorsError}
              setValidationError={setVectorsError}
            />
            {learnError && <ErrorBanner message={learnError} onRetry={handleLearn} />}
            {isGenerating && <SkeletonLoader />}
            {patternData && (
              <>
                <PatternPanel pattern={patternData} />
                <div className="h-px bg-gray-800 mb-8" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
                  Generated Rules + Stress Tests
                </p>
                {ruleResults.map((r, i) => (
                  <GeneratedRuleResult key={i} ruleData={r} index={i} />
                ))}
              </>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-gray-800/60 py-5">
        <p className="text-center text-xs text-gray-600">
          This tool simulates adversarial behavior for defensive purposes only.
        </p>
      </footer>
    </div>
  );
}
