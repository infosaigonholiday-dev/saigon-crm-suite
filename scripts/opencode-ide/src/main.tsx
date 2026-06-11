import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Note: <React.StrictMode> is intentionally omitted. It double-invokes
// effects in dev, which would (1) double the `addRecentCwd` writes and
// (2) double the `invalidateQueries` calls. The IDE is a single-window
// app where we want effects to run exactly once.

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
