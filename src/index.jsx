// index.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";

const appRoot = createRoot(document.getElementById("root"));

appRoot.render(<App />);

export { appRoot };
