"use client";
import { RecoveryBoundary } from "./recovery-boundary";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { AdminConsole } from "./admin-console";
import { ApiClientError, ApiUser, api } from "./api";

type AuthState =
  | { status: "loading" }
  | { status: "setup" }
  | { status: "login"; message?: string }
  | { status: "authenticated"; token: string; user: ApiUser };

function AdminAppContent() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const status = await api.setupStatus();
        if (!active) return;
        if (!status.initialized) {
          setAuth({ status: "setup" });
          return;
        }
        const token = window.localStorage.getItem("neotrix-admin-token");
        if (!token) {
          setAuth({ status: "login" });
          return;
        }
        try {
          const user = await api.me(token);
          if (active) setAuth({ status: "authenticated", token, user });
        } catch {
          window.localStorage.removeItem("neotrix-admin-token");
          if (active) setAuth({ status: "login", message: "登录状态已过期，请重新登录。" });
        }
      } catch {
        if (active) setAuth({ status: "login", message: "后台服务暂时不可用，请稍后重试。" });
      }
    };
    void initialize();
    const expire = () => setAuth({ status: "login", message: "登录状态已过期，请重新登录。" });
    window.addEventListener("neotrix-auth-expired", expire);
    return () => {
      active = false;
      window.removeEventListener("neotrix-auth-expired", expire);
    };
  }, []);

  if (auth.status === "loading") return <AuthShell><div className="auth-loading"><i /><p>正在连接 CUC Supply 管理系统…</p></div></AuthShell>;
  if (auth.status === "setup") return <SetupScreen onComplete={(token, user) => setAuth({ status: "authenticated", token, user })} />;
  if (auth.status === "login") return <LoginScreen message={auth.message} onLogin={(token, user) => setAuth({ status: "authenticated", token, user })} />;

  return <AdminConsole token={auth.token} user={auth.user} onLogout={async () => {
    try { await api.logout(auth.token); } catch { /* clear local access even if network is unavailable */ }
    window.localStorage.removeItem("neotrix-admin-token");
    setAuth({ status: "login" });
  }} />;
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="auth-shell">
    <section className="auth-brand-panel">
      <div className="auth-brand"><img src="/cuc-supply-logo.webp" alt="CUC Supply" /></div>
      <div className="auth-message"><p>运营控制中心</p><h1>一个系统，<br />管理每个环节。</h1><span>集中管理商品目录、库存和页面内容，让团队高效协作、业务稳定运行。</span></div>
      <div className="auth-grid-art"><i /><i /><i /><i /></div>
    </section>
    <section className="auth-form-panel">{children}</section>
  </main>;
}

function LoginScreen({ message, onLogin }: { message?: string; onLogin: (token: string, user: ApiUser) => void }) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(message ?? "");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await api.login(account, password);
      window.localStorage.setItem("neotrix-admin-token", result.token);
      onLogin(result.token, result.user);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "无法登录，请检查账号和密码。" );
    } finally { setBusy(false); }
  };
  return <AuthShell><form className="auth-card" onSubmit={submit}>
    <p className="eyebrow">安全管理入口</p><h2>欢迎回来</h2><p className="auth-copy">登录后管理 CUC Supply 商品目录、库存和页面内容。</p>
    {error && <div className="auth-error" role="alert">{error}</div>}
    <label><span>账号</span><input type="text" required autoComplete="username" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="请输入管理员账号" /></label>
    <label><span>密码</span><input type="password" required minLength={6} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" /></label>
    <button className="auth-submit" disabled={busy}>{busy ? "正在登录…" : "登录"} <span><ArrowRight aria-hidden="true" /></span></button>
    <div className="auth-security"><i><Check aria-hidden="true" weight="bold" /></i><p><strong>安全会话保护</strong><span>登录凭据仅发送至 CUC Supply 管理接口。</span></p></div>
  </form></AuthShell>;
}

function SetupScreen({ onComplete }: { onComplete: (token: string, user: ApiUser) => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", bootstrapToken: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await api.bootstrap(form);
      const login = await api.login(form.email, form.password);
      window.localStorage.setItem("neotrix-admin-token", login.token);
      onComplete(login.token, login.user);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "无法初始化管理系统。" );
    } finally { setBusy(false); }
  };
  return <AuthShell><form className="auth-card setup-card" onSubmit={submit}>
    <p className="eyebrow">首次设置</p><h2>创建管理员账号</h2><p className="auth-copy">此步骤只执行一次，用于创建首位超级管理员。初始化代码由网站所有者提供。</p>
    {error && <div className="auth-error" role="alert">{error}</div>}
    <div className="auth-form-row"><label><span>显示名称</span><input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label><span>邮箱地址</span><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label></div>
    <label><span>密码</span><input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><small>至少 8 个字符，请使用独立密码。</small></label>
    <label><span>初始化代码</span><input type="password" required value={form.bootstrapToken} onChange={(e) => setForm({ ...form, bootstrapToken: e.target.value })} /><small>网站所有者提供的一次性代码，并非登录密码。</small></label>
    <button className="auth-submit" disabled={busy}>{busy ? "正在创建…" : "创建超级管理员"} <span><ArrowRight aria-hidden="true" /></span></button>
  </form></AuthShell>;
}

export function AdminApp(){return <RecoveryBoundary><AdminAppContent/></RecoveryBoundary>}
