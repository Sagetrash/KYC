import React, { useState } from 'react';
import type { StepId, ExtractedDocumentData } from './types';
import { StepIndicator } from './components/StepIndicator';
import { DocumentStep } from './steps/DocumentStep';
import { SelfieStep } from './steps/SelfieStep';
import { VoiceStep } from './steps/VoiceStep';
import { CallStep } from './steps/CallStep';
import { ResultStep } from './steps/ResultStep';
import { Shield } from 'lucide-react';

function App() {
  const [currentStep, setCurrentStep] = useState<StepId>('document');
  // _docData will be passed to SelfieStep / CallStep in Milestones 2–4
  const [_docData, setDocData] = useState<ExtractedDocumentData | null>(null);

  const handleDocumentComplete = (data: ExtractedDocumentData) => {
    setDocData(data);
    setCurrentStep('selfie');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'document':
        return <DocumentStep onComplete={handleDocumentComplete} />;
      case 'selfie':
        return <SelfieStep onComplete={() => setCurrentStep('voice')} />;
      case 'voice':
        return <VoiceStep onComplete={() => setCurrentStep('call')} />;
      case 'call':
        return <CallStep onComplete={() => setCurrentStep('result')} />;
      case 'result':
        return <ResultStep onReset={() => { setCurrentStep('document'); setDocData(null); }} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              OpenKYC <span className="text-indigo-400">Platform</span>
            </span>
          </div>
          <div className="text-sm font-medium text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
            v0.1.0 • Dev Mode
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 max-w-3xl mx-auto">
          <StepIndicator currentStep={currentStep} />
        </div>
        
        <div className="flex justify-center">
          {renderStep()}
        </div>
      </main>
    </div>
  );
}

export default App;
