import React, { ChangeEvent } from 'react';
import { UploadIcon, FileTextIcon, XCircleIcon, PdfIcon } from './Icons';
import { FileWithPreview } from '../types';

interface FileUploadProps {
  label: string;
  subLabel: string;
  accept?: string;
  file: FileWithPreview | null;
  onFileSelect: (file: FileWithPreview | null) => void;
  id: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  subLabel, 
  accept = "image/*", 
  file, 
  onFileSelect,
  id
}) => {
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extract base64 part
        const base64 = result.split(',')[1];
        
        onFileSelect({
          file: selectedFile,
          previewUrl: result,
          base64: base64
        });
      };
      
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    onFileSelect(null);
  };

  const isPdf = file?.file.type === 'application/pdf';

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      
      {!file ? (
        <label 
          htmlFor={id} 
          className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon />
            <p className="mb-2 text-sm text-gray-500 mt-2"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-500">{subLabel}</p>
          </div>
          <input 
            id={id} 
            type="file" 
            className="hidden" 
            accept={accept} 
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 group bg-gray-50">
          {isPdf ? (
             <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-600">
               <PdfIcon className="w-16 h-16 text-red-500 mb-2" />
               <span className="text-sm font-medium px-4 text-center truncate w-full">{file.file.name}</span>
               <span className="text-xs text-gray-400">PDF Document</span>
             </div>
          ) : (
            <img 
              src={file.previewUrl} 
              alt="Preview" 
              className="w-full h-full object-contain bg-gray-900" 
            />
          )}
          
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <span className="text-white text-sm font-medium flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
               <FileTextIcon className="w-4 h-4" /> {file.file.name}
            </span>
            <button 
              onClick={handleClear}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              title="Remove file"
            >
              <XCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};