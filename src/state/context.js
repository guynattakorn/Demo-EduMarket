// state/context.js
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { createContext, useContext } from "react";

/** React context ของแอป */
export const Yp = createContext();

/** Hook อ่าน context ของแอป: { data, user, dispatch, setModal, toast, ... } */
export const Q = () => useContext(Yp);
