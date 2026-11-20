// modals/CalculatorModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { Field, Stat } from "../components/ui.jsx";
import { Qu } from "../state/selectors.js";
import { Nt } from "../utils/format.js";

/** เครื่องคิดเลขจุดคุ้มทุน — เดิมชื่อ c1 */
export function CalculatorModal() {
  let [t, e] = useState(100),
    [a, l] = useState(20),
    [n, i] = useState(35),
    [c, u] = useState(20),
    o = Qu(n, Math.max(c, 1), t, a);
  return (
    <>
      <div className="two-col">
        {[
          ["ต้นทุนคงที่รวม (บาท)", t, e, 0],
          ["ต้นทุนผันแปร / ชิ้น", a, l, 0],
          ["ราคาขาย / ชิ้น", n, i, 1],
          ["จำนวนที่คาดว่าจะขาย", c, u, 1],
        ].map(([d, g, h, p]) => (
          <Field label={d} key={d}>
            <input
              type="number"
              min={p}
              value={g}
              onChange={(r) => h(Math.max(p, Number(r.target.value)))}
            />
          </Field>
        ))}
      </div>
      <div className="metric-grid">
        <Stat label="จุดคุ้มทุน" value={o.breakeven === null ? "ยังคุ้มทุนไม่ได้" : o.breakeven + " ชิ้น"} />
        <Stat label="ต้นทุนต่อชิ้น" value={"฿" + o.unit.toFixed(2)} />
        <Stat
          label="กำไร"
          value={"฿" + Nt(o.profit)}
          color={o.profit >= 0 ? "lime" : "peach"}
        />
      </div>
      <p className="hint">คิดจากการขายครบทุกชิ้น</p>
    </>
  );
}
