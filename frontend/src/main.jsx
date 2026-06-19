import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { logAppConfig } from "./config";
import "./index.css";

logAppConfig();

ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "rgba(15, 23, 42, 0.92)",
          color: "#e2e8f0",
          border: "1px solid rgba(34, 211, 238, 0.3)",
        },
      }}
    />
  </>
);
