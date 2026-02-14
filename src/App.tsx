import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import About from "./pages/About";
import SubmitManuscript from "./pages/SubmitManuscript";
import AuthorGuidelines from "./pages/AuthorGuidelines";
import EditorialBoard from "./pages/EditorialBoard";
import Archive from "./pages/Archive";
import IssueDetail from "./pages/IssueDetail";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import DOIResolver from "./pages/DOIResolver";
import DOISearch from "./pages/DOISearch";
import EditorPanel from "./pages/EditorPanel";
import Auth from "./pages/Auth";
import AuthorDashboard from "./pages/AuthorDashboard";
import EditorSubmissions from "./pages/EditorSubmissions";
import Layout from "./components/Layout/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/about" element={<About />} />
            <Route path="/submit" element={<SubmitManuscript />} />
            <Route path="/guidelines" element={<AuthorGuidelines />} />
            <Route path="/editorial-board" element={<EditorialBoard />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/archive/:volume/:issue" element={<IssueDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/doi/:doi" element={<DOIResolver />} />
            <Route path="/doi-search" element={<DOISearch />} />
            <Route path="/editor" element={<EditorPanel />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/submissions" element={<AuthorDashboard />} />
            <Route path="/editor-submissions" element={<EditorSubmissions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
