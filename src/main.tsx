import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initAppCheck } from "./lib/app-check";
import { registerServiceWorker } from "./lib/service-worker";

// Initialize client attestation & offline service worker
initAppCheck();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
