import React from 'react';
import { AnalysisResult, AnalysisSection } from '../types';
import { CheckCircleIcon, AlertTriangleIcon, XCircleIcon, InfoIcon } from './Icons';

interface ResultsViewProps {
  result: AnalysisResult;
}

const StatusIcon = ({ status }: { status: AnalysisSection['status'] }) => {
  switch (status) {
    case 'pass': return <CheckCircleIcon className="text-green-500" />;
    case 'fail': return <XCircleIcon className="text-red-500" />;
    case 'warning': return <AlertTriangleIcon className="text-amber-500" />;
    default: return <InfoIcon className="text-blue-500" />;
  }
};

const StatusBadge = ({ status }: { status: AnalysisSection['status'] }) => {
    const colors = {
        pass: 'bg-green-100 text-green-800 border-green-200',
        fail: 'bg-red-100 text-red-800 border-red-200',
        warning: 'bg-amber-100 text-amber-800 border-amber-200',
        info: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${colors[status]} uppercase tracking-wider`}>
            {status}
        </span>
    );
};

export const ResultsView: React.FC<ResultsViewProps> = ({ result }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Summary */}
      <div className="bg-slate-900 p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            Analysis Report
        </h2>
        <p className="text-slate-300 leading-relaxed">
            {result.summary}
        </p>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Sources (If Auto-Detected) */}
        {result.sources && result.sources.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm">
            <h4 className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Verified against online sources:
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.sources.map((source, idx) => (
                <li key={idx}>
                  <a 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-700 hover:text-blue-900 hover:underline truncate"
                  >
                    <span className="text-blue-400">🔗</span>
                    <span className="truncate">{source.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sections Grid */}
        <div className="grid gap-4">
          {result.sections.map((section, idx) => (
            <div key={idx} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <StatusIcon status={section.status} />
                  <h3 className="font-semibold text-gray-900 text-lg">{section.title}</h3>
                </div>
                <StatusBadge status={section.status} />
              </div>
              <p className="text-gray-600 pl-9 text-sm leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Suggested Fixes */}
        {result.suggestedFixes.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
            <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2">
              <span className="bg-indigo-200 p-1 rounded">🛠️</span> Suggested Corrections
            </h3>
            <ul className="space-y-3">
              {result.suggestedFixes.map((fix, idx) => (
                <li key={idx} className="flex gap-3 text-indigo-800 text-sm">
                  <span className="font-mono text-indigo-400 font-bold">{idx + 1}.</span>
                  <span>{fix}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};