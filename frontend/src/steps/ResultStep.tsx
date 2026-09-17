import React from 'react';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import { ConfidenceDial } from '../components/ConfidenceDial';

interface ResultStepProps {
  onReset: () => void;
}

export const ResultStep: React.FC<ResultStepProps> = ({ onReset }) => {
  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto animate-fade-up">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"></div>
        <div className="relative w-32 h-32 bg-slate-900 border-4 border-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)]">
          <ShieldCheck className="w-16 h-16 text-emerald-500" />
        </div>
      </div>
      
      <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
        VERIFIED
      </h2>
      <p className="text-slate-400 mb-10">Identity verification completed successfully</p>

      <div className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-8 mb-8 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-700 pb-4">Biometric Scorecard</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="flex flex-col items-center">
            <p className="text-slate-400 text-sm mb-3">Document</p>
            <ConfidenceDial score={98} size={72} />
          </div>
          <div className="flex flex-col items-center">
            <p className="text-slate-400 text-sm mb-3">Face Match</p>
            <ConfidenceDial score={92} size={72} />
          </div>
          <div className="flex flex-col items-center">
            <p className="text-slate-400 text-sm mb-3">Voice Match</p>
            <ConfidenceDial score={88} size={72} />
          </div>
          <div className="flex flex-col items-center">
            <p className="text-slate-400 text-sm mb-3">AI Call Intel</p>
            <ConfidenceDial score={95} size={72} />
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
          <span className="text-emerald-400 font-semibold">Total Confidence Score</span>
          <span className="text-2xl font-bold text-white">93%</span>
        </div>
      </div>

      <button
        onClick={onReset}
        className="py-3 px-8 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-medium transition-colors flex items-center gap-2 border border-slate-700"
      >
        <RotateCcw className="w-4 h-4" />
        Start New Verification
      </button>
    </div>
  );
};
