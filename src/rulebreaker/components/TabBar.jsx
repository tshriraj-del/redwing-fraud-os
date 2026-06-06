export default function TabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'stress-test', label: 'Stress Test a Rule' },
    { id: 'learn', label: 'Learn from Live Vectors' },
  ];

  return (
    <div className="flex gap-1 mb-8 bg-gray-900 p-1 rounded-xl w-fit border border-gray-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-150
            focus:outline-none focus:ring-1 focus:ring-indigo-500/40
            ${activeTab === tab.id
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
