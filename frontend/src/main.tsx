import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppShell from "./pages/AppShell";
import BracketReview from "./pages/BracketReview";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import StrategyEntry from "./pages/StrategyEntry";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="/pools/:poolId/entry" element={<StrategyEntry />} />
          <Route path="/pools/:poolId/review" element={<BracketReview />} />
          <Route path="/pools/:poolId/leaderboard" element={<Leaderboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
