import React from 'react';
import { FileText, Camera, Mic, Phone, ShieldCheck, Check } from 'lucide-react';
import type { StepId } from '../types';
import clsx from 'clsx';

interface StepIndicatorProps {
  currentStep: StepId;
}

const steps = [
  { id: 'document', label: 'Document', Icon: FileText },
  { id: 'selfie', label: 'Selfie', Icon: Camera },
  { id: 'voice', label: 'Voice', Icon: Mic },
  { id: 'call', label: 'AI Call', Icon: Phone },
  { id: 'result', label: 'Result', Icon: ShieldCheck },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 -z-10"></div>
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-900 px-2">
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                  isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "",
                  isActive ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "",
                  isPending ? "bg-slate-800 border-slate-700 text-slate-400" : ""
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <step.Icon className="w-5 h-5" />}
              </div>
              <span
                className={clsx(
                  "text-xs font-medium",
                  isCompleted ? "text-emerald-400" : "",
                  isActive ? "text-indigo-400" : "",
                  isPending ? "text-slate-500" : ""
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
