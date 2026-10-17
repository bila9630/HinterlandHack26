import { useState } from "react";
import ProcessFloor from "./floor/ProcessFloor";
import ProcessFlow from "./flow/ProcessFlow";
import { ProcessProvider } from "./ProcessContext";
import { ProcessProps, useProcess } from "./useProcess";

export default function ProcessPage(props: ProcessProps) {
  const [view, setView] = useState<"floor" | "flow">("floor");
  const model = useProcess(props);

  // An open card belongs to the view it was opened in.
  function show(next: "floor" | "flow") {
    model.closeCard();
    setView(next);
  }

  return (
    <ProcessProvider value={model}>
      {view === "flow" ? <ProcessFlow onOpen3D={() => show("floor")} /> : <ProcessFloor onShowFlow={() => show("flow")} />}
    </ProcessProvider>
  );
}
