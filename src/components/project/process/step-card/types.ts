import { ProcessStep, Station } from "../model";

export type CardMode = "workflows" | "workflow" | "form" | "edit";

export type StepCardProps = {
  mode: CardMode;
  step: ProcessStep;
  number: number;
  isNew: boolean;
  stations: Station[];
  // The stop before this one, when there is one.
  previous?: Station;
  onChange: (step: ProcessStep) => void;
  onMode: (mode: CardMode) => void;
  onSave: (step: ProcessStep) => void;
  onCancel: () => void;
  onRemove?: () => void;
};

// What each card needs on top of the props: the step's stop, its kicker and the distance from the previous stop.
export type StepFormProps = StepCardProps & { station: Station; kicker: string; distance: number };
