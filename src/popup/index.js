import React from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";
import { Popup } from "./popup";


const appContainer = document.createElement("div");
document.body.appendChild(appContainer);

if (!appContainer) {
    throw new Error("Cannot find appContainer");
}

createRoot(appContainer).render(<Popup />);
