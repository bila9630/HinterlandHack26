import { ComponentType } from "react";
import { useProcessContext } from "../ProcessContext";
import { stationName, travelDistance } from "../model";
import EditStepForm from "./EditStepForm";
import NewStepForm from "./NewStepForm";
import WorkflowEditor from "./WorkflowEditor";
import WorkflowPicker from "./WorkflowPicker";
import { CardMode, StepCardProps, StepFormProps } from "./types";

const CARDS: Record<CardMode, ComponentType<StepFormProps>> = {
  workflows: WorkflowPicker,
  workflow: WorkflowEditor,
  form: NewStepForm,
  edit: EditStepForm,
};

// The floating card for one step; which card shows depends on the mode.
export function StepCard(props: StepCardProps) {
  const station = props.stations.find((item) => item.id === props.step.stationId)!;
  const Card = CARDS[props.mode];
  return (
    <Card
      {...props}
      station={station}
      kicker={`Step ${props.number} · ${stationName(station.kind)}`}
      distance={props.previous ? Math.round(travelDistance(props.previous, station)) : 0}
    />
  );
}

// The process's open card, if any, wired to the shared process state.
export default function StepCardHost() {
  const { card, cardIndex, stations, route, changeCard, setCardMode, saveCard, closeCard, removeStep } =
    useProcessContext();
  if (!card) return null;
  return (
    <StepCard
      key={`${card.step.id}-${card.mode}`}
      mode={card.mode}
      step={card.step}
      number={cardIndex + 1}
      isNew={card.isNew}
      stations={stations}
      previous={cardIndex > 0 ? route[cardIndex - 1] : undefined}
      onChange={changeCard}
      onMode={setCardMode}
      onSave={saveCard}
      onCancel={closeCard}
      onRemove={card.isNew ? undefined : () => removeStep(card.step.id)}
    />
  );
}
