import EvasionCard from './EvasionCard';
import ResilienceCard from './ResilienceCard';
import HardeningCard from './HardeningCard';

export default function ResultsSection({ results }) {
  return (
    <div className="mt-8">
      <div className="h-px bg-gray-800 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="animate-fade-in-up h-full">
          <EvasionCard patterns={results.evasion_patterns} />
        </div>
        <div className="animate-fade-in-up-1 h-full">
          <ResilienceCard score={results.resilience_score} />
        </div>
        <div className="animate-fade-in-up-2 h-full">
          <HardeningCard recommendations={results.hardening_recommendations} />
        </div>
      </div>
    </div>
  );
}
