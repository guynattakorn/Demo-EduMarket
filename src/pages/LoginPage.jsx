// pages/LoginPage.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { Avatar } from "../components/Avatar.jsx";
import { Button, Field } from "../components/ui.jsx";

const ROLES = [
  ["student", "นักเรียน"],
  ["teacher", "ครู"],
  ["admin", "แอดมิน"],
];

const QUICK_USERS = [
  { label: "มินต์ · ม.4/1", u: "mint", p: "password123", role: "student" },
  { label: "ปัน · ม.4/1", u: "pun", p: "password123", role: "student" },
  { label: "ฟ้า · ม.4/1", u: "fah", p: "password123", role: "student" },
  { label: "ต้น · ม.4/2", u: "ton", p: "password123", role: "student" },
  { label: "ครูพลอย · ม.4/1", u: "ploy", p: "password123", role: "teacher" },
  { label: "ครูนนท์ · ม.4/2", u: "nont", p: "password123", role: "teacher" },
  { label: "ผู้ดูแลระบบ", u: "admin", p: "admin123", role: "admin" },
];

const CLASS_OPTIONS = [
  ["c1", "ม.4/1 (ครูพลอย)"],
  ["c2", "ม.4/2 (ครูนนท์)"],
  ["c3", "ม.5/1 (ครูเมย์)"],
  ["c4", "ม.6/3 (ครูเอก)"],
];

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** หน้า Login / สมัครสมาชิก (เชื่อม /api/auth/login, /api/auth/register) — เดิมชื่อ Vh */
export function LoginPage({ onLogin }) {
  const [role, setRole] = useState("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regClass, setRegClass] = useState("c1");

  const canRegister = role !== "admin";
  const registering = isRegister && canRegister;

  const handleResult = (data, fallbackError) => {
    if (data.success && data.user) onLogin(data.user.role, data.user);
    else setError(data.error || fallbackError);
  };

  const quickLogin = async (qu) => {
    setUsername(qu.u);
    setPassword(qu.p);
    setRole(qu.role);
    setError("");
    setLoading(true);
    try {
      handleResult(await postJson("/api/auth/login", { username: qu.u, password: qu.p }), "เข้าสู่ระบบไม่สำเร็จ");
    } catch (ex) {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = registering
        ? await postJson("/api/auth/register", { name: regName, username, password, role, classId: regClass })
        : await postJson("/api/auth/login", { username, password });
      handleResult(data, "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } catch (ex) {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            e<span>m</span>
          </span>
          <span className="brand-name">
            edu<span className="brand-thin">market</span>
          </span>
        </div>
        <h1>{registering ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</h1>

        <div className="segmented-control auth-roles" role="tablist" aria-label="เลือกบทบาท">
          {ROLES.map(([key, label]) => (
            <button
              type="button"
              role="tab"
              aria-selected={role === key}
              className={role === key ? "selected" : ""}
              onClick={() => {
                setRole(key);
                setError("");
                if (key === "admin") setIsRegister(false);
              }}
              key={key}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="auth-form">
          {registering && (
            <Field label="ชื่อ-นามสกุล">
              <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="เช่น มินต์ รัตนวิชัย" required />
            </Field>
          )}
          <Field label="ชื่อผู้ใช้">
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="เช่น mint"
              required
            />
          </Field>
          <Field label="รหัสผ่าน">
            <input
              name="password"
              type="password"
              autoComplete={registering ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {registering && (
            <Field label="ห้องเรียน">
              <select value={regClass} onChange={(e) => setRegClass(e.target.value)}>
                {CLASS_OPTIONS.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Button variant="black full" disabled={loading || !username.trim() || !password || (registering && !regName.trim())}>
            {loading ? "กำลังดำเนินการ…" : registering ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </Button>
        </form>

        {canRegister && (
          <p className="auth-switch">
            {registering ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"}{" "}
            <button
              type="button"
              className="btn text small"
              onClick={() => {
                setIsRegister(!registering);
                setError("");
              }}
            >
              {registering ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
          </p>
        )}

        {!registering && (
          <div className="auth-quick">
            <span className="auth-quick-title">บัญชีทดลอง</span>
            <div className="auth-quick-list">
              {QUICK_USERS.filter((q) => q.role === role).map((qu) => (
                <button type="button" className="auth-quick-btn" onClick={() => quickLogin(qu)} disabled={loading} key={qu.u}>
                  <Avatar name={qu.label.split(" · ")[0]} size="tiny" />
                  {qu.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
