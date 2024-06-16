import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "../Store";
import "./popup.css";
import { ErrorBoundary } from "../components/ErrorBoundry";
import { App } from "./App";


const appContainer = document.createElement("div");
document.body.appendChild(appContainer);

if (!appContainer) {
    throw new Error("Cannot find appContainer");
}

createRoot(appContainer).render(
    <StrictMode>
        <ErrorBoundary>
            <Provider>
                <App />
            </Provider>
        </ErrorBoundary>
    </StrictMode>
);
