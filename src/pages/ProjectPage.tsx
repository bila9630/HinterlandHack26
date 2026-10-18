import { useMemo, useState } from "react";
import AddGoodsForm from "@/components/project/AddGoodsForm";
import FloorScene from "@/components/project/FloorScene";
import GoodsList from "@/components/project/GoodsList";
import LayoutFloor, { FloorMode } from "@/components/project/LayoutFloor";
import LayoutGallery, { LayoutChoice } from "@/components/project/LayoutGallery";
import OfferPage from "@/components/project/OfferPage";
import PeoplePage from "@/components/project/PeoplePage";
import ProcessPage from "@/components/project/process/ProcessPage";
import ReviewPage from "@/components/project/ReviewPage";
import { LAYOUTS } from "@/components/project/layouts";
import { Goods, layoutGoods } from "@/components/project/goods";
import { PlacedWorkstation } from "@/components/project/workstations";
import { DEFAULT_STAFFING, Staffing } from "@/components/project/people";
import { ProcessStep } from "@/components/project/process/model";
import { STEPS, useStep } from "@/hooks/useStep";

export default function ProjectPage() {
  const [step, setStep] = useStep();
  const [goods, setGoods] = useState<Goods[]>([]);
  const [layout, setLayout] = useState<LayoutChoice>({ kind: "example", id: "warehouse-production" });
  // The Workstations step goes gallery → layout on the floor → placing workstations.
  const [floorMode, setFloorMode] = useState<FloorMode | null>(null);
  const [workstations, setWorkstations] = useState<PlacedWorkstation[]>([]);
  // One process per kind of goods (keyed by goods id, or "all" before any goods exist).
  const [processes, setProcesses] = useState<Record<string, ProcessStep[]>>({});
  const [processGoodsId, setProcessGoodsId] = useState<string | null>(null);
  const [staffing, setStaffing] = useState<Staffing>(DEFAULT_STAFFING);
  const slots = useMemo(() => layoutGoods(goods), [goods]);

  function addGoods(input: Omit<Goods, "id">) {
    setGoods((current) => [...current, { ...input, id: crypto.randomUUID() }]);
  }

  function chooseLayout(choice: LayoutChoice) {
    // Placed workstations only make sense on the layout they were placed on.
    const sameLayout = choice.kind === "example" && layout.kind === "example" && choice.id === layout.id;
    if (!sameLayout) {
      setWorkstations([]);
      setProcesses({});
    }
    setLayout(choice);
  }

  const chosen = layout.kind === "example" ? LAYOUTS.find((item) => item.id === layout.id) : undefined;

  if (step === 1) {
    if (floorMode && chosen) {
      return (
        <LayoutFloor
          layout={chosen}
          mode={floorMode}
          workstations={workstations}
          onWorkstationsChange={setWorkstations}
          onChangeLayout={() => setFloorMode(null)}
          onAddWorkstations={() => setFloorMode("workstations")}
          onContinue={() => setStep(2)}
        />
      );
    }
    return <LayoutGallery choice={layout} onChoose={chooseLayout} onUse={() => setFloorMode("summary")} />;
  }

  if (step === 2 && chosen) {
    const processKey = goods.find((item) => item.id === processGoodsId)?.id ?? goods[0]?.id ?? "all";
    return (
      <ProcessPage
        layout={chosen}
        workstations={workstations}
        goods={goods}
        activeGoodsId={processKey === "all" ? null : processKey}
        onActiveGoodsChange={setProcessGoodsId}
        steps={processes[processKey] ?? []}
        onStepsChange={(next) => setProcesses((current) => ({ ...current, [processKey]: next }))}
        onContinue={() => setStep(3)}
      />
    );
  }

  if (step === 3 && chosen) {
    return (
      <PeoplePage
        layout={chosen}
        workstations={workstations}
        staffing={staffing}
        onStaffingChange={setStaffing}
        onContinue={() => setStep(4)}
      />
    );
  }

  if (step === 4) {
    const live = chosen && {
      layout: chosen,
      workstations,
      processes: Object.values(processes),
      staffing,
      onContinue: () => setStep(5),
    };
    return <ReviewPage live={live} />;
  }

  if (step === 5) return <OfferPage />;

  if (step > 1) {
    return (
      <main className="flex h-[calc(100vh-3rem)] items-center justify-center text-[12px] text-slate-500">
        The {STEPS[step]} step is not built yet.
      </main>
    );
  }

  return (
    <main className="relative flex flex-col bg-[#e0e7f3] lg:block lg:h-[calc(100vh-3rem)] lg:overflow-hidden">
      <div className="relative order-2 h-[60vh] lg:absolute lg:inset-0 lg:h-auto">
        <FloorScene slots={slots} />
        {goods.length === 0 && (
          <div className="pointer-events-none absolute top-1/2 left-1/2 mt-6 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white/90 px-3 py-1.5 text-center">
            <p className="text-[11px] font-semibold">The floor is empty</p>
            <p className="text-[9px] text-slate-500">Goods you add appear here in 3D</p>
          </div>
        )}
      </div>
      <div className="relative z-10 order-1 m-4 lg:absolute lg:top-4 lg:left-4 lg:m-0 lg:w-[264px]">
        <AddGoodsForm onAdd={addGoods} />
      </div>
      <div className="relative z-10 order-3 m-4 lg:absolute lg:top-4 lg:right-4 lg:m-0 lg:w-[320px]">
        <GoodsList
          goods={goods}
          onRemove={(id) => setGoods((current) => current.filter((item) => item.id !== id))}
        />
      </div>
    </main>
  );
}
