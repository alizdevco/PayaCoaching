import { Check } from "lucide-react";
import { Fragment } from "react";

import { toPersianDigits } from "../../lib/persianDate.js";

const TOTAL_STEPS = 3;

const STEP_LABELS = ["شماره موبایل", "تأیید کد", "تکمیل پروفایل"];

export function formatRegisterStepLabel(currentStep, totalSteps = TOTAL_STEPS) {
  return `مرحله ${toPersianDigits(currentStep)} از ${toPersianDigits(totalSteps)}`;
}

function StepConnector({ completed }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "h-0.5 flex-1 rounded-full transition-colors duration-300 ease-out",
        completed ? "bg-[#059669]" : "bg-stone-300",
      ].join(" ")}
    />
  );
}

function StepCircle({ step, currentStep }) {
  const isCompleted = step < currentStep;
  const isCurrent = step === currentStep;
  const isUpcoming = step > currentStep;

  return (
    <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-2 sm:w-[5.5rem]">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ease-out",
          isCompleted && "bg-[#059669] text-white",
          isCurrent &&
            "bg-[#064E3B] text-white ring-4 ring-[#059669]/25 ring-offset-2",
          isUpcoming &&
            "border-2 border-stone-300 bg-white text-[#78716C]",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={isCurrent ? "step" : undefined}
      >
        {isCompleted ? (
          <Check size={18} strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{toPersianDigits(step)}</span>
        )}
      </div>

      <span
        dir="rtl"
        className="text-center text-[11px] leading-snug text-[#78716C] sm:text-xs"
      >
        {STEP_LABELS[step - 1]}
      </span>
    </div>
  );
}

export default function RegisterStepIndicator({
  currentStep,
  totalSteps = TOTAL_STEPS,
}) {
  const stepLabel = formatRegisterStepLabel(currentStep, totalSteps);
  const steps = Array.from({ length: totalSteps }, (_, index) => index + 1);

  return (
    <div
      dir="ltr"
      className="mb-6 w-full"
      role="group"
      aria-label={stepLabel}
    >
      <div className="mx-auto flex max-w-md items-start px-1">
        {steps.map((step, index) => (
          <Fragment key={step}>
            {index > 0 && (
              <div className="flex min-w-[1rem] flex-1 items-center self-start pt-[1.125rem] sm:min-w-[1.5rem]">
                <StepConnector completed={currentStep > step} />
              </div>
            )}
            <StepCircle step={step} currentStep={currentStep} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
