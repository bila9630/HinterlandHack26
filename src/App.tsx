import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import Header from "@/components/Header";
import ProjectsPage from "@/pages/ProjectsPage";

// Loaded on demand so the overview doesn't pull in three.js.
const ProjectPage = lazy(() => import("@/pages/ProjectPage"));
const FactorySceneDev = lazy(() => import("@/pages/FactorySceneDev"));

export default function App() {
  return (
    <div className="min-h-screen bg-[#f1f5fb] font-sans text-slate-900">
      <Header />
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route
          path="/project"
          element={
            <Suspense fallback={null}>
              <ProjectPage />
            </Suspense>
          }
        />
        {import.meta.env.DEV && (
          <Route
            path="/dev/factory-scene"
            element={
              <Suspense fallback={null}>
                <FactorySceneDev />
              </Suspense>
            }
          />
        )}
      </Routes>
    </div>
  );
}
