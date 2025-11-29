import React from 'react';
import { BOMResult, BOMItem } from '../types';
import { CubeIcon, TableIcon, DownloadIcon, ExternalLinkIcon } from './Icons';

interface BomViewProps {
  result: BOMResult;
}

export const BomView: React.FC<BomViewProps> = ({ result }) => {
  
  const handleDownloadCsv = () => {
    // 1. Prepare Data
    const headers = ["Part Number", "Description", "Manufacturer", "Qty", "Designators", "Unit Price (USD)", "Total Price (USD)", "CAD Link"];
    
    const rows = result.items.map(item => {
        // Construct a CAD link string. Prefer explicit links, fallback to search query
        const cadLink = item.cadLinks.model3d || item.cadLinks.footprint || `https://www.snapeda.com/search/?q=${item.partNumber}`;
        
        return [
            item.partNumber,
            `"${item.description.replace(/"/g, '""')}"`, // Escape double quotes for CSV
            item.manufacturer,
            item.quantity,
            `"${item.designators}"`,
            item.estimatedUnitPrice.toFixed(4),
            item.totalPrice.toFixed(2),
            cadLink
        ];
    });

    // 2. Build CSV Content
    const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
    ].join("\n");

    // 3. Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bom_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderCadActions = (item: BOMItem) => {
    // If AI found specific links
    if (item.cadLinks.model3d || item.cadLinks.footprint) {
        return (
            <div className="flex flex-col gap-1">
                {item.cadLinks.model3d && (
                <a href={item.cadLinks.model3d} target="_blank" rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 hover:bg-blue-100 transition-colors text-xs font-medium" title="View 3D Model">
                    <CubeIcon className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[80px]">3D Model</span>
                </a>
                )}
                {item.cadLinks.footprint && !item.cadLinks.model3d && (
                    <a href={item.cadLinks.footprint} target="_blank" rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-100 hover:bg-orange-100 transition-colors text-xs font-medium" title="PCB Footprint">
                    <span className="font-bold">PCB</span>
                    <span className="truncate max-w-[80px]">Footprint</span>
                    </a>
                )}
            </div>
        );
    }

    // Fallback: Generate Search Links
    return (
        <div className="flex flex-col gap-1">
            <a href={`https://www.snapeda.com/search/?q=${encodeURIComponent(item.partNumber)}`} 
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors text-xs"
            >
                <CubeIcon className="w-3 h-3" /> Find on SnapEDA
            </a>
            <a href={`https://octopart.com/search?q=${encodeURIComponent(item.partNumber)}`} 
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors text-xs"
            >
                <ExternalLinkIcon className="w-3 h-3" /> Find on Octopart
            </a>
        </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="bg-emerald-900 p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <TableIcon className="w-6 h-6" /> Bill of Materials
            </h2>
            <p className="text-emerald-100 text-sm">
                Generated from schematic. Costs are estimates.
            </p>
        </div>
        <div className="flex flex-col items-end gap-2">
             <div className="text-right">
                <p className="text-emerald-200 text-xs uppercase tracking-wider font-bold">Total Est. Cost</p>
                <p className="text-3xl font-bold text-white flex items-center justify-end">
                    <span className="text-emerald-400 mr-1">$</span>
                    {result.totalEstimatedCost.toFixed(2)}
                </p>
             </div>
             <button 
                onClick={handleDownloadCsv}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
             >
                <DownloadIcon className="w-4 h-4" /> Download CSV
             </button>
        </div>
      </div>

      <div className="p-6">
        
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs">
              <tr>
                <th className="px-4 py-3 border-b">Part Details</th>
                <th className="px-4 py-3 border-b text-center">Qty</th>
                <th className="px-4 py-3 border-b">Refs</th>
                <th className="px-4 py-3 border-b text-right">Unit ($)</th>
                <th className="px-4 py-3 border-b text-right">Total ($)</th>
                <th className="px-4 py-3 border-b w-[180px]">CAD / 3D Models</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors align-top">
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900">{item.partNumber}</div>
                    <div className="text-xs text-gray-500">{item.manufacturer}</div>
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-2" title={item.description}>{item.description}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                  <td className="px-4 py-3">
                     <div className="text-xs text-gray-500 break-words max-w-[150px] font-mono" title={item.designators}>
                        {item.designators}
                     </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600 whitespace-nowrap">
                    ${item.estimatedUnitPrice.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 whitespace-nowrap">
                    ${item.totalPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {renderCadActions(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sources Disclaimer */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-4">
            <p>
                * Costs are estimated based on online distributor pricing (DigiKey, Mouser, etc.) and may vary.
            </p>
            {result.sources && (
                 <div className="flex gap-2">
                    <span className="font-semibold">Sources:</span>
                    {result.sources.slice(0, 3).map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" className="hover:underline text-blue-400 truncate max-w-[100px]">{s.title}</a>
                    ))}
                 </div>
            )}
        </div>

      </div>
    </div>
  );
};