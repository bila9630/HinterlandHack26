import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import CubeStack from "@/components/CubeStack";
import NewProjectModal, { NewProjectInput } from "@/components/NewProjectModal";

type Tone = "blue" | "orange" | "green";

type Project = {
  id: string;
  customer: string;
  goods: number;
  stage: string;
  step: number;
  tone: Tone;
  date: string;
};

const TOTAL_STEPS = 6;

const initialProjects: Project[] = [
  { id: "T-0418", customer: "[Customer A]", goods: 4, stage: "Goods", step: 1, tone: "blue", date: "due 30 Oct" },
  { id: "T-0415", customer: "[Customer B]", goods: 7, stage: "Workstations", step: 2, tone: "blue", date: "due 28 Oct" },
  { id: "T-0412", customer: "[Customer C]", goods: 3, stage: "People", step: 4, tone: "orange", date: "due 24 Oct" },
  { id: "T-0409", customer: "[Customer D]", goods: 12, stage: "Review", step: 5, tone: "orange", date: "due 22 Oct" },
  { id: "T-0401", customer: "[Customer E]", goods: 5, stage: "Offer sent", step: 6, tone: "green", date: "sent 14 Oct" },
];

const badgeStyles: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700",
  orange: "bg-orange-50 text-orange-700",
  green: "bg-green-50 text-green-700",
};

const barStyles: Record<Tone, string> = {
  blue: "bg-blue-600",
  orange: "bg-orange-500",
  green: "bg-green-600",
};

function ProjectCard({ project }: { project: Project }) {
  const done = project.step >= TOTAL_STEPS;
  const progress = (project.step / TOTAL_STEPS) * 100;

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative flex h-[83px] items-center justify-center bg-[#e6edf8]">
        <span
          className={`absolute top-2.5 left-2.5 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${badgeStyles[project.tone]}`}
        >
          {done ? project.stage : `${project.stage} · ${project.step}/${TOTAL_STEPS}`}
        </span>
        <CubeStack className="h-14" />
      </div>
      <div className="px-3 pt-4 pb-3.5">
        <h2 className="text-[13px] font-semibold">{project.customer}</h2>
        <p className="text-[10px] text-slate-500">
          {project.id} · {project.goods} goods
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${barStyles[project.tone]}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[9px] whitespace-nowrap text-slate-500">
            {project.date}
          </span>
        </div>
      </div>
    </article>
  );
}

function nextProjectId(projects: Project[]) {
  const highest = Math.max(0, ...projects.map((project) => Number(project.id.slice(2))));
  return `T-${String(highest + 1).padStart(4, "0")}`;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState(initialProjects);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const closeModal = useCallback(() => setModalOpen(false), []);

  function createProject({ customer, deadline }: NewProjectInput) {
    const due = deadline.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    setProjects((current) => [
      {
        id: nextProjectId(current),
        customer,
        goods: 0,
        stage: "Goods",
        step: 1,
        tone: "blue",
        date: `due ${due}`,
      },
      ...current,
    ]);
    setModalOpen(false);
    navigate("/project");
  }

  return (
    <main className="mx-auto w-full max-w-[822px] px-4 py-8 sm:py-10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tender projects</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {projects.length} projects
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          <span className="text-base leading-none">+</span>
          New project
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      <NewProjectModal open={modalOpen} onClose={closeModal} onCreate={createProject} />
    </main>
  );
}
