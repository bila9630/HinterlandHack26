import { useMemo, useState } from "react";
import AddGoodsForm from "@/components/project/AddGoodsForm";
import FloorScene from "@/components/project/FloorScene";
import GoodsList from "@/components/project/GoodsList";
import { Goods, layoutGoods } from "@/components/project/goods";

export default function ProjectPage() {
  const [goods, setGoods] = useState<Goods[]>([]);
  const slots = useMemo(() => layoutGoods(goods), [goods]);

  function addGoods(input: Omit<Goods, "id">) {
    setGoods((current) => [...current, { ...input, id: crypto.randomUUID() }]);
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
      <div className="relative z-10 order-3 m-4 lg:absolute lg:top-4 lg:right-4 lg:m-0 lg:w-[264px]">
        <GoodsList
          goods={goods}
          onRemove={(id) => setGoods((current) => current.filter((item) => item.id !== id))}
        />
      </div>
    </main>
  );
}
