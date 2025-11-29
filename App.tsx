
import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsView } from './components/ResultsView';
import { BomView } from './components/BomView';
import { PartSearchView } from './components/PartSearchView';
import { CodeGenView } from './components/CodeGenView';
import { CpuIcon, AlertTriangleIcon, InfoIcon, CubeIcon, TableIcon, CheckCircleIcon, SearchIcon, TerminalIcon, CodeIcon } from './components/Icons';
import { FileWithPreview, AnalysisResult, BOMResult, AppState, ViewMode, CodeResult } from './types';
import { analyzeSchematic, generateBOM, generateFirmware } from './services/geminiService';

const App = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('AUDIT');
  
  const [schematicFile, setSchematicFile] = useState<FileWithPreview | null>(null);
  const [datasheetFile, setDatasheetFile] = useState<FileWithPreview | null>(null);
  const [partNumber, setPartNumber] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [pinMapping, setPinMapping] = useState(''); // New state for manual connections
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  const [auditResult, setAuditResult] = useState<AnalysisResult | null>(null);
  const [bomResult, setBomResult] = useState<BOMResult | null>(null);
  const [codeResult, setCodeResult] = useState<CodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!schematicFile) return;

    setAppState(AppState.ANALYZING);
    setError(null);
    setAuditResult(null);
    setBomResult(null);
    setCodeResult(null);

    try {
      if (viewMode === 'AUDIT') {
        const data = await analyzeSchematic(
          schematicFile.base64,
          schematicFile.file.type,
          partNumber,
          datasheetFile ? datasheetFile.base64 : null,
          datasheetFile ? datasheetFile.file.type : null,
          additionalNotes
        );

        if (data.missingDatasheet) {
          setAppState(AppState.MISSING_DATASHEET);
        } else {
          setAuditResult(data);
          setAppState(AppState.SUCCESS);
        }
      } else if (viewMode === 'BOM') {
        const data = await generateBOM(
            schematicFile.base64,
            schematicFile.file.type
        );
        setBomResult(data);
        setAppState(AppState.SUCCESS);
      } else if (viewMode === 'CODE_GEN') {
        const data = await generateFirmware(
            schematicFile.base64,
            schematicFile.file.type,
            additionalNotes,
            pinMapping
        );
        setCodeResult(data);
        setAppState(AppState.SUCCESS);
      }

    } catch (err: any) {
      console.error(err);
      setError("Failed to process the schematic. Please ensure the file is clear and readable.");
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    // Keep files, just reset result
    setAuditResult(null);
    setBomResult(null);
    setCodeResult(null);
    setAppState(AppState.IDLE);
    setError(null);
  };

  const switchMode = (mode: ViewMode) => {
      setViewMode(mode);
      setAppState(AppState.IDLE);
      setAuditResult(null);
      setBomResult(null);
      setCodeResult(null);
      setError(null);
  };

  // Part Number is optional
  const isFormValid = !!schematicFile;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <CpuIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Schematic<span className="text-indigo-600">Auditor</span>
            </h1>
          </div>
          
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
             <button 
                onClick={() => switchMode('AUDIT')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'AUDIT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
             >
                <CheckCircleIcon className="w-4 h-4" /> Audit
             </button>
             <button 
                onClick={() => switchMode('BOM')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'BOM' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
             >
                <TableIcon className="w-4 h-4" /> BOM
             </button>
             <button 
                onClick={() => switchMode('CODE_GEN')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'CODE_GEN' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
             >
                <TerminalIcon className="w-4 h-4" /> Firmware
             </button>
             <button 
                onClick={() => switchMode('PART_SEARCH')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'PART_SEARCH' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
             >
                <SearchIcon className="w-4 h-4" /> Search
             </button>
          </div>

          <div className="text-sm text-gray-500 hidden sm:block">
            Powered by Gemini 2.5
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro Section */}
        {appState === AppState.IDLE && viewMode !== 'PART_SEARCH' && (
          <div className="text-center mb-12 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {viewMode === 'AUDIT' && 'AI-Powered Circuit Verification'}
              {viewMode === 'BOM' && 'Automated BOM & CAD Discovery'}
              {viewMode === 'CODE_GEN' && 'Schematic-to-Code Generator'}
            </h2>
            <p className="text-gray-600 text-lg">
              {viewMode === 'AUDIT' && "Upload your schematic and let AI audit your design against official datasheets to find errors."}
              {viewMode === 'BOM' && "Generate a priced Bill of Materials and find 3D CAD models directly from your schematic."}
              {viewMode === 'CODE_GEN' && "Automatically generate initialization firmware (C/C++, Arduino) based on schematic pin connections."}
            </p>
          </div>
        )}

        {/* View Routing */}
        {viewMode === 'PART_SEARCH' ? (
           <PartSearchView />
        ) : (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Inputs */}
            <div className={`lg:col-span-5 space-y-6 ${appState === AppState.SUCCESS ? 'hidden lg:block' : ''}`}>
              
              {/* Step 1: Schematic */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs text-gray-600">1</span>
                  Upload Schematic
                </h3>
                <FileUpload 
                  id="schematic-upload"
                  label="Schematic Diagram" 
                  subLabel="Image (PNG, JPG) or Full PDF" 
                  file={schematicFile} 
                  onFileSelect={setSchematicFile}
                  accept="image/*,application/pdf"
                />
              </div>

              {/* Step 2/3: View Specific Inputs */}
              {(viewMode === 'AUDIT' || viewMode === 'CODE_GEN') && (
                  <>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs text-gray-600">2</span>
                          Configuration <span className="text-gray-400 font-normal text-sm ml-2">(Optional)</span>
                      </h3>
                      
                      {viewMode === 'AUDIT' && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Part Number</label>
                            <input
                            type="text"
                            value={partNumber}
                            onChange={(e) => setPartNumber(e.target.value)}
                            placeholder="Leave empty to scan ALL parts"
                            className="w-full border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                      )}

                      {/* Manual Pin Mapping for Code Gen */}
                      {viewMode === 'CODE_GEN' && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Manual Pin Connections
                            </label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[80px] font-mono bg-slate-50"
                                placeholder={"Enter connections explicitly if needed:\n\nLED_STATUS -> PA5\nBUTTON -> PC13\nSENSORS -> I2C1 (PB6, PB7)"}
                                value={pinMapping}
                                onChange={(e) => setPinMapping(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                These manual connections will override the AI's visual analysis of the schematic.
                            </p>
                        </div>
                      )}

                      <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                             {viewMode === 'CODE_GEN' ? 'Firmware Requirements' : 'Design Notes'}
                          </label>
                          <textarea
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[80px]"
                          placeholder={viewMode === 'CODE_GEN' ? "E.g., Generate STM32 HAL code, use 8MHz clock, initialize UART2." : "E.g., verifying 3.3V power rails only."}
                          value={additionalNotes}
                          onChange={(e) => setAdditionalNotes(e.target.value)}
                          />
                      </div>
                  </div>

                  {viewMode === 'AUDIT' && (
                    <div className={`bg-white p-6 rounded-xl shadow-sm border transition-colors ${appState === AppState.MISSING_DATASHEET ? 'border-amber-400 ring-4 ring-amber-50' : 'border-gray-200'}`}>
                        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                            <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs text-gray-600">3</span>
                            Datasheet (Optional)
                        </h3>
                        
                        {appState === AppState.MISSING_DATASHEET && (
                            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start animate-pulse">
                            <InfoIcon className="text-amber-600 w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">Ambiguous or Missing Data</p>
                                <p className="text-xs text-amber-700 mt-0.5">We couldn't confidently match a part. Please upload the specific datasheet pinout.</p>
                            </div>
                            </div>
                        )}

                        <FileUpload 
                            id="datasheet-upload"
                            label={appState === AppState.MISSING_DATASHEET ? "Upload Pinout (Required)" : "Upload Datasheet (PDF/Img)"}
                            subLabel="Datasheet PDF or Screenshot" 
                            file={datasheetFile} 
                            onFileSelect={setDatasheetFile}
                            accept="image/*,application/pdf"
                        />
                    </div>
                  )}
                  </>
              )}

              {viewMode === 'BOM' && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6">
                      <div className="flex gap-4">
                          <CubeIcon className="text-emerald-600 w-8 h-8 shrink-0" />
                          <div>
                              <h4 className="font-bold text-emerald-900">Ready to Generate</h4>
                              <p className="text-sm text-emerald-800 mt-1">
                                  We will extract components, estimate pricing from major distributors, and find 3D CAD/Footprint links.
                              </p>
                          </div>
                      </div>
                  </div>
              )}

              <div className="sticky bottom-4 z-20">
                <button
                  onClick={handleAnalyze}
                  disabled={!isFormValid || appState === AppState.ANALYZING}
                  className={`
                    w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95
                    ${!isFormValid 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : appState === AppState.ANALYZING
                        ? 'bg-gray-400 cursor-wait'
                        : viewMode === 'AUDIT' ? 'bg-indigo-600 hover:bg-indigo-700' 
                        : viewMode === 'BOM' ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-slate-800 hover:bg-slate-900'
                    }
                  `}
                >
                  {appState === AppState.ANALYZING ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    viewMode === 'AUDIT' ? "Start Audit" 
                    : viewMode === 'BOM' ? "Generate BOM & CAD"
                    : "Generate Firmware"
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-7">
              
              {appState === AppState.ERROR && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
                    <AlertTriangleIcon className="text-red-500 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-red-900">Analysis Failed</h3>
                      <p className="text-red-700 mt-1">{error}</p>
                      <button 
                        onClick={() => setAppState(AppState.IDLE)}
                        className="mt-4 text-sm font-semibold text-red-700 hover:text-red-900 underline"
                      >
                        Try Again
                      </button>
                    </div>
                </div>
              )}

              {appState === AppState.SUCCESS && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center lg:hidden">
                      <h2 className="text-xl font-bold">Results</h2>
                      <button onClick={handleReset} className="text-sm font-medium text-gray-600">New</button>
                  </div>
                  
                  {viewMode === 'AUDIT' && auditResult && <ResultsView result={auditResult} />}
                  {viewMode === 'BOM' && bomResult && <BomView result={bomResult} />}
                  {viewMode === 'CODE_GEN' && codeResult && <CodeGenView result={codeResult} />}
                  
                  <div className="hidden lg:flex justify-end mt-8">
                      <button 
                        onClick={handleReset}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                      >
                        Start New {viewMode === 'AUDIT' ? 'Audit' : 'Task'}
                      </button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(appState === AppState.IDLE || appState === AppState.MISSING_DATASHEET) && (
                <div className="hidden lg:flex h-full min-h-[500px] border-2 border-dashed border-gray-200 rounded-xl items-center justify-center bg-gray-50/50">
                  <div className="text-center text-gray-400 max-w-xs">
                    {viewMode === 'AUDIT' ? <CpuIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    : viewMode === 'BOM' ? <TableIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    : <CodeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />}
                    <p>Results will appear here after you run the analysis.</p>
                  </div>
                </div>
              )}

              {appState === AppState.ANALYZING && (
                <div className="hidden lg:flex h-full min-h-[500px] flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                  <div className="w-full max-w-md space-y-6">
                      <div className="flex justify-between text-sm text-gray-500 font-medium">
                        <span>Working...</span>
                        <span>50%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full animate-progress ${
                            viewMode === 'AUDIT' ? 'bg-indigo-600' : 
                            viewMode === 'BOM' ? 'bg-emerald-600' : 'bg-slate-800'
                        }`}></div>
                      </div>
                      
                      <p className="text-center text-gray-400 text-sm mt-4">
                        {viewMode === 'AUDIT' && "Verifying pinouts and logic..."}
                        {viewMode === 'BOM' && "Querying distributor pricing and CAD databases..."}
                        {viewMode === 'CODE_GEN' && "Mapping pins and writing driver code..."}
                      </p>
                  </div>
                  <style>{`
                      @keyframes progress {
                        0% { width: 0%; }
                        50% { width: 70%; }
                        100% { width: 95%; }
                      }
                      .animate-progress {
                        animation: progress 8s ease-out forwards;
                      }
                  `}</style>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
