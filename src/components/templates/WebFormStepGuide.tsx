import { Check, Circle } from "lucide-react";

type StepStatus = "done" | "current" | "upcoming";

interface Step {
  label: string;
  status: StepStatus;
}

interface WebFormStepGuideProps {
  hasName: boolean;
  isSaved: boolean;
  hasFormType: boolean;
  isPublished: boolean;
}

export default function WebFormStepGuide({ hasName, isSaved, hasFormType, isPublished }: WebFormStepGuideProps) {
  const steps: Step[] = [
    { label: "Gi skjemaet navn", status: hasName ? "done" : "current" },
    { label: "Lagre malen", status: isSaved ? "done" : hasName ? "current" : "upcoming" },
    { label: "Velg skjematype", status: hasFormType && isSaved ? "done" : isSaved ? "current" : "upcoming" },
    { label: "Publiser skjemaet", status: isPublished ? "done" : (isSaved && hasFormType) ? "current" : "upcoming" },
    { label: "Kopier lenke eller kode", status: isPublished ? "current" : "upcoming" },
  ];

  // All done
  if (isPublished) {
    steps[4].status = "done";
  }

  // Contextual help message
  let helpText = "Start med å gi skjemaet et navn.";
  if (!hasName) {
    helpText = "Start med å gi skjemaet et navn.";
  } else if (!isSaved) {
    helpText = "Trykk «Opprett mal» for å lagre skjemaet før du kan publisere det.";
  } else if (!isPublished) {
    helpText = "Velg skjematype og publiser skjemaet for å få lenke og embed-kode.";
  } else {
    helpText = "Skjemaet er publisert. Du kan nå kopiere lenken eller lime inn embed-koden på nettsiden.";
  }

  return (
    <div className="mb-5 bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {step.status === "done" ? (
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            ) : step.status === "current" ? (
              <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center">
                <Circle className="h-2 w-2 fill-primary text-primary" />
              </div>
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
            )}
            <span className={`text-xs whitespace-nowrap ${
              step.status === "done" ? "text-foreground font-medium" :
              step.status === "current" ? "text-primary font-medium" :
              "text-muted-foreground"
            }`}>
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-4 h-px mx-1 ${step.status === "done" ? "bg-primary" : "bg-muted-foreground/30"}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{helpText}</p>
    </div>
  );
}
