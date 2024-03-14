import React from "react";
import { createRoot } from "react-dom/client";
import "./options.css";
import { Options } from './options';


const appContainer = document.createElement("div");
document.body.appendChild(appContainer);

if (!appContainer) {
    throw new Error("Cannot find appContainer");
}

createRoot(appContainer).render(<Options />);