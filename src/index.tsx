import './index.css';
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

console.log('App starting...');
const container = document.getElementById("root");
if (container) {
  try {
    const root = createRoot(container);
    root.render(<App />);
  } catch (error) {
    console.error('Error rendering app:', error);
    container.innerHTML = '<div style="color: red; padding: 20px;">Error loading app. Check console for details.</div>';
  }
} else {
  console.error('Root element not found');
}