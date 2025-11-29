
import React from 'react';
import { CodeResult } from '../types';
import { TerminalIcon, DownloadIcon, FileTextIcon } from './Icons';

interface CodeGenViewProps {
  result: CodeResult;
}

export const CodeGenView: React.FC<CodeGenViewProps> = ({ result }) => {
  
  const handleDownload = () => {
    const blob = new Blob([result.code], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", result.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <TerminalIcon className="w-6 h-6 text-emerald-400" /> 
                Firmware Generator
            </h2>
            <p className="text-slate-400 text-sm">
                Generated based on schematic pinout analysis.
            </p>
        </div>
        <div className="text-right">
            <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full font-mono border border-slate-700">
                {result.architecture}
            </span>
        </div>
      </div>

      <div className="p-6">
        
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                    <FileTextIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{result.filename}</h3>
                    <p className="text-xs text-gray-500">{result.description}</p>
                </div>
            </div>
            
            <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
                <DownloadIcon className="w-4 h-4" /> Download Code
            </button>
        </div>

        {/* Code Editor Look */}
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-[#1e1e1e] shadow-inner font-mono text-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <span className="text-gray-500 text-xs">{result.language.toUpperCase()}</span>
            </div>
            <pre className="p-4 overflow-x-auto text-gray-300 leading-relaxed">
                <code>
{result.code}
                </code>
            </pre>
        </div>
      </div>
    </div>
  );
};
