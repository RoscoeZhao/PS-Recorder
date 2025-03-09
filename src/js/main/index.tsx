import React from "react";
import ReactDOM from "react-dom/client";
import { Provider, defaultTheme } from '@adobe/react-spectrum';
import { initBolt } from "../lib/utils/bolt";
import { BasePanel } from "./main";

initBolt();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider theme={defaultTheme} colorScheme="dark">
      <BasePanel/>
    </Provider>
  </React.StrictMode>
);
