import React from "react";

export interface StepItem {
  number: number;
  label: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  className = "",
}) => {
  return (
    <nav
      aria-label="Progress Stepper"
      className={`grid grid-cols-2 sm:grid-cols-4 border border-editorial-border bg-white divide-x divide-y sm:divide-y-0 divide-editorial-border ${className}`}
    >
      {steps.map((s) => {
        const isCurrent = s.number === currentStep;
        const isComplete = s.number < currentStep;

        return (
          <div
            key={s.number}
            aria-current={isCurrent ? "step" : undefined}
            className={`p-3 sm:p-4 text-left transition-colors ${
              isCurrent
                ? "bg-ink text-canvas font-bold"
                : isComplete
                ? "bg-editorial-surface text-ink"
                : "bg-white text-editorial-muted"
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-widest opacity-80">
              {isComplete ? `✓ STEP 0${s.number}` : `STEP 0${s.number}`}
            </div>
            <div className="text-xs sm:text-sm font-heading font-bold truncate mt-0.5">
              {s.label}
            </div>
          </div>
        );
      })}
    </nav>
  );
};
