
import React, { useState } from 'react';
import { SearchIcon, FileTextIcon, CubeIcon, DollarSignIcon, DownloadCloudIcon, ExternalLinkIcon, DownloadIcon } from './Icons';
import { PartSearchResult } from '../types';
import { searchPart } from '../services/geminiService';

export const PartSearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PartSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search Options
  const [optDatasheet, setOptDatasheet] = useState(true);
  const [optCad, setOptCad] = useState(true);
  const [optPricing, setOptPricing] = useState(true);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await searchPart(query, optDatasheet, optCad, optPricing);
      setResult(data);
    } catch (err) {
      setError("Failed to find part information. Please verify the part number.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Search Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <SearchIcon className="text-indigo-600 w-6 h-6" />
          Component Intelligence Search
        </h2>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
             <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Part Number (e.g., STM32F405, LM317, NE555)"
                className="w-full border-2 border-gray-200 rounded-lg pl-12 pr-4 py-4 text-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
             />
             <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
             <button 
               type="submit"
               disabled={loading || !query}
               className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
             >
               {loading ? 'Searching...' : 'Search'}
             </button>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
             <span className="font-semibold text-gray-900 mr-2">I need:</span>
             <label className="flex items-center gap-2 cursor-pointer hover:text-indigo-600">
               <input type="checkbox" checked={optDatasheet} onChange={e => setOptDatasheet(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
               Datasheet
             </label>
             <label className="flex items-center gap-2 cursor-pointer hover:text-indigo-600">
               <input type="checkbox" checked={optCad} onChange={e => setOptCad(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
               CAD Models
             </label>
             <label className="flex items-center gap-2 cursor-pointer hover:text-indigo-600">
               <input type="checkbox" checked={optPricing} onChange={e => setOptPricing(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
               Pricing & Specs
             </label>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Main Product Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row">
             {/* Left: Image & Basics */}
             <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col items-center text-center bg-gray-50">
               <div className="w-48 h-48 bg-white rounded-lg border border-gray-200 mb-4 p-4 flex items-center justify-center">
                  {result.imageUri ? (
                    <img src={result.imageUri} alt={result.partNumber} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <CubeIcon className="w-16 h-16 text-gray-300" />
                  )}
               </div>
               <h2 className="text-2xl font-bold text-gray-900">{result.partNumber}</h2>
               <p className="text-indigo-600 font-medium mb-2">{result.manufacturer}</p>
               <div className="flex flex-wrap justify-center gap-2 mt-2">
                 {result.alternatives?.map(alt => (
                    <span key={alt} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">Alt: {alt}</span>
                 ))}
               </div>
             </div>

             {/* Right: Details */}
             <div className="p-6 md:w-2/3">
               <h3 className="text-lg font-semibold mb-2">Description</h3>
               <p className="text-gray-600 mb-6 leading-relaxed">{result.description}</p>
               
               {/* Quick Actions Grid */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                 {/* Datasheet Action */}
                 <div className="p-4 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="p-2 bg-red-50 text-red-600 rounded-lg"><FileTextIcon /></div>
                       <span className="font-semibold text-gray-900">Datasheet</span>
                    </div>
                    {result.datasheetUri ? (
                      <a href={result.datasheetUri} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                        View PDF <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">Not found directly. Check Manufacturer.</span>
                    )}
                 </div>

                 {/* CAD Action */}
                 <div className="p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CubeIcon /></div>
                       <span className="font-semibold text-gray-900">CAD Models</span>
                    </div>
                    {result.cadLinks.model3d ? (
                      <a href={result.cadLinks.model3d} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                        Download via {result.cadLinks.provider || "Web"} <DownloadCloudIcon className="w-3 h-3" />
                      </a>
                    ) : (
                      <div className="flex gap-2">
                         <a href={`https://www.snapeda.com/search/?q=${result.partNumber}`} target="_blank" className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">SnapEDA</a>
                         <a href={`https://componentsearchengine.com/search?q=${result.partNumber}`} target="_blank" className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">CSE</a>
                      </div>
                    )}
                 </div>
               </div>

               {/* Specs Table */}
               <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">Key Specifications</h4>
               <div className="grid grid-cols-2 gap-y-2 gap-x-8">
                  {Object.entries(result.specs).map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-500 text-sm">{key}</span>
                      <span className="text-gray-900 font-medium text-sm text-right">{val}</span>
                    </div>
                  ))}
               </div>
             </div>
          </div>

          {/* Pricing Card */}
          {optPricing && result.pricing && result.pricing.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <DollarSignIcon className="text-emerald-600" /> Distributor Pricing
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Distributor</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Unit Price</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.pricing.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{item.distributor}</td>
                        <td className="px-4 py-3 text-gray-600">{item.stock}</td>
                        <td className="px-4 py-3 font-mono text-emerald-600 font-medium">{item.price}</td>
                        <td className="px-4 py-3">
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase">
                            Buy Now
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
