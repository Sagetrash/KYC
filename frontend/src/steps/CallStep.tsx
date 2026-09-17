import React from 'react';
import { Phone } from 'lucide-react';

interface CallStepProps {
  onComplete: () => void;
}

export const CallStep: React.FC<CallStepProps> = ({ onComplete }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto py-12 px-6 bg-slate-800/50 border border-indigo-500/30 rounded-3xl">
      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
        <Phone className="w-10 h-10 text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-4 text-center">Interactive AI Verification Call</h2>
      
      <div className="inline-flex items-center px-4 py-2 bg-amber-500/20 text-amber-300 rounded-full font-medium mb-8">
        🚧 Coming in Milestone 4
      </div>
      
      <p className="text-slate-400 text-center mb-10 max-w-md">
        Engage with an AI compliance agent powered by Gemini 2.0 Flash to answer dynamic challenge questions while your voice is continuously verified.
      </p>

      <button
        onClick={onComplete}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
      >
        Finish Verification (Dev Mode)
      </button>
    </div>
  );
};
