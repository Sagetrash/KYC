import React from 'react';
import clsx from 'clsx';

interface FieldBadgeProps {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
}

export const FieldBadge: React.FC<FieldBadgeProps> = ({ label, value, icon }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-start gap-3">
      {icon && <div className="text-slate-400 mt-1">{icon}</div>}
      <div className="flex flex-col">
        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{label}</span>
        <span className={clsx("text-sm font-medium mt-1", value === null ? "text-slate-500 italic" : "text-white")}>
          {value === null ? 'N/A' : value}
        </span>
      </div>
    </div>
  );
};
