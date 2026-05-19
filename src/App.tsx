import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TruthShieldLayout from "./layouts/TruthShieldLayout";
import HomePage from "./pages/HomePage";
import DetectionPage from "./pages/DetectionPage";
import TrainingPage from "./pages/TrainingPage";
import IncidentsPage from "./pages/IncidentsPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<TruthShieldLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/detection" element={<DetectionPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/403" element={<ForbiddenPage />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
