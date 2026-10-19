"use client";
/* eslint-disable jsx-a11y/label-has-associated-control, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions, react-hooks/set-state-in-effect */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";

type Evidence = { name: string; size: string };
type Indicator = {
  id: string;
  scoreId?: string;
  code: string;
  name: string;
  category: string;
  subcategory: string;
  score: number;
  label: string;
  target: number;
  evidence: Evidence[];
  assessor: string;
};

type Category = {
  id: string;
  name: string;
  desc: string;
  progress: number;
  score: number;
  weight: number;
};
type AdminData = {
  units: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  types: Array<Record<string, unknown>>;
  periods: Array<Record<string, unknown>>;
  structure: Array<Record<string, unknown>>;
};

const initialCategories: Category[] = [
  {
    id: "cat-1",
    name: "Aspek 1",
    desc: "Kebijakan Internal Tata Kelola",
    progress: 92,
    score: 4.12,
    weight: 0.2,
  },
  {
    id: "cat-2",
    name: "Aspek 2",
    desc: "Tata Kelola Pemerintah Digital",
    progress: 78,
    score: 3.84,
    weight: 0.3,
  },
  {
    id: "cat-3",
    name: "Aspek 3",
    desc: "Manajemen Pemerintah Digital",
    progress: 64,
    score: 3.21,
    weight: 0.2,
  },
  {
    id: "cat-4",
    name: "Aspek 4",
    desc: "Layanan Pemerintah Digital",
    progress: 88,
    score: 4.02,
    weight: 0.3,
  },
];

const subcategories = [
  {
    code: "1.1",
    name: "Kebijakan Internal Tata Kelola SPBE",
    category: "Aspek 1",
    score: 4.28,
    target: 4.5,
    indicators: 4,
  },
  {
    code: "1.2",
    name: "Kebijakan Internal Manajemen SPBE",
    category: "Aspek 1",
    score: 3.96,
    target: 4.2,
    indicators: 6,
  },
  {
    code: "2.1",
    name: "Perencanaan Strategis SPBE",
    category: "Aspek 2",
    score: 4.1,
    target: 4.5,
    indicators: 4,
  },
  {
    code: "2.2",
    name: "Teknologi Informasi dan Komunikasi",
    category: "Aspek 2",
    score: 3.58,
    target: 4.0,
    indicators: 5,
  },
  {
    code: "3.1",
    name: "Penerapan Manajemen SPBE",
    category: "Aspek 3",
    score: 3.21,
    target: 4.0,
    indicators: 8,
  },
  {
    code: "4.1",
    name: "Layanan Administrasi Pemerintahan",
    category: "Aspek 4",
    score: 4.18,
    target: 4.5,
    indicators: 7,
  },
  {
    code: "4.2",
    name: "Layanan Publik Berbasis Elektronik",
    category: "Aspek 4",
    score: 3.86,
    target: 4.2,
    indicators: 6,
  },
];

const initialIndicators: Indicator[] = [
  {
    id: "1",
    code: "1.1.1",
    name: "Arsitektur SPBE Instansi Pusat/Pemerintah Daerah",
    category: "Aspek 1",
    subcategory: "Tata Kelola Pemerintah Digital",
    score: 4,
    label: "Sangat Baik",
    target: 5,
    evidence: [{ name: "Perbup-Arsitektur-SPBE-2025.pdf", size: "2,4 MB" }],
    assessor: "Rina Kusuma",
  },
  {
    id: "2",
    code: "1.1.2",
    name: "Peta Rencana SPBE Instansi",
    category: "Aspek 1",
    subcategory: "Tata Kelola Pemerintah Digital",
    score: 3,
    label: "Baik",
    target: 4,
    evidence: [
      { name: "Peta-Rencana-SPBE.xlsx", size: "840 KB" },
      { name: "Notulen-Evaluasi.pdf", size: "1,1 MB" },
    ],
    assessor: "Budi Santoso",
  },
  {
    id: "3",
    code: "1.2.1",
    name: "Penerapan Manajemen Risiko SPBE",
    category: "Aspek 1",
    subcategory: "Manajemen Layanan Digital Pemerintah",
    score: 2,
    label: "Cukup",
    target: 4,
    evidence: [],
    assessor: "Siti Rahma",
  },
  {
    id: "4",
    code: "2.1.1",
    name: "Layanan Administrasi Pemerintahan Berbasis Elektronik",
    category: "Aspek 2",
    subcategory: "Layanan Pemerintah Digital",
    score: 5,
    label: "Memuaskan",
    target: 5,
    evidence: [{ name: "Laporan-Layanan-2025.pdf", size: "3,8 MB" }],
    assessor: "Rina Kusuma",
  },
];

const scoreLabels = [
  "Belum Dinilai",
  "Kurang",
  "Cukup",
  "Baik",
  "Sangat Baik",
  "Memuaskan",
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    Dashboard: (
      <>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13v-9.5" />
      </>
    ),
    Penilaian: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    "Bukti Dukung": (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5M10 13h5M10 17h5" />
      </>
    ),
    Laporan: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    "Jenis Penilaian": (
      <>
        <path d="M4 6h16M4 12h16M4 18h10" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    "Tahun Penilaian": (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    "Kategori Indikator": (
      <>
        <path d="M6 4v16M6 8h6M6 16h6M12 8v8M12 12h6" />
        <circle cx="18" cy="12" r="2" />
      </>
    ),
    "Pengguna & Akses": (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2.5 21a6.5 6.5 0 0 1 13 0M17 11l4 2v3c0 2.5-1.7 4.2-4 5-2.3-.8-4-2.5-4-5v-3z" />
      </>
    ),
  };
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [year, setYear] = useState("2025");
  const [assessment, setAssessment] = useState("SPBE");
  const [indicators, setIndicators] = useState(initialIndicators);
  const [categories, setCategories] = useState(initialCategories);
  const [selectedId, setSelectedId] = useState("3");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [sessionUser, setSessionUser] = useState<{
    displayName: string;
    role: string;
  } | null>(null);
  const [backendReady, setBackendReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authView, setAuthView] = useState<"login" | "forgot" | "reset">(
    "login",
  );
  const [showAuth, setShowAuth] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [assessmentAttention, setAssessmentAttention] = useState<Record<string, unknown> | null>(null);
  const [adminData, setAdminData] = useState<AdminData>({
    units: [],
    users: [],
    types: [],
    periods: [],
    structure: [],
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const loadNotifications = async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const result = (await response.json()) as {
      notifications?: Array<Record<string, unknown>>;
      unread?: number;
    };
    setNotifications(result.notifications ?? []);
    setUnreadNotificationCount(Number(result.unread ?? 0));
  };

  useEffect(() => {
    if (!sessionUser) return;
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 30000);
    const refresh = () => void loadNotifications();
    window.addEventListener("satunilai:notifications", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("satunilai:notifications", refresh);
    };
  }, [sessionUser]);

  const openNotification = async (notification: Record<string, unknown>) => {
    if (!notification.read) {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: notification.key }),
      });
      if (response.ok)
        setUnreadNotificationCount((count) => Math.max(0, count - 1));
    }
    setNotifications((items) =>
      items.map((item) =>
        String(item.key) === String(notification.key)
          ? { ...item, read: true }
          : item,
      ),
    );
    setShowNotifications(false);
    setAssessmentAttention({
      periodId: notification.periodId,
      typeId: notification.typeId,
      subcategoryId: notification.subcategoryId,
      indicatorId: notification.indicatorId,
      scoreId: notification.scoreId,
    });
    setActive("Penilaian");
  };

  const selected =
    indicators.find((item) => item.id === selectedId) ?? indicators[0];
  const filtered = useMemo(
    () =>
      indicators.filter((item) =>
        `${item.code} ${item.name} ${item.subcategory}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [indicators, query],
  );
  const progress = Math.round(
    (indicators.filter((item) => item.score > 0).length / indicators.length) *
      100,
  );
  const totalWeight = categories.reduce(
    (sum, category) => sum + category.weight,
    0,
  );
  const finalScore = categories.reduce(
    (sum, category) => sum + category.score * category.weight,
    0,
  );

  const updateWeight = (index: number, value: number) => {
    const normalized = Math.max(
      0,
      Math.min(1, Number.isFinite(value) ? value : 0),
    );
    setCategories((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, weight: normalized } : item,
      ),
    );
    const category = categories[index];
    if (backendReady && category)
      void fetch("/api/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "weight",
          id: category.id,
          value: normalized * 100,
        }),
      })
        .then((response) => {
          if (!response.ok) throw new Error();
        })
        .then(() => flash("Bobot tersimpan permanen"))
        .catch(() => flash("Bobot belum dapat disimpan"));
  };

  useEffect(() => {
    let active = true;
    async function connect() {
      try {
        if (new URLSearchParams(window.location.search).has("reset")) {
          setAuthView("reset");
          setShowAuth(true);
        }
        const response = await fetch("/api/me", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          user: { displayName: string; role: string };
        };
        if (active) {
          setSessionUser(data.user);
          setBackendReady(true);
        }
        const dashboardResponse = await fetch("/api/dashboard", {
          cache: "no-store",
        });
        if (dashboardResponse.ok && active) {
          const dashboard = (await dashboardResponse.json()) as {
            categories: Array<{
              id: string;
              code: string;
              name: string;
              weight: number;
              score: number;
              total: number;
              completed: number;
            }>;
            indicators: Array<{
              id: string;
              score_id: string;
              code: string;
              name: string;
              category: string;
              subcategory: string;
              score: number | null;
              target: number | null;
              evidence_count: number;
              assessor_name: string | null;
            }>;
          };
          if (dashboard.categories.length)
            setCategories(
              dashboard.categories.map((item) => ({
                id: item.id,
                name: `Aspek ${item.code}`,
                desc: item.name,
                weight: Number(item.weight) / 100,
                score: Number(item.score),
                progress: item.total
                  ? Math.round(
                      (Number(item.completed) / Number(item.total)) * 100,
                    )
                  : 0,
              })),
            );
          if (dashboard.indicators.length) {
            setIndicators(
              dashboard.indicators.map((item) => ({
                id: item.id,
                scoreId: item.score_id,
                code: item.code,
                name: item.name,
                category: item.category,
                subcategory: item.subcategory,
                score: Number(item.score ?? 0),
                label: scoreLabels[Number(item.score ?? 0)] ?? "Belum Dinilai",
                target: Number(item.target ?? 0),
                evidence: Array.from(
                  { length: Number(item.evidence_count) },
                  (_, index) => ({
                    name: `Bukti dukung ${index + 1}`,
                    size: "Tersimpan privat",
                  }),
                ),
                assessor: item.assessor_name ?? "Belum direview",
              })),
            );
            setSelectedId(dashboard.indicators[0].id);
          }
        }
        const adminResponse = await fetch("/api/admin", { cache: "no-store" });
        if (adminResponse.ok && active)
          setAdminData((await adminResponse.json()) as AdminData);
      } catch {
        /* dashboard remains available while backend reconnects */
      } finally {
        if (active) setAuthReady(true);
      }
    }
    void connect();
    return () => {
      active = false;
    };
  }, []);

  const displayName = sessionUser?.displayName?.split("@")[0] ?? "Ahmad Rasyid";
  const displayRole =
    sessionUser?.role === "admin"
      ? "Administrator"
      : sessionUser?.role === "head"
        ? "Kepala Unit"
        : "Staf";

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const setScore = (score: number) => {
    setIndicators((items) =>
      items.map((item) =>
        item.id === selected.id
          ? { ...item, score, label: scoreLabels[score] }
          : item,
      ),
    );
    flash("Nilai indikator berhasil diperbarui");
    if (backendReady && selected.scoreId)
      void fetch("/api/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score",
          id: selected.scoreId,
          value: score,
        }),
      })
        .then((response) => {
          if (!response.ok) throw new Error();
        })
        .then(() => flash("Nilai tersimpan permanen"))
        .catch(() => flash("Nilai belum dapat disimpan"));
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const additions = Array.from(files).map((file) => ({
      name: file.name,
      size:
        file.size > 1_000_000
          ? `${(file.size / 1_000_000).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1000))} KB`,
    }));
    if (backendReady && selected.scoreId) {
      let uploaded = 0;
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("scoreId", selected.scoreId);
        form.set("title", file.name.replace(/\.[^.]+$/, ""));
        form.set("file", file);
        const response = await fetch("/api/evidence", {
          method: "POST",
          body: form,
        });
        if (response.ok) uploaded += 1;
      }
      if (!uploaded) {
        flash("Bukti ditolak atau belum dapat disimpan");
        return;
      }
      setIndicators((items) =>
        items.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                evidence: [...item.evidence, ...additions.slice(0, uploaded)],
              }
            : item,
        ),
      );
      flash(`${uploaded} bukti tersimpan secara privat`);
    } else {
      setIndicators((items) =>
        items.map((item) =>
          item.id === selected.id
            ? { ...item, evidence: [...item.evidence, ...additions] }
            : item,
        ),
      );
      flash(`${additions.length} bukti ditambahkan sementara`);
    }
  };

  const scoreColor = (score: number) =>
    score >= 5 ? "blue" : score >= 4 ? "green" : score >= 3 ? "amber" : "red";

  const assessmentMenuCount = notifications
    .filter((notification) =>
      sessionUser?.role === "admin"
        ? ["submitted", "draft"].includes(String(notification.status))
        : sessionUser?.role === "staff"
          ? String(notification.status) === "rejected"
          : false,
    )
    .reduce(
      (total, notification) =>
        total + Math.max(1, Number(notification.evidenceCount ?? 0)),
      0,
    );

  if (!authReady) return <div className="auth-loading">Memuat SatuNilai…</div>;
  if (!sessionUser)
    return showAuth ? (
      <AuthScreen view={authView} setView={setAuthView} onBack={() => setShowAuth(false)} />
    ) : (
      <PublicDashboard onLogin={() => setShowAuth(true)} />
    );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark satunilai-logo">
            <Image
              src="/brand/satunilai-mark.png"
              alt="Logo SatuNilai"
              width={38}
              height={38}
            />
          </span>
          <div>
            <strong>SatuNilai</strong>
            <small>Manajemen Penilaian</small>
          </div>
        </div>
        <nav aria-label="Navigasi utama">
          <p className="nav-label">RUANG KERJA</p>
          {["Dashboard", "Penilaian", "Bukti Dukung", "Laporan"].map((item) => (
            <button
              key={item}
              className={active === item ? "active" : ""}
              onClick={() => setActive(item)}
            >
              <NavIcon name={item} />
              {item}
              {item === "Penilaian" && assessmentMenuCount > 0 && (
                <em
                  className={
                    sessionUser.role === "staff"
                      ? "nav-alert rejected"
                      : "nav-alert pending"
                  }
                  title={
                    sessionUser.role === "staff"
                      ? `${assessmentMenuCount} bukti ditolak dan perlu diperbaiki`
                      : `${assessmentMenuCount} bukti menunggu verifikasi`
                  }
                >
                  {Math.min(99, assessmentMenuCount)}
                </em>
              )}
            </button>
          ))}
          {sessionUser.role === "admin" && (
            <p className="nav-label">PENGELOLAAN</p>
          )}
          {sessionUser.role === "admin" &&
            [
              "Jenis Penilaian",
              "Tahun Penilaian",
              "Kategori Indikator",
              "Pengguna & Akses",
            ].map((item) => (
              <button
                key={item}
                className={active === item ? "active" : ""}
                onClick={() => {
                  setActive(item);
                  flash(`${item} siap dikelola`);
                }}
              >
                <NavIcon name={item} />
                {item}
              </button>
            ))}
        </nav>
        <div className="user-card">
          <div className="avatar">{displayName.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{displayName}</strong>
            <small>{displayRole}</small>
          </div>
          <button
            aria-label="Keluar"
            title="Keluar"
            onClick={() =>
              void fetch("/api/auth/logout", { method: "POST" }).then(() =>
                window.location.reload(),
              )
            }
          >
            Keluar
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark satunilai-logo">
              <Image
                src="/brand/satunilai-mark.png"
                alt="Logo SatuNilai"
                width={31}
                height={31}
              />
            </span>
            <strong>SatuNilai</strong>
          </div>
          <div className="top-actions">
            <span
              className={`secure-state ${backendReady ? "ready" : "connecting"}`}
            >
              <i />
              {backendReady
                ? "Penyimpanan privat aktif"
                : "Menghubungkan penyimpanan"}
            </span>
            <div className="notification-center">
              <button
                type="button"
                className="icon-btn"
                aria-label="Notifikasi"
                aria-expanded={showNotifications}
                onClick={() => {
                  setShowNotifications((visible) => !visible);
                  void loadNotifications();
                }}
              >
                ♢{unreadNotificationCount > 0 && <i />}
                {unreadNotificationCount > 0 && (
                  <b>{Math.min(99, unreadNotificationCount)}</b>
                )}
              </button>
              {showNotifications && (
                <section className="notification-popover">
                  <header>
                    <strong>Notifikasi</strong>
                    <span>{unreadNotificationCount} belum dibaca</span>
                  </header>
                  {notifications.length === 0 ? (
                    <p className="notification-empty">Belum ada notifikasi.</p>
                  ) : (
                    <div>
                      {notifications.map((notification) => (
                        <button
                          type="button"
                          key={String(notification.key)}
                          className={notification.read ? "read" : "unread"}
                          onClick={() => void openNotification(notification)}
                        >
                          <span
                            className={`notification-tone ${String(notification.status)}`}
                          />
                          <div>
                            <strong>{String(notification.label)}</strong>
                            <p>
                              {String(notification.code)} ·{" "}
                              {String(notification.name)}
                            </p>
                            {String(notification.note ?? "") && (
                              <small>{String(notification.note)}</small>
                            )}
                            <time>
                              {String(notification.typeCode)} ·{" "}
                              {String(notification.year)}
                            </time>
                          </div>
                          {!notification.read && (
                            <i aria-label="Belum dibaca" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
            <div className="header-user">
              <div className="avatar">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <span>
                <strong>{displayName}</strong>
                <small>{displayRole}</small>
              </span>
            </div>
          </div>
        </header>

        <div className="content">
          {active === "Dashboard" ? (
            <DashboardWorkspace
              displayName={displayName}
              onOpenAssessment={() => setActive("Penilaian")}
            />
          ) : active === "__dashboard_lama" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">RINGKASAN PENILAIAN</p>
                  <h1>
                    Selamat pagi, {displayName.split(" ")[0]} <span>👋</span>
                  </h1>
                  <p>
                    Pantau progres dan kelengkapan dokumen penilaian instansi
                    Anda.
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => setActive("Penilaian")}
                >
                  ＋ Buka Penilaian
                </button>
              </div>
              <div className="filterbar">
                <label>
                  Tahun Penilaian
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option>2025</option>
                    <option>2024</option>
                    <option>2023</option>
                  </select>
                </label>
                <label>
                  Jenis Penilaian
                  <select
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                  >
                    <option>SPBE</option>
                    <option>Indeks SDI</option>
                    <option>EPSS</option>
                    <option>ITKP</option>
                  </select>
                </label>
                <div className="final-score">
                  <span>Nilai Akhir {assessment}</span>
                  <strong>{finalScore.toFixed(2).replace(".", ",")}</strong>
                  <b className="badge green">Sangat Baik</b>
                </div>
              </div>

              <div className="metrics">
                <article>
                  <span className="metric-icon purple">▦</span>
                  <div>
                    <small>TOTAL INDIKATOR</small>
                    <strong>47</strong>
                    <p>
                      <b>4 aspek</b> · 12 sub kategori
                    </p>
                  </div>
                </article>
                <article>
                  <span className="metric-icon green">✓</span>
                  <div>
                    <small>SUDAH DINILAI</small>
                    <strong>
                      38 <i>/ 47</i>
                    </strong>
                    <p>
                      <b>80,9%</b> telah selesai
                    </p>
                  </div>
                </article>
                <article>
                  <span className="metric-icon amber">◷</span>
                  <div>
                    <small>PERLU DILENGKAPI</small>
                    <strong>9</strong>
                    <p>
                      <b>3 bukti</b> belum diunggah
                    </p>
                  </div>
                </article>
                <article>
                  <span className="metric-icon blue">↗</span>
                  <div>
                    <small>TARGET NILAI</small>
                    <strong>4,20</strong>
                    <p>
                      <b>+0,48</b> dari nilai saat ini
                    </p>
                  </div>
                </article>
              </div>

              <div className="main-grid">
                <section className="panel progress-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Progres Penilaian {assessment}</h2>
                      <p>Per kategori utama · Tahun {year}</p>
                    </div>
                    <button>⋮</button>
                  </div>
                  <div className="overall">
                    <div
                      className="ring"
                      style={
                        { "--progress": `${progress}%` } as React.CSSProperties
                      }
                    >
                      <span>{progress}%</span>
                    </div>
                    <div>
                      <strong>
                        {assessment} {year}
                      </strong>
                      <p>38 dari 47 indikator selesai dinilai</p>
                    </div>
                    <b className="badge green">Berjalan</b>
                  </div>
                  <div className="category-list">
                    <div className="weight-header">
                      <span>Kategori & progres</span>
                      <span>Bobot</span>
                      <span>Nilai</span>
                      <span>Kontribusi</span>
                    </div>
                    {categories.map((cat, i) => (
                      <div
                        className="category-row weighted"
                        key={`${cat.name}-${i}`}
                      >
                        <span className={`cat-num c${i + 1}`}>{i + 1}</span>
                        <div className="cat-body">
                          <div>
                            <strong>{cat.name}</strong>
                            <small>{cat.desc}</small>
                          </div>
                          <div className="progress-track">
                            <i style={{ width: `${cat.progress}%` }} />
                          </div>
                        </div>
                        <label
                          className="weight-input"
                          aria-label={`Bobot ${cat.name}`}
                        >
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.05"
                            value={cat.weight}
                            onChange={(event) =>
                              updateWeight(i, Number(event.target.value))
                            }
                          />
                          <small>{Math.round(cat.weight * 100)}%</small>
                        </label>
                        <div className="cat-score">
                          <strong>
                            {cat.score.toFixed(2).replace(".", ",")}
                          </strong>
                          <small>{cat.progress}% selesai</small>
                        </div>
                        <div className="contribution">
                          <strong>
                            {(cat.score * cat.weight)
                              .toFixed(3)
                              .replace(".", ",")}
                          </strong>
                          <small>
                            {cat.score.toFixed(2).replace(".", ",")} ×{" "}
                            {cat.weight.toFixed(2).replace(".", ",")}
                          </small>
                        </div>
                      </div>
                    ))}
                    <div
                      className={`weight-total ${Math.abs(totalWeight - 1) < 0.001 ? "valid" : "invalid"}`}
                    >
                      <span>Total bobot</span>
                      <strong>
                        {totalWeight.toFixed(2).replace(".", ",")}{" "}
                        <small>({Math.round(totalWeight * 100)}%)</small>
                      </strong>
                      <span>
                        {Math.abs(totalWeight - 1) < 0.001
                          ? "✓ Bobot sudah sesuai"
                          : "! Total bobot harus 1,00"}
                      </span>
                    </div>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setActive("Penilaian")}
                  >
                    Lihat seluruh penilaian <span>→</span>
                  </button>
                </section>

                <section className="panel activity-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Aktivitas Terkini</h2>
                      <p>Pembaruan dari tim Anda</p>
                    </div>
                    <button>⋮</button>
                  </div>
                  <div className="activity-list">
                    {[
                      {
                        initials: "RK",
                        color: "pink",
                        text: (
                          <>
                            <b>Rina Kusuma</b> memperbarui nilai indikator{" "}
                            <strong>1.1.1</strong>
                          </>
                        ),
                        time: "12 menit lalu",
                      },
                      {
                        initials: "BS",
                        color: "blue",
                        text: (
                          <>
                            <b>Budi Santoso</b> mengunggah bukti dukung pada{" "}
                            <strong>1.1.2</strong>
                          </>
                        ),
                        time: "45 menit lalu",
                      },
                      {
                        initials: "SR",
                        color: "amber",
                        text: (
                          <>
                            <b>Siti Rahma</b> menambahkan catatan pada{" "}
                            <strong>1.2.1</strong>
                          </>
                        ),
                        time: "2 jam lalu",
                      },
                      {
                        initials: "AR",
                        color: "green",
                        text: (
                          <>
                            <b>Anda</b> menyetujui penilaian{" "}
                            <strong>Aspek 4</strong>
                          </>
                        ),
                        time: "Kemarin, 16.20",
                      },
                    ].map((activity, i) => (
                      <div className="activity" key={i}>
                        <div className={`avatar ${activity.color}`}>
                          {activity.initials}
                        </div>
                        <div>
                          <p>{activity.text}</p>
                          <small>{activity.time}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="text-button">
                    Lihat semua aktivitas <span>→</span>
                  </button>
                </section>
              </div>

              <section className="panel subcategory-panel">
                <div className="panel-head">
                  <div>
                    <h2>Nilai Subkategori</h2>
                    <p>
                      Nilai merupakan rata-rata indikator di dalam subkategori
                      dan menopang nilai kategori utama.
                    </p>
                  </div>
                  <span className="formula-pill">
                    Nilai kategori = Σ nilai subkategori
                  </span>
                </div>
                <div className="subcategory-grid">
                  {subcategories.map((sub) => {
                    const percent = Math.min(100, (sub.score / 5) * 100);
                    return (
                      <article key={sub.code} className="subcategory-card">
                        <div className="subcategory-top">
                          <span className="code">{sub.code}</span>
                          <span>{sub.category}</span>
                        </div>
                        <h3>{sub.name}</h3>
                        <div className="subcategory-score">
                          <strong>
                            {sub.score.toFixed(2).replace(".", ",")}
                          </strong>
                          <span>/ 5,00</span>
                          <b
                            className={`trend ${sub.score >= sub.target ? "met" : "gap"}`}
                          >
                            {sub.score >= sub.target
                              ? "Target tercapai"
                              : `Selisih ${(sub.target - sub.score).toFixed(2).replace(".", ",")}`}
                          </b>
                        </div>
                        <div className="score-bar">
                          <i style={{ width: `${percent}%` }} />
                        </div>
                        <footer>
                          <span>{sub.indicators} indikator</span>
                          <span>
                            Target{" "}
                            <strong>
                              {sub.target.toFixed(2).replace(".", ",")}
                            </strong>
                          </span>
                        </footer>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="panel indicators-panel">
                <div className="panel-head indicators-head">
                  <div>
                    <h2>Indikator yang Perlu Ditindaklanjuti</h2>
                    <p>
                      Prioritaskan indikator dengan selisih nilai terbesar atau
                      bukti belum lengkap.
                    </p>
                  </div>
                  <label className="search">
                    ⌕
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cari indikator..."
                    />
                  </label>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>INDIKATOR</th>
                        <th>SUB KATEGORI</th>
                        <th>NILAI SAAT INI</th>
                        <th>TARGET</th>
                        <th>BUKTI DUKUNG</th>
                        <th>PENANGGUNG JAWAB</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => (
                        <tr
                          key={item.id}
                          className={
                            selectedId === item.id ? "selected-row" : ""
                          }
                          onClick={() => setSelectedId(item.id)}
                        >
                          <td>
                            <span className="code">{item.code}</span>
                            <strong>{item.name}</strong>
                          </td>
                          <td>
                            <span>{item.subcategory}</span>
                          </td>
                          <td>
                            <b
                              className={`score-dot ${scoreColor(item.score)}`}
                            >
                              {item.score}
                            </b>
                            <span>{item.label}</span>
                          </td>
                          <td>
                            <strong>{item.target}</strong>
                            <small>{scoreLabels[item.target]}</small>
                          </td>
                          <td>
                            {item.evidence.length ? (
                              <span className="evidence-ok">
                                ✓ {item.evidence.length} file
                              </span>
                            ) : (
                              <span className="evidence-missing">
                                ! Belum ada
                              </span>
                            )}
                          </td>
                          <td>
                            <span>{item.assessor}</span>
                          </td>
                          <td>
                            <button aria-label={`Edit ${item.code}`}>›</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="editor panel">
                <div className="editor-title">
                  <div>
                    <span className="code">{selected.code}</span>
                    <div>
                      <h2>{selected.name}</h2>
                      <p>
                        {selected.category} / {selected.subcategory}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => flash("Perubahan disimpan sebagai draf")}
                  >
                    Simpan Draf
                  </button>
                </div>
                <div className="editor-grid">
                  <div>
                    <label className="field-label">Nilai Kematangan</label>
                    <div className="score-choices">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          className={selected.score === score ? "chosen" : ""}
                          onClick={() => setScore(score)}
                        >
                          <strong>{score}</strong>
                          <span>{scoreLabels[score]}</span>
                        </button>
                      ))}
                    </div>
                    <div className="target-note">
                      <span>◎</span>
                      <p>
                        <strong>
                          Target penilaian: Level {selected.target} —{" "}
                          {scoreLabels[selected.target]}
                        </strong>
                        <br />
                        Pastikan dokumen membuktikan pemenuhan seluruh kriteria
                        pada level target.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="field-label">
                      Bukti Dukung <span>({selected.evidence.length})</span>
                    </label>
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      multiple
                      accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                      onChange={(e) => void upload(e.target.files)}
                    />
                    <button
                      className="upload-box"
                      onClick={() => fileRef.current?.click()}
                    >
                      <span>⇧</span>
                      <strong>Unggah bukti pendukung</strong>
                      <small>PDF, Word, Excel, JPG · Maks. 10 MB</small>
                    </button>
                    {selected.evidence.map((file, i) => (
                      <div className="file-row" key={`${file.name}-${i}`}>
                        <span>▤</span>
                        <div>
                          <strong>{file.name}</strong>
                          <small>{file.size}</small>
                        </div>
                        <button
                          aria-label="Hapus file"
                          onClick={() =>
                            setIndicators((items) =>
                              items.map((item) =>
                                item.id === selected.id
                                  ? {
                                      ...item,
                                      evidence: item.evidence.filter(
                                        (_, index) => index !== i,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <ModulePage
              active={active}
              categories={categories}
              adminData={adminData}
              refreshAdmin={async () => {
                const response = await fetch("/api/admin", {
                  cache: "no-store",
                });
                if (response.ok)
                  setAdminData((await response.json()) as AdminData);
              }}
              flash={flash}
              role={sessionUser.role}
              assessmentAttention={assessmentAttention}
              clearAssessmentAttention={() => setAssessmentAttention(null)}
            />
          )}
        </div>
      </section>
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </main>
  );
}

type DashboardData = {
  types: Array<Record<string, unknown>>;
  periods: Array<Record<string, unknown>>;
  period?: Record<string, unknown> | null;
  categories: Array<Record<string, unknown>>;
  metrics?: Record<string, unknown> | null;
  history: Array<Record<string, unknown>>;
};

function DashboardWorkspace({
  displayName,
  onOpenAssessment,
}: {
  displayName: string;
  onOpenAssessment: () => void;
}) {
  const [data, setData] = useState<DashboardData>({
    types: [],
    periods: [],
    categories: [],
    history: [],
  });
  const [typeId, setTypeId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async (selectedPeriod = "") => {
    setLoading(true);
    const response = await fetch(
      `/api/dashboard${selectedPeriod ? `?periodId=${encodeURIComponent(selectedPeriod)}` : ""}`,
      { cache: "no-store" },
    );
    if (response.ok) setData((await response.json()) as DashboardData);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);
  const periods = data.periods.filter(
    (period) => String(period.typeId) === typeId,
  );
  const metrics = data.metrics ?? {};
  const total = Number(metrics.totalIndicators ?? 0);
  const assessed = Number(metrics.assessedIndicators ?? 0);
  const withEvidence = Number(metrics.indicatorsWithEvidence ?? 0);
  const target = Number(metrics.targetValue ?? 0);
  const maxScore = Number(data.period?.maxScore ?? 5);
  const totalWeight = data.categories.reduce(
    (sum, category) => sum + Number(category.weight ?? 0),
    0,
  );
  const finalScore =
    totalWeight > 0
      ? data.categories.reduce(
          (sum, category) =>
            sum + Number(category.score ?? 0) * Number(category.weight ?? 0),
          0,
        ) / totalWeight
      : 0;
  const selectedType = data.types.find((type) => String(type.id) === typeId);
  const historyMax = Math.max(
    maxScore,
    ...data.history.map((item) => Number(item.value ?? 0)),
    1,
  );
  return (
    <div className="dashboard-workspace">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">RINGKASAN PENILAIAN</p>
          <h1>Selamat datang, {displayName.split(" ")[0]}</h1>
          <p>
            Pilih instrumen dan tahun penilaian untuk memantau capaian, target,
            serta kelengkapan bukti dukung.
          </p>
        </div>
        <Image
          className="dashboard-agency-logo"
          src="/logo-komnas-ham.png"
          alt="Logo Komnas HAM RI"
          width={72}
          height={74}
        />
      </div>
      <div className="filterbar dashboard-filters">
        <label>
          Jenis Penilaian
          <select
            value={typeId}
            onChange={(event) => {
              setTypeId(event.target.value);
              setPeriodId("");
              void load();
            }}
          >
            <option value="">Pilih jenis penilaian</option>
            {data.types.map((type) => (
              <option key={String(type.id)} value={String(type.id)}>
                {String(type.code)} · {String(type.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tahun Penilaian
          <select
            value={periodId}
            disabled={!typeId}
            onChange={(event) => {
              setPeriodId(event.target.value);
              void load(event.target.value);
            }}
          >
            <option value="">Pilih tahun penilaian</option>
            {periods.map((period) => (
              <option key={String(period.id)} value={String(period.id)}>
                {String(period.year)} · {String(period.name)}
              </option>
            ))}
          </select>
        </label>
        {data.period && (
          <div className="final-score">
            <span>Nilai {String(data.period.assessmentCode)}</span>
            <strong>{finalScore.toFixed(2).replace(".", ",")}</strong>
            <b className="badge green">{String(data.period.status)}</b>
          </div>
        )}
      </div>
      {!periodId ? (
        <section className="panel dashboard-empty">
          <span>⌁</span>
          <h2>Pilih jenis dan tahun penilaian</h2>
          <p>
            Dashboard akan menampilkan angka aktual dan tren yang sesuai dengan
            hak akses akun Anda.
          </p>
        </section>
      ) : loading ? (
        <section className="panel dashboard-empty">
          <p>Memuat ringkasan penilaian…</p>
        </section>
      ) : (
        <>
          <section className="panel trend-panel">
            <div className="panel-head">
              <div>
                <h2>Tren Nilai {String(selectedType?.code ?? "")}</h2>
                <p>Perbandingan capaian dari periode sebelumnya</p>
              </div>
              <button className="primary" onClick={onOpenAssessment}>
                Buka Penilaian
              </button>
            </div>
            <div className="trend-chart" aria-label="Grafik tren nilai tahunan">
              {data.history.length ? (
                data.history.map((item) => {
                  const value = Number(item.value ?? 0);
                  return (
                    <div className="trend-column" key={String(item.year)}>
                      <strong>{value.toFixed(2).replace(".", ",")}</strong>
                      <div>
                        <i
                          style={{
                            height: `${Math.max(3, (value / historyMax) * 100)}%`,
                          }}
                        />
                      </div>
                      <span>{String(item.year)}</span>
                    </div>
                  );
                })
              ) : (
                <p>Belum ada riwayat nilai.</p>
              )}
            </div>
          </section>
          <div className="metrics dashboard-metrics">
            <article>
              <span className="metric-icon purple">▦</span>
              <div>
                <small>TOTAL INDIKATOR</small>
                <strong>{total}</strong>
                <p>
                  <b>{Number(metrics.totalCategories ?? 0)} kategori</b> ·{" "}
                  {Number(metrics.totalSubcategories ?? 0)} subkategori
                </p>
              </div>
            </article>
            <article>
              <span className="metric-icon green">✓</span>
              <div>
                <small>SUDAH DINILAI</small>
                <strong>
                  {assessed} <i>/ {total}</i>
                </strong>
                <p>
                  <b>{total ? Math.round((assessed / total) * 100) : 0}%</b>{" "}
                  telah dinilai
                </p>
              </div>
            </article>
            <article>
              <span className="metric-icon amber">◷</span>
              <div>
                <small>PERLU DILENGKAPI</small>
                <strong>{Math.max(0, total - withEvidence)}</strong>
                <p>
                  <b>{withEvidence} indikator</b> memiliki bukti
                </p>
              </div>
            </article>
            <article>
              <span className="metric-icon blue">↗</span>
              <div>
                <small>TARGET NILAI</small>
                <strong>{target.toFixed(2).replace(".", ",")}</strong>
                <p>
                  <b>
                    {Math.max(0, target - finalScore)
                      .toFixed(2)
                      .replace(".", ",")}
                  </b>{" "}
                  selisih dari nilai saat ini
                </p>
              </div>
            </article>
          </div>
          <section className="panel progress-panel dashboard-progress">
            <div className="panel-head">
              <div>
                <h2>Progres per Kategori</h2>
                <p>
                  {String(data.period?.assessmentCode)} · Tahun{" "}
                  {String(data.period?.year)}
                </p>
              </div>
            </div>
            <div className="category-list">
              <div className="weight-header">
                <span>Kategori & progres</span>
                <span>Bobot</span>
                <span>Nilai</span>
                <span>Bukti</span>
              </div>
              {data.categories.map((category, index) => {
                const categoryTotal = Number(category.total ?? 0);
                const completed = Number(category.completed ?? 0);
                const evidence = Number(category.withEvidence ?? 0);
                return (
                  <div
                    className="category-row weighted"
                    key={String(category.id)}
                  >
                    <span className={`cat-num c${(index % 4) + 1}`}>
                      {String(category.code)}
                    </span>
                    <div className="cat-body">
                      <div>
                        <strong>{String(category.name)}</strong>
                      </div>
                      <div className="progress-track">
                        <i
                          style={{
                            width: `${categoryTotal ? (completed / categoryTotal) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <strong>{Number(category.weight ?? 0)}%</strong>
                    <div className="cat-score">
                      <strong>
                        {Number(category.score ?? 0)
                          .toFixed(2)
                          .replace(".", ",")}
                      </strong>
                      <small>
                        {completed}/{categoryTotal} dinilai
                      </small>
                    </div>
                    <div className="contribution">
                      <strong>
                        {evidence}/{categoryTotal}
                      </strong>
                      <small>indikator berbukti</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PublicDashboard({ onLogin }: { onLogin: () => void }) {
  const [data, setData] = useState<{ assessments: Array<Record<string, unknown>>; updatedAt?: string }>({ assessments: [] });
  const [loading, setLoading] = useState(true);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  useEffect(() => {
    fetch("/api/public-dashboard", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((result) => setData(result))
      .catch(() => setData({ assessments: [] }))
      .finally(() => setLoading(false));
  }, []);
  const latest = data.assessments.map((item) => item.latest as Record<string, unknown>).filter(Boolean);
  const finalCount = data.assessments.reduce((total, item) => total + ((item.history as Array<unknown> | undefined)?.length ?? 0), 0);
  const totalIndicators = latest.reduce((sum, item) => sum + Number(item.totalIndicators ?? 0), 0);
  const selectedAssessment = data.assessments.find((item) => String(item.id) === selectedAssessmentId);
  const selectedHistory = ((selectedAssessment?.history as Array<Record<string, unknown>> | undefined) ?? []).slice().reverse();
  const selectedPeriod = selectedHistory.find((item) => String(item.id) === selectedPeriodId);
  return (
    <main className="public-dashboard">
      <header className="public-header">
        <div className="public-brand">
          <Image src="/brand/satunilai-mark.png" alt="Logo SatuNilai" width={46} height={46} />
          <span className="public-brand-divider" aria-hidden="true" />
          <Image className="public-komnas-logo" src="/logo-komnas-ham.png" alt="Logo Komnas HAM RI" width={46} height={46} />
          <div><strong>SatuNilai</strong><small>Dashboard Penilaian Publik</small></div>
        </div>
        <button className="primary" onClick={onLogin}>Login</button>
      </header>
      <section className="public-hero">
        <div>
          <span>PENILAIAN TERINTEGRASI</span>
          <h1>Mengukur Kematangan, Menguatkan Tata Kelola, Mendorong Perbaikan Berkelanjutan.</h1>
          <p>SatuNilai menyatukan hasil evaluasi transformasi digital, tata kelola pengadaan, keamanan siber, pengelolaan data, dan berbagai instrumen lainnya agar capaian instansi dapat dipantau secara terukur, transparan, dan akuntabel sebagai dasar peningkatan layanan publik yang berkelanjutan.</p>
        </div>
        <div className="public-hero-image">
          <Image src="/illustrations/satunilai-assessment-ecosystem.png" alt="Ilustrasi ekosistem penilaian terintegrasi untuk transformasi digital, tata kelola, keamanan siber, dan data" width={1536} height={1152} priority />
        </div>
      </section>
      <section className="public-metrics" aria-label="Ringkasan penilaian publik">
        <article><small>JENIS PENILAIAN PUBLIK</small><strong>{data.assessments.length}</strong><span>Dapat dilihat masyarakat</span></article>
        <article><small>PERIODE FINAL</small><strong>{finalCount}</strong><span>Hasil asesor dipublikasikan</span></article>
        <article><small>TOTAL INDIKATOR</small><strong>{totalIndicators}</strong><span>Pada periode terbaru</span></article>
      </section>
      <section className="public-assessments">
        <div className="public-section-heading"><div><span>RINGKASAN NILAI</span><h2>Penilaian yang dipublikasikan</h2></div><small>Data diperbarui otomatis dari periode penilaian.</small></div>
        {loading && <div className="public-empty">Memuat ringkasan penilaian…</div>}
        {!loading && data.assessments.length === 0 && <div className="public-empty"><strong>Belum ada hasil penilaian publik yang final.</strong><p>Jenis penilaian tampil setelah ditetapkan publik dan periodenya telah difinalisasi administrator.</p></div>}
        <div className="public-card-grid">
          {data.assessments.map((assessment) => {
            const period = assessment.latest as Record<string, unknown> | undefined;
            const score = period?.score == null ? null : Number(period.score);
            const max = Number(period?.maxScore ?? 0);
            const percentage = max > 0 && score != null ? Math.min(100, Math.max(0, score / max * 100)) : 0;
            const history = (assessment.history as Array<Record<string, unknown>> | undefined) ?? [];
            const active = String(assessment.id) === selectedAssessmentId;
            return <button type="button" className={`public-assessment-card ${active ? "selected" : ""}`} key={String(assessment.id)} onClick={() => { setSelectedAssessmentId(active ? "" : String(assessment.id)); setSelectedPeriodId(""); }} aria-expanded={active}>
              <div className="public-card-top"><span>{String(assessment.code)}</span><em className="final">Final</em></div>
              <h3>{String(assessment.name)}</h3><p>{String(assessment.description || "Ringkasan hasil penilaian periode terbaru.")}</p>
              <div className="public-score"><strong>{score == null ? "—" : score.toFixed(2).replace(".", ",")}</strong><span>dari {max || "—"}<small>{String(period?.scoreKind ?? "belum tersedia")}</small></span></div>
              <div className="public-progress"><i style={{ width: `${percentage}%` }} /></div>
              <div className="public-card-meta"><span>Periode terbaru <b>{String(period?.year ?? "—")}</b></span><span><b>{history.length}</b> tahun final</span></div>
              <span className="public-card-cta">{active ? "Tutup statistik" : "Lihat statistik tahunan"} <b>→</b></span>
            </button>;
          })}
        </div>
        {selectedAssessment && <PublicAssessmentDetail assessment={selectedAssessment} history={selectedHistory} selectedPeriodId={selectedPeriodId} onSelectPeriod={setSelectedPeriodId} selectedPeriod={selectedPeriod} />}
      </section>
      <footer className="public-footer"><span>© 2026 SatuNilai · Komisi Nasional Hak Asasi Manusia Republik Indonesia</span><a href="https://www.komnasham.go.id/" target="_blank" rel="noreferrer">komnasham.go.id</a></footer>
    </main>
  );
}

function PublicAssessmentDetail({ assessment, history, selectedPeriodId, onSelectPeriod, selectedPeriod }: { assessment: Record<string, unknown>; history: Array<Record<string, unknown>>; selectedPeriodId: string; onSelectPeriod: (id: string) => void; selectedPeriod?: Record<string, unknown> }) {
  return <section className="public-drilldown" aria-live="polite">
    <div className="drilldown-heading"><div><span>PERKEMBANGAN NILAI</span><h2>{String(assessment.code)} · Statistik Tahunan</h2></div><small>Klik tahun untuk melihat nilai pemenuhan setiap kategori.</small></div>
    <div className="public-line-chart">
      <div className="chart-grid" aria-hidden="true"><i /><i /><i /><i /></div>
      {history.map((item, index) => {
        const max = Math.max(1, Number(item.maxScore ?? 1));
        const value = Number(item.score ?? 0);
        const x = history.length === 1 ? 50 : index / (history.length - 1) * 100;
        const y = 88 - Math.min(1, Math.max(0, value / max)) * 72;
        const next = history[index + 1];
        let segment: { width: string; transform: string } | null = null;
        if (next) {
          const nextX = (index + 1) / (history.length - 1) * 100;
          const nextY = 88 - Math.min(1, Math.max(0, Number(next.score ?? 0) / Math.max(1, Number(next.maxScore ?? 1)))) * 72;
          const dx = nextX - x; const dy = nextY - y;
          segment = { width: `${Math.sqrt(dx * dx + dy * dy)}%`, transform: `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)` };
        }
        return <div className="chart-point-wrap" key={String(item.id)} style={{ left: `${x}%`, top: `${y}%` }}>
          {segment && <i className="chart-segment" style={segment} />}
          <button type="button" className={String(item.id) === selectedPeriodId ? "active" : ""} onClick={() => onSelectPeriod(String(item.id))} aria-label={`Tahun ${String(item.year)}, nilai ${value.toFixed(2)}`}><span>{value.toFixed(2).replace(".", ",")}</span><b /></button>
          <strong>{String(item.year)}</strong>
        </div>;
      })}
    </div>
    {!selectedPeriod && <div className="year-hint">Pilih salah satu tahun pada grafik untuk membuka rincian kategori.</div>}
    {selectedPeriod && <div className="public-category-reveal">
      <header><div><span>PEMENUHAN KATEGORI</span><h3>{String(assessment.code)} Tahun {String(selectedPeriod.year)}</h3></div><strong>{Number(selectedPeriod.score ?? 0).toFixed(2).replace(".", ",")}<small>dari {String(selectedPeriod.maxScore)}</small></strong></header>
      <div className="public-category-list">{((selectedPeriod.categories as Array<Record<string, unknown>> | undefined) ?? []).map((category, index) => { const value = Number(category.final ?? 0); const max = Math.max(1, Number(selectedPeriod.maxScore ?? 1)); return <article key={String(category.id)} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}><span>{String(category.code)}</span><div><strong>{String(category.name)}</strong><div><i style={{ width: `${Math.min(100, value / max * 100)}%` }} /></div><small>Bobot {Number(category.weight ?? 0)}%</small></div><b>{value.toFixed(2).replace(".", ",")}</b></article>; })}</div>
    </div>}
  </section>;
}

function AuthScreen({
  view,
  setView,
  onBack,
}: {
  view: "login" | "forgot" | "reset";
  setView: (view: "login" | "forgot" | "reset") => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [developmentAccounts, setDevelopmentAccounts] = useState<{
    key: string; email: string; role: string; label: string; displayName: string;
  }[]>([]);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let active = true;
    void fetch("/api/auth/development", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data?.accounts) setDevelopmentAccounts(data.accounts); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const enterDevelopmentAccount = async (key: string) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/development", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: key }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Akun development belum tersedia");
      window.location.assign("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Masuk cepat belum dapat diproses");
      setBusy(false);
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (view === "reset" && password !== confirmPassword) {
      setMessage("Konfirmasi password belum sama");
      return;
    }
    setBusy(true);
    setMessage("");
    const endpoint =
      view === "login"
        ? "/api/auth/login"
        : view === "forgot"
          ? "/api/auth/forgot-password"
          : "/api/auth/reset-password";
    const payload =
      view === "login"
        ? { email, password }
        : view === "forgot"
          ? { email }
          : {
              token: new URLSearchParams(window.location.search).get("reset"),
              password,
            };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Permintaan belum dapat diproses");
      return;
    }
    if (view === "login") {
      window.location.href = "/";
      return;
    }
    if (view === "reset") {
      window.history.replaceState({}, "", "/");
      setView("login");
      setPassword("");
      setConfirmPassword("");
      setMessage("Password berhasil diubah. Silakan masuk.");
      return;
    }
    setMessage(
      data.message ?? "Jika email terdaftar, tautan reset akan dikirim.",
    );
  };
  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-workflow-art" aria-hidden="true" />
        <div className="auth-copy">
          <span className="auth-kicker">INSTRUMEN BERVERSI</span>
          <h1>Satu Dashboard untuk Penilaian yang Tertib dan Terkendali</h1>
          <p>
            Satukan instrumen lintas tahun, pantau kesenjangan terhadap target,
            dan pastikan setiap nilai didukung bukti yang mudah ditelusuri
            hingga proses finalisasi.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={(event) => void submit(event)}>
          {view === "login" && (
            <button type="button" className="auth-public-back" onClick={onBack}>← Dashboard publik</button>
          )}
          <div
            className="auth-logo-pair"
            aria-label="SatuNilai dan Komnas HAM RI"
          >
            <span className="auth-icon satunilai-logo">
              <Image
                src="/brand/satunilai-mark.png"
                alt="Logo SatuNilai"
                width={58}
                height={58}
              />
            </span>
            <span className="auth-logo-divider" aria-hidden="true" />
            <span className="auth-icon organization-logo">
              <Image
                src="/logo-komnas-ham.png"
                alt="Logo Komnas HAM RI"
                width={58}
                height={58}
              />
            </span>
          </div>
          <h2>
            {view === "login"
              ? "Masuk ke SatuNilai"
              : view === "forgot"
                ? "Lupa password"
                : "Buat password baru"}
          </h2>
          <p>
            {view === "login"
              ? "Gunakan akun yang dibuat oleh administrator."
              : view === "forgot"
                ? "Kami akan mengirim tautan reset jika email telah terdaftar."
                : "Gunakan minimal 10 karakter untuk melindungi akun Anda."}
          </p>
          {view === "login" && developmentAccounts.length > 0 && (
            <section className="dev-accounts" aria-label="Masuk cepat Development">
              <header>
                <strong>Masuk cepat — Development</strong>
                <small>Pilih akun untuk langsung masuk</small>
              </header>
              {developmentAccounts.map((account) => (
                <button type="button" key={account.key} disabled={busy}
                  onClick={() => void enterDevelopmentAccount(account.key)}
                  aria-label={`Masuk sebagai ${account.label}`}>
                  <span aria-hidden="true">{account.label.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{account.label}</strong>
                    {account.displayName !== account.email && <small>{account.displayName}</small>}
                    <code>{account.email}</code>
                  </div>
                </button>
              ))}
            </section>
          )}
          {view !== "reset" && (
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@instansi.go.id"
              />
            </label>
          )}
          {view !== "forgot" && (
            <label>
              Password
              <input
                type="password"
                autoComplete={
                  view === "login" ? "current-password" : "new-password"
                }
                required
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 10 karakter"
              />
            </label>
          )}
          {view === "reset" && (
            <label>
              Ulangi password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          )}
          {message && (
            <div className="auth-message" role="status">
              {message}
            </div>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Memproses…"
              : view === "login"
                ? "Masuk"
                : view === "forgot"
                  ? "Kirim tautan reset"
                  : "Simpan password baru"}
          </button>
          {view === "login" ? (
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setMessage("");
                setView("forgot");
              }}
            >
              Lupa password?
            </button>
          ) : (
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                window.history.replaceState({}, "", "/");
                setMessage("");
                setView("login");
              }}
            >
              Kembali ke halaman masuk
            </button>
          )}
          {view === "login" && <p className="auth-message">Gunakan akun yang diberikan administrator. Akun awal Docker tersedia pada konfigurasi .env server.</p>}
        </form>
      </section>
    </main>
  );
}

function ModulePage({
  active,
  categories,
  adminData,
  refreshAdmin,
  flash,
  role,
  assessmentAttention,
  clearAssessmentAttention,
}: {
  active: string;
  categories: Category[];
  adminData: AdminData;
  refreshAdmin: () => Promise<void>;
  flash: (message: string) => void;
  role: string;
  assessmentAttention: Record<string, unknown> | null;
  clearAssessmentAttention: () => void;
}) {
  const canManage = role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assessmentTitle, setAssessmentTitle] = useState("Penilaian");
  const assessmentWorkspaceRef = useRef<{ openFinalize: () => void } | null>(
    null,
  );
  const structureManagerRef = useRef<{ openCategory: () => void } | null>(null);
  const evidenceRepositoryRef = useRef<{ openCreate: () => void } | null>(null);
  const configs: Record<
    string,
    { eyebrow: string; title: string; desc: string; action: string }
  > = {
    Penilaian: {
      eyebrow: "RUANG KERJA",
      title: "Penilaian SPBE 2025",
      desc: "Isi, kirim, dan pantau status penilaian setiap indikator.",
      action: "Finalisasi & Nilai Asesor",
    },
    "Bukti Dukung": {
      eyebrow: "DOKUMEN PRIVAT",
      title: "Bukti Dukung",
      desc: "Kelola dokumen, tautan, versi, keterkaitan indikator, dan catatan pemeriksa.",
      action: "Tambah Bukti",
    },
    Laporan: {
      eyebrow: "PELAPORAN",
      title: "Laporan Penilaian",
      desc: "Rekap nilai, analisis kesenjangan, serta matriks indikator dan bukti.",
      action: "Buat Laporan",
    },
    "Tahun Penilaian": {
      eyebrow: "PENGELOLAAN",
      title: "Tahun & Periode Penilaian",
      desc: "Atur jadwal, tenggat waktu, status, dan penguncian periode penilaian.",
      action: "Tambah Periode",
    },
    "Jenis Penilaian": {
      eyebrow: "PENGELOLAAN",
      title: "Jenis Penilaian",
      desc: "Kelola SPBE, Indeks SDI, EPSS, ITKP, dan instrumen lainnya.",
      action: "Tambah Jenis",
    },
    "Kategori Indikator": {
      eyebrow: "INSTRUMEN BERVERSI",
      title: "Kategori Indikator",
      desc: "Kelola kategori, subkategori, indikator, bobot, dan skala nilai.",
      action: "Tambah Kategori",
    },
    "Pengguna & Akses": {
      eyebrow: "ADMINISTRASI",
      title: "Pengguna & Hak Akses",
      desc: "Kelola administrator, staf, kepala unit, dan akses ke berbagai jenis penilaian.",
      action: "Tambah Pengguna",
    },
  };
  const config = configs[active] ?? configs.Penilaian;
  const resource =
    active === "Pengguna & Akses"
      ? "user"
      : active === "Tahun Penilaian"
        ? "period"
        : active === "Jenis Penilaian"
          ? "type"
          : active === "Kategori Indikator"
            ? "category"
            : active === "Bukti Dukung"
              ? "evidence"
              : "";
  useLayoutEffect(() => {
    if (!showForm || resource !== "period") return;
    const dateInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        ".admin-modal input[type=date]",
      ),
    );
    const syncDates = () =>
      setForm((current) => ({
        ...current,
        startsAt: dateInputs[0]?.value ?? "",
        dueAt: dateInputs[1]?.value ?? "",
      }));
    dateInputs.forEach((input) => {
      input.addEventListener("input", syncDates);
      input.addEventListener("change", syncDates);
    });
    return () =>
      dateInputs.forEach((input) => {
        input.removeEventListener("input", syncDates);
        input.removeEventListener("change", syncDates);
      });
  }, [showForm, resource]);
  const openCreate = () => {
    setEditingId(null);
    setForm(
      resource === "period"
        ? { typeId: "", maxScore: "5" }
        : {},
    );
    setShowForm(true);
  };
  const openEdit = (item: Record<string, unknown>) => {
    setEditingId(String(item.id));
    setForm(
      Object.fromEntries(
        Object.entries(item).map(([key, value]) => [
          key === "displayName" ? "name" : key,
          value == null
            ? ""
            : key === "startsAt" || key === "dueAt"
              ? String(value).slice(0, 10)
              : String(value),
        ]),
      ),
    );
    setShowForm(true);
  };
  const submitAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resource || resource === "evidence") return;
    setSaving(true);
    const payload: Record<string, unknown> = { resource, ...form };
    if (resource === "user")
      payload.assessmentTypeIds = String(form.assessmentTypeIds ?? "")
        .split(",")
        .filter(Boolean);
    if (resource === "period") {
      const modal = document.querySelector<HTMLElement>(".admin-modal");
      const dateInputs = Array.from(
        modal?.querySelectorAll<HTMLInputElement>("input[type=date]") ?? [],
      );
      payload.typeId =
        modal?.querySelector<HTMLSelectElement>("select")?.value ||
        form.typeId ||
        "";
      payload.year =
        modal?.querySelector<HTMLInputElement>("input[type=number]")?.value ||
        form.year ||
        "";
      payload.maxScore = form.maxScore ?? "";
      payload.name =
        modal?.querySelector<HTMLInputElement>(
          "input:not([type=number]):not([type=date])",
        )?.value ||
        form.name ||
        "";
      payload.startsAt = dateInputs[0]?.value ?? form.startsAt ?? "";
      payload.dueAt = dateInputs[1]?.value ?? form.dueAt ?? "";
    }
    if (editingId) payload.id = editingId;
    const response = await fetch("/api/admin", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      flash(data.error ?? "Data belum dapat disimpan");
      return;
    }
    setShowForm(false);
    setForm({});
    setEditingId(null);
    await refreshAdmin();
    flash(editingId ? "Data berhasil diperbarui" : "Data berhasil disimpan");
  };
  const removeAdmin = async (item: Record<string, unknown>) => {
    if (
      !window.confirm(
        `Hapus ${String(item.name ?? item.displayName ?? "data ini")}?`,
      )
    )
      return;
    const response = await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, id: item.id }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      flash(data.error ?? "Data belum dapat dihapus");
      return;
    }
    await refreshAdmin();
    flash("Data berhasil dihapus");
  };
  return (
    <div className={`module-page ${canManage ? "" : "view-only"}`}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{config.eyebrow}</p>
          <h1>{active === "Penilaian" ? assessmentTitle : config.title}</h1>
          <p>{config.desc}</p>
        </div>
        {(canManage || (active === "Bukti Dukung" && role === "staff")) &&
          active !== "Laporan" && (
            <button
              className="primary"
              onClick={() =>
                active === "Penilaian"
                  ? assessmentWorkspaceRef.current?.openFinalize()
                  : active === "Bukti Dukung"
                    ? evidenceRepositoryRef.current?.openCreate()
                    : active === "Kategori Indikator"
                      ? structureManagerRef.current?.openCategory()
                      : resource && resource !== "evidence"
                        ? openCreate()
                        : flash(
                            `${config.action} tersedia dari formulir indikator`,
                          )
              }
            >
              ＋ {config.action}
            </button>
          )}
      </div>
      {active === "Penilaian" && (
        <AssessmentWorkspace
          ref={assessmentWorkspaceRef}
          flash={flash}
          onContextChange={setAssessmentTitle}
          attention={assessmentAttention}
          onAttentionHandled={clearAssessmentAttention}
        />
      )}
      {active === "Bukti Dukung" && (
        <EvidenceRepository ref={evidenceRepositoryRef} flash={flash} />
      )}
      {active === "Laporan" && <ReportsWorkspace />}
      {active === "__laporan_lama" && (
        <div className="report-grid">
          <section className="panel report-preview">
            <div className="report-cover">
              <span>SATUNILAI</span>
              <h2>Laporan Penilaian SPBE</h2>
              <p>Tahun 2025 · Dinas Komunikasi dan Informatika</p>
              <strong>
                {categories
                  .reduce((sum, c) => sum + c.score * c.weight, 0)
                  .toFixed(2)
                  .replace(".", ",")}
              </strong>
              <small>NILAI AKHIR</small>
            </div>
          </section>
          <section className="panel report-options">
            <h2>Isi laporan</h2>
            {[
              "Rekap nilai akhir",
              "Analisis kesenjangan target",
              "Perbandingan nilai asesor",
              "Matriks indikator dan bukti",
              "Catatan pemeriksa",
            ].map((item) => (
              <label key={item}>
                <input type="checkbox" defaultChecked /> {item}
              </label>
            ))}
            <a className="primary download-link" href="/api/reports/pdf">
              Unduh PDF
            </a>
            <a className="outline download-link" href="/api/reports/excel">
              Unduh Excel
            </a>
          </section>
        </div>
      )}
      {active === "Tahun Penilaian" && (
        <section className="panel module-table">
          <div className="panel-head">
            <div>
              <h2>Daftar Periode</h2>
              <p>Periode lama tetap tersimpan dan tidak berubah.</p>
            </div>
          </div>
          <div className="period-cards">
            {adminData.periods.map((period) => (
              <article key={String(period.id)}>
                <div className="year-box">{String(period.year)}</div>
                <div>
                  <strong>{String(period.name)}</strong>
                  <small>
                    {String(period.startsAt).slice(0, 10)} –{" "}
                    {String(period.dueAt).slice(0, 10)} · Nilai maksimal{" "}
                    {String(period.maxScore)}
                  </small>
                </div>
                <span className="badge green">{String(period.status)}</span>
                <b>{String(period.typeCode)}</b>
                <div className="crud-actions">
                  <button onClick={() => openEdit(period)}>Edit</button>
                  <button
                    className="danger"
                    onClick={() => void removeAdmin(period)}
                  >
                    Hapus
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {active === "Jenis Penilaian" && (
        <div className="type-grid">
          {adminData.types.map((type, index) => (
            <article className="panel type-card" key={String(type.id)}>
              <span
                className={`metric-icon ${["purple", "blue", "green", "amber"][index % 4]}`}
              >
                {String(type.code).slice(0, 1)}
              </span>
              <h2>{String(type.code)}</h2>
              <p>{String(type.name)}</p>
              <div>
                <span>
                  {String(type.active) === "1" ? "Aktif" : "Nonaktif"}
                </span>
                <span className={Number(type.isPublic) ? "visibility-public" : "visibility-private"}>
                  {Number(type.isPublic) ? "Publik" : "Privat"}
                </span>
                <span>{String(type.versions)} versi</span>
              </div>
              <div className="crud-actions">
                <button onClick={() => openEdit(type)}>Edit</button>
                <button
                  className="danger"
                  onClick={() => void removeAdmin(type)}
                >
                  Hapus
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {active === "Kategori Indikator" && (
        <StructureManager
          ref={structureManagerRef}
          adminData={adminData}
          refreshAdmin={refreshAdmin}
          flash={flash}
        />
      )}
      {active === "Pengguna & Akses" && (
        <>
          <div className="module-stats">
            <article>
              <small>TOTAL PENGGUNA</small>
              <strong>{adminData.users.length}</strong>
              <span>Terdaftar</span>
            </article>
            <article>
              <small>ADMIN</small>
              <strong>
                {adminData.users.filter((u) => u.role === "admin").length}
              </strong>
              <span>Akses penuh</span>
            </article>
            <article>
              <small>STAF</small>
              <strong>
                {adminData.users.filter((u) => u.role === "staff").length}
              </strong>
              <span>Pengelola indikator</span>
            </article>
            <article>
              <small>KEPALA UNIT</small>
              <strong>
                {adminData.users.filter((u) => u.role === "head").length}
              </strong>
              <span>Pemantau</span>
            </article>
          </div>
          <section className="panel module-table">
            <div className="panel-head">
              <div>
                <h2>Daftar Pengguna</h2>
                <p>Hak akses selalu diverifikasi oleh server.</p>
              </div>
            </div>
            <div className="user-list">
              {adminData.users.map((u) => {
                const accessIds = String(u.assessmentTypeIds ?? "").split(",");
                const accessNames =
                  String(u.role) === "admin"
                    ? adminData.types.map((type) => String(type.code))
                    : adminData.types
                        .filter((type) => accessIds.includes(String(type.id)))
                        .map((type) => String(type.code));
                return (
                  <article key={String(u.id)}>
                    <div className="avatar">
                      {String(u.displayName)
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <strong>{String(u.displayName)}</strong>
                      <small>{String(u.email)}</small>
                    </div>
                    <span>
                      {accessNames.length
                        ? accessNames.join(", ")
                        : "Belum ada akses"}
                    </span>
                    <b>{String(u.role)}</b>
                    <div className="crud-actions">
                      <button onClick={() => openEdit(u)}>Edit</button>
                      <button
                        className="danger"
                        onClick={() => void removeAdmin(u)}
                      >
                        Hapus
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
      {showForm && (
        <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}>
          <form
            className="admin-modal"
            onSubmit={(event) => void submitAdmin(event)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div>
              <h2>{config.action}</h2>
              <button type="button" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>
            {resource === "user" && (
              <>
                <label>
                  Nama
                  <input
                    required
                    value={form.name ?? ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </label>
                <label className="user-role-field">
                  Peran
                  <select
                    value={form.role ?? "staff"}
                    onChange={(e) => {
                      const role = e.target.value;
                      setForm({
                        ...form,
                        role,
                        assessmentTypeIds:
                          role === "admin"
                            ? adminData.types
                                .map((type) => String(type.id))
                                .join(",")
                            : (form.assessmentTypeIds ?? ""),
                      });
                    }}
                  >
                    <option value="staff">Staf</option>
                    <option value="head">Kepala unit</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="user-password-field">
                  {editingId ? "Password baru (opsional)" : "Password"}
                  <input
                    type="password"
                    autoComplete="new-password"
                    required={!editingId}
                    minLength={10}
                    value={form.password ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder={
                      editingId
                        ? "Kosongkan jika tidak diubah"
                        : "Minimal 10 karakter"
                    }
                  />
                </label>
                <fieldset
                  className={`access-checks ${form.role === "admin" ? "locked" : ""}`}
                >
                  <legend>Akses Jenis Penilaian</legend>
                  {form.role === "admin" && (
                    <p>
                      Administrator otomatis memiliki akses ke seluruh jenis
                      penilaian.
                    </p>
                  )}
                  {adminData.types.map((type) => {
                    const ids = String(form.assessmentTypeIds ?? "")
                      .split(",")
                      .filter(Boolean);
                    const typeId = String(type.id);
                    const isAdmin = form.role === "admin";
                    return (
                      <label key={typeId}>
                        <input
                          type="checkbox"
                          disabled={isAdmin}
                          checked={isAdmin || ids.includes(typeId)}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              assessmentTypeIds: event.target.checked
                                ? [...ids, typeId].join(",")
                                : ids.filter((id) => id !== typeId).join(","),
                            })
                          }
                        />
                        <span>
                          <strong>{String(type.code)}</strong>
                          <small>{String(type.name)}</small>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              </>
            )}
            {resource === "type" && (
              <>
                <label>
                  Kode
                  <input
                    required
                    value={form.code ?? ""}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </label>
                <label>
                  Nama
                  <input
                    required
                    value={form.name ?? ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  Deskripsi
                  <textarea
                    value={form.description ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </label>
                <label>
                  Visibilitas dashboard
                  <select value={form.isPublic ?? "0"} onChange={(e) => setForm({ ...form, isPublic: e.target.value })}>
                    <option value="0">Privat · hanya setelah login</option>
                    <option value="1">Publik · tampil di dashboard depan</option>
                  </select>
                  <small className="field-help">Dashboard publik hanya menampilkan nilai agregat dan progres, bukan dokumen bukti atau data pengguna.</small>
                </label>
              </>
            )}
            {resource === "period" && (
              <>
                <label>
                  Jenis
                  <select
                    required
                    value={form.typeId ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, typeId: e.target.value })
                    }
                  >
                    <option value="">Pilih jenis penilaian</option>
                    {adminData.types.map((t) => (
                      <option key={String(t.id)} value={String(t.id)}>
                        {String(t.code)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tahun
                  <input
                    type="number"
                    required
                    value={form.year ?? "2026"}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                  />
                </label>
                <label>
                  Nilai maksimal
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={form.maxScore ?? "5"}
                    onChange={(e) =>
                      setForm({ ...form, maxScore: e.target.value })
                    }
                  />
                </label>
                <label>
                  Nama periode
                  <input
                    required
                    value={form.name ?? ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  Mulai
                  <input
                    type="date"
                    required
                    value={form.startsAt ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, startsAt: e.target.value })
                    }
                  />
                </label>
                <label>
                  Tenggat
                  <input
                    type="date"
                    required
                    value={form.dueAt ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, dueAt: e.target.value })
                    }
                  />
                </label>
              </>
            )}
            {resource === "category" && (
              <>
                <label>
                  Kode
                  <input
                    required
                    value={form.code ?? ""}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </label>
                <label>
                  Nama kategori
                  <input
                    required
                    value={form.name ?? ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  Bobot (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.weight ?? "0"}
                    onChange={(e) =>
                      setForm({ ...form, weight: e.target.value })
                    }
                  />
                </label>
              </>
            )}
            <button className="primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

type WorkspaceData = {
  types: Array<Record<string, unknown>>;
  periods: Array<Record<string, unknown>>;
  selectedPeriod?: Record<string, unknown>;
  subcategories: Array<Record<string, unknown>>;
  indicators: Array<Record<string, unknown>>;
  user?: { role?: string };
};

const EvidenceRepository = forwardRef<
  { openCreate: () => void },
  { flash: (message: string) => void }
>(function EvidenceRepository({ flash }, ref) {
  const [data, setData] = useState<{
    types: Array<Record<string, unknown>>;
    periods: Array<Record<string, unknown>>;
    evidence: Array<Record<string, unknown>>;
    user?: Record<string, unknown>;
  }>({ types: [], periods: [], evidence: [] });
  const [typeId, setTypeId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [deleting, setDeleting] = useState(false);
  const load = async (nextType = typeId, nextPeriod = periodId) => {
    const params = new URLSearchParams();
    if (nextType) params.set("typeId", nextType);
    if (nextPeriod) params.set("periodId", nextPeriod);
    const response = await fetch(`/api/evidence-repository?${params}`, {
      cache: "no-store",
    });
    if (response.ok) setData(await response.json());
  };
  useEffect(() => {
    void load("", "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useImperativeHandle(
    ref,
    () => ({ openCreate: () => setShowCreate(true) }),
    [],
  );
  const periods = data.periods.filter(
    (period) => String(period.typeId) === typeId,
  );
  const categoryOptions = [...new Set(data.evidence.flatMap((row) => String(row.categoryNames ?? "").split(",").filter(Boolean)))].sort();
  const rows = data.evidence.filter((row) => {
    const searchable = `${String(row.title)} ${String(row.filename ?? "")} ${String(row.typeCodes ?? "")} ${String(row.categoryCodes ?? "")} ${String(row.categoryNames ?? "")} ${String(row.indicatorCodes ?? "")} ${String(row.indicatorNames ?? "")}`.toLowerCase();
    return searchable.includes(query.toLowerCase()) && (!categoryFilter || String(row.categoryNames ?? "").split(",").includes(categoryFilter));
  });
  const evidenceKind = (row: Record<string, unknown>) => {
    if (String(row.sourceType) === "link") return { label: "LINK", icon: "↗", tone: "link" };
    const filename = String(row.filename ?? "").toLowerCase();
    if (filename.endsWith(".pdf")) return { label: "PDF", icon: "P", tone: "pdf" };
    if (filename.endsWith(".doc") || filename.endsWith(".docx")) return { label: "DOC", icon: "W", tone: "doc" };
    if (filename.endsWith(".xls") || filename.endsWith(".xlsx")) return { label: "XLS", icon: "X", tone: "sheet" };
    if (/\.(png|jpe?g|webp)$/.test(filename)) return { label: "IMG", icon: "▧", tone: "image" };
    return { label: "FILE", icon: "▤", tone: "file" };
  };
  const friendlyEvidenceName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData();
    form.set("title", title);
    if (file) form.set("file", file);
    else form.set("url", url);
    const response = await fetch("/api/evidence-repository", {
      method: "POST",
      body: form,
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setSaving(false);
    if (!response.ok) {
      flash(result.error ?? "Bukti belum dapat ditambahkan");
      return;
    }
    setShowCreate(false);
    setTitle("");
    setUrl("");
    setFile(null);
    await load();
    flash("Bukti berhasil ditambahkan ke repositori");
  };
  const copyLink = async (row: Record<string, unknown>) => {
    const link = row.externalUrl
      ? String(row.externalUrl)
      : `${window.location.origin}/api/evidence/${encodeURIComponent(String(row.id))}/download?view=1`;
    await navigator.clipboard.writeText(link);
    flash("Tautan bukti disalin");
  };
  const toggleFavorite = async (row: Record<string, unknown>) => {
    const favorite = !Number(row.favorite);
    const response = await fetch("/api/evidence-repository", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, favorite }) });
    if (!response.ok) { flash("Favorit belum dapat diperbarui"); return; }
    await load();
    flash(favorite ? "Bukti dipin ke bagian atas" : "Bukti dilepas dari favorit");
  };
  const remove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const response = await fetch("/api/evidence-repository", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingDelete.id }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setDeleting(false);
    if (!response.ok) {
      flash(result.error ?? "Bukti tidak dapat dihapus");
      setPendingDelete(null);
      return;
    }
    setPendingDelete(null);
    await load();
    flash("Bukti berhasil dihapus");
  };
  return (
    <div className="evidence-repository">
      <section className="panel assessment-context evidence-filters">
        <div>
          <strong>Filter Bukti</strong>
          <small>Dokumen dari repositori dan pengisian indikator</small>
        </div>
        <label>
          Jenis Penilaian
          <select
            value={typeId}
            onChange={(event) => {
              const next = event.target.value;
              setTypeId(next);
              setPeriodId("");
              setCategoryFilter("");
              void load(next, "");
            }}
          >
            <option value="">Semua jenis</option>
            {data.types.map((type) => (
              <option key={String(type.id)} value={String(type.id)}>
                {String(type.code)} · {String(type.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tahun Penilaian
          <select
            disabled={!typeId}
            value={periodId}
            onChange={(event) => {
              setPeriodId(event.target.value);
              setCategoryFilter("");
              void load(typeId, event.target.value);
            }}
          >
            <option value="">Semua tahun</option>
            {periods.map((period) => (
              <option key={String(period.id)} value={String(period.id)}>
                {String(period.year)} · {String(period.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kategori
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">Semua kategori</option>
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="repository-search">
          Cari
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nama bukti, kategori, kode atau nama indikator…"
          />
        </label>
      </section>
      <section className="panel repository-panel">
        <div className="panel-head">
          <div>
            <h2>Repositori Bukti Dukung</h2>
            <p>
              {rows.length} dokumen sesuai filter. Dokumen tertaut indikator
              tidak dapat dihapus.
            </p>
          </div>
        </div>
        <div className="repository-grid">
          {rows.length === 0 && (
            <p className="repository-empty">Belum ada bukti pada filter ini.</p>
          )}
          {rows.map((row) => {
            const viewUrl = row.externalUrl
              ? String(row.externalUrl)
              : `/api/evidence/${encodeURIComponent(String(row.id))}/download?view=1`;
            const kind = evidenceKind(row);
            return (
              <article key={String(row.id)} className={Number(row.approved) ? "approved-evidence" : ""}>
                <span className={`doc-icon kind-${kind.tone} ${Number(row.favorite) ? "favorite" : ""}`}><b>{kind.icon}</b><small>{kind.label}</small></span>
                <div>
                  <strong>{String(row.title)}</strong>
                  {Number(row.favorite) ? <em className="favorite-label">★ Favorit</em> : null}
                  {Number(row.approved) ? <em className="approved-label">✓ Disetujui admin</em> : null}
                  <small>
                    {String(row.filename ?? row.externalUrl ?? "Dokumen")} ·{" "}
                    {Number(row.linkCount ?? 0)} indikator
                  </small>
                  <p>
                    {row.indicatorCodes
                      ? `${String(row.categoryNames ?? "Tanpa kategori")} · Indikator ${String(row.indicatorCodes)}`
                      : "Belum ditautkan ke indikator"}
                  </p>
                </div>
                <div className="repository-actions">
                  <button type="button" className={`favorite-button ${Number(row.favorite) ? "active" : ""}`} onClick={() => void toggleFavorite(row)} aria-label={Number(row.favorite) ? "Lepas dari favorit" : "Tambahkan ke favorit"} title={Number(row.favorite) ? "Lepas dari favorit" : "Pin ke bagian atas"}>
                    {Number(row.favorite) ? "★" : "☆"}
                  </button>
                  <a href={viewUrl} target="_blank" rel="noreferrer">
                    Lihat
                  </a>
                  {String(data.user?.role) !== "head" && (
                    <button type="button" onClick={() => void copyLink(row)}>
                      Salin link
                    </button>
                  )}
                  {String(data.user?.role) === "admin" && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => setPendingDelete(row)}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {showCreate && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setShowCreate(false)}
        >
          <form
            className="admin-modal repository-modal"
            onSubmit={(event) => void submit(event)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div>
              <h2>Tambah Bukti</h2>
              <button type="button" onClick={() => setShowCreate(false)}>
                ×
              </button>
            </div>
            <p className="repository-hint">
              Bukti disimpan di repositori. Anda dapat menautkannya ke indikator
              yang sesuai.
            </p>
            <label>
              Nama bukti yang mudah dicari
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Contoh: Rekap RUP Penyedia 2026"
              />
              <small className="field-help">Jika dikosongkan, nama akan dibuat otomatis dari nama berkas.</small>
            </label>
            <label>
              Tautan HTTPS
              <input
                type="url"
                disabled={Boolean(file)}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://…"
              />
            </label>
            <label>
              Atau unggah berkas
              <input
                type="file"
                disabled={Boolean(url)}
                accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                onChange={(event) => { const selectedFile = event.target.files?.[0] ?? null; setFile(selectedFile); if (selectedFile && !title.trim()) setTitle(friendlyEvidenceName(selectedFile.name)); }}
              />
            </label>
            <button
              className="primary"
              disabled={saving || (!url && !file)}
            >
              {saving ? "Menyimpan…" : "Simpan Bukti"}
            </button>
          </form>
        </div>
      )}
      {pendingDelete && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !deleting && setPendingDelete(null)}
        >
          <section
            className="evidence-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-evidence-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="delete-dialog-icon" aria-hidden="true">
              ⌫
            </span>
            <div className="delete-dialog-copy">
              <p>HAPUS BUKTI DUKUNG</p>
              <h2 id="delete-evidence-title">Hapus dokumen ini?</h2>
              <span>
                Sistem akan memeriksa terlebih dahulu apakah dokumen masih
                digunakan pada indikator.
              </span>
            </div>
            <div className="delete-evidence-summary">
              <strong>{String(pendingDelete.title)}</strong>
              <small>
                {String(
                  pendingDelete.filename ??
                    pendingDelete.externalUrl ??
                    "Dokumen bukti dukung",
                )}
              </small>
              <em>{Number(pendingDelete.linkCount ?? 0)} indikator terkait</em>
            </div>
            <div className="delete-dialog-actions">
              <button
                type="button"
                className="outline"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="delete-confirm-button"
                disabled={deleting}
                onClick={() => void remove()}
              >
                {deleting ? "Menghapus…" : "Hapus Bukti"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
});

function ReportsWorkspace() {
  const [data, setData] = useState<DashboardData>({
    types: [],
    periods: [],
    categories: [],
    history: [],
  });
  const [typeId, setTypeId] = useState("");
  const [periodId, setPeriodId] = useState("");
  useEffect(() => {
    void fetch("/api/dashboard", { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (result) setData(result as DashboardData);
      });
  }, []);
  const periods = data.periods.filter(
    (period) => String(period.typeId) === typeId,
  );
  const selectedType = data.types.find((type) => String(type.id) === typeId);
  const selectedPeriod = data.periods.find(
    (period) => String(period.id) === periodId,
  );
  return (
    <div className="reports-workspace">
      <section className="panel assessment-context report-context">
        <div>
          <strong>Pilih Laporan</strong>
          <small>Jenis dan tahun mengikuti hak akses akun Anda</small>
        </div>
        <label>
          Jenis Penilaian
          <select
            value={typeId}
            onChange={(event) => {
              setTypeId(event.target.value);
              setPeriodId("");
            }}
          >
            <option value="">Pilih jenis penilaian</option>
            {data.types.map((type) => (
              <option key={String(type.id)} value={String(type.id)}>
                {String(type.code)} · {String(type.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tahun Penilaian
          <select
            value={periodId}
            disabled={!typeId}
            onChange={(event) => setPeriodId(event.target.value)}
          >
            <option value="">Pilih tahun penilaian</option>
            {periods.map((period) => (
              <option key={String(period.id)} value={String(period.id)}>
                {String(period.year)} · {String(period.name)}
              </option>
            ))}
          </select>
        </label>
      </section>
      {!periodId ? (
        <section className="panel empty-workspace">
          <h2>Pilih jenis dan tahun penilaian</h2>
          <p>
            Pratinjau serta tombol unduh akan tersedia setelah periode dipilih.
          </p>
        </section>
      ) : (
        <div className="report-grid">
          <section className="panel report-preview">
            <div className="report-cover">
              <span>SATUNILAI · KOMNAS HAM RI</span>
              <h2>Laporan Penilaian {String(selectedType?.code)}</h2>
              <p>
                Tahun {String(selectedPeriod?.year)} ·{" "}
                {String(selectedPeriod?.status)}
              </p>
              <strong>{String(selectedPeriod?.year)}</strong>
              <small>PERIODE PENILAIAN</small>
            </div>
          </section>
          <section className="panel report-options">
            <h2>Isi laporan</h2>
            {[
              "Rekap nilai target, mandiri, dan final asesor",
              "Status verifikasi bukti dukung",
              "Matriks indikator dan bukti",
              "Catatan pemeriksa",
              "Analisis kesenjangan nilai",
            ].map((item) => (
              <label key={item}>
                <input type="checkbox" defaultChecked /> {item}
              </label>
            ))}
            <a
              className="primary download-link"
              href={`/api/reports/pdf?periodId=${encodeURIComponent(periodId)}`}
            >
              Unduh PDF
            </a>
            <a
              className="outline download-link"
              href={`/api/reports/excel?periodId=${encodeURIComponent(periodId)}`}
            >
              Unduh Excel
            </a>
          </section>
        </div>
      )}
    </div>
  );
}

const AssessmentWorkspace = forwardRef<
  { openFinalize: () => void },
  {
    flash: (message: string) => void;
    onContextChange: (title: string) => void;
    attention: Record<string, unknown> | null;
    onAttentionHandled: () => void;
  }
>(function AssessmentWorkspace({ flash, onContextChange, attention, onAttentionHandled }, ref) {
  const [data, setData] = useState<WorkspaceData>({
    types: [],
    periods: [],
    subcategories: [],
    indicators: [],
  });
  const [periodId, setPeriodId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [indicatorId, setIndicatorId] = useState("");
  const [value, setValue] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceRows, setEvidenceRows] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [rejectingId, setRejectingId] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [finalValues, setFinalValues] = useState<Record<string, string>>({});
  const [pendingEvidenceDelete, setPendingEvidenceDelete] = useState<Record<
    string,
    unknown
  > | null>(null);

  const load = async (requestedPeriodId?: string) => {
    const response = await fetch(
      `/api/assessment-workspace${requestedPeriodId ? `?periodId=${encodeURIComponent(requestedPeriodId)}` : ""}`,
      { cache: "no-store" },
    );
    const result = (await response.json()) as WorkspaceData & {
      error?: string;
    };
    if (!response.ok) {
      flash(result.error ?? "Penilaian belum dapat dimuat");
      return;
    }
    setData(result);
    const selectedPeriod = result.selectedPeriod;
    const selectedType = result.types.find(
      (type) => String(type.id) === String(selectedPeriod?.typeId),
    );
    onContextChange(
      selectedPeriod
        ? `Penilaian ${String(selectedType?.code ?? selectedPeriod.typeCode ?? "")} ${String(selectedPeriod.year ?? "")}`.trim()
        : "Penilaian",
    );
    const nextPeriodId = String(selectedPeriod?.id ?? "");
    const nextTypeId = String(selectedPeriod?.typeId ?? "");
    setPeriodId(nextPeriodId);
    setTypeId(nextTypeId);
    setSubcategoryId((current) =>
      result.subcategories.some((row) => String(row.id) === current)
        ? current
        : String(result.subcategories[0]?.id ?? ""),
    );
  };
  useEffect(() => {
    if (!attention?.periodId) void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const requestedPeriodId = String(attention?.periodId ?? "");
    if (!requestedPeriodId) return;
    void load(requestedPeriodId).then(() => {
      setSubcategoryId(String(attention?.subcategoryId ?? ""));
      setIndicatorId(String(attention?.indicatorId ?? ""));
      window.setTimeout(() => document.querySelector(".score-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
      onAttentionHandled();
    });
  }, [attention]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodsForType = data.periods.filter(
    (period) => String(period.typeId) === typeId,
  );
  const indicatorsForSubcategory = data.indicators.filter(
    (indicator) => String(indicator.subcategoryId) === subcategoryId,
  );
  const selectedIndicator =
    data.indicators.find((indicator) => String(indicator.id) === indicatorId) ??
    indicatorsForSubcategory[0];
  useEffect(() => {
    if (!selectedIndicator) {
      setIndicatorId("");
      return;
    }
    setIndicatorId(String(selectedIndicator.id));
    setValue(
      selectedIndicator.internalValue == null
        ? ""
        : Number(selectedIndicator.internalValue),
    );
    setNote(String(selectedIndicator.staffNote ?? ""));
    const scoreId = String(selectedIndicator.scoreId ?? "");
    if (!scoreId) {
      setEvidenceRows([]);
      return;
    }
    void fetch(`/api/evidence?scoreId=${encodeURIComponent(scoreId)}`, {
      cache: "no-store",
    })
      .then(async (response) =>
        response.ok ? response.json() : { evidence: [] },
      )
      .then((result: { evidence?: Array<Record<string, unknown>> }) =>
        setEvidenceRows(result.evidence ?? []),
      );
  }, [selectedIndicator]);

  const selectType = async (nextTypeId: string) => {
    setTypeId(nextTypeId);
    setPeriodId("");
    setSubcategoryId("");
    setIndicatorId("");
    setData((current) => ({
      ...current,
      selectedPeriod: undefined,
      subcategories: [],
      indicators: [],
    }));
    onContextChange("Penilaian");
  };
  const selectPeriod = async (nextPeriodId: string) => {
    setPeriodId(nextPeriodId);
    await load(nextPeriodId);
  };
  const saveScore = async () => {
    const maxScore = Number(data.selectedPeriod?.maxScore ?? 5);
    if (
      !selectedIndicator ||
      value === "" ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      flash("Isi nilai dengan angka nol atau lebih");
      return null;
    }
    if (value > maxScore) {
      flash(`Nilai tidak boleh melebihi nilai maksimal periode (${maxScore})`);
      return null;
    }
    setSaving(true);
    const response = await fetch("/api/assessment-workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodId,
        indicatorId: selectedIndicator.id,
        value,
        note,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      scoreId?: string;
    };
    setSaving(false);
    if (!response.ok) {
      flash(result.error ?? "Nilai belum dapat disimpan");
      return null;
    }
    await load(periodId);
    flash("Nilai mandiri berhasil disimpan");
    return result.scoreId ?? null;
  };
  const saveEvidence = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!evidenceUrl && !evidenceFile) {
      flash("Pilih berkas atau tautan HTTPS");
      return;
    }
    let scoreId = String(selectedIndicator?.scoreId ?? "");
    if (!scoreId) scoreId = String((await saveScore()) ?? "");
    if (!scoreId) return;
    const formData = new FormData();
    formData.set("scoreId", scoreId);
    formData.set("title", evidenceTitle);
    if (evidenceFile) formData.set("file", evidenceFile);
    else formData.set("url", evidenceUrl);
    const response = await fetch("/api/evidence", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      flash(result.error ?? "Bukti belum dapat disimpan");
      return;
    }
    setEvidenceTitle("");
    setEvidenceUrl("");
    setEvidenceFile(null);
    await load(periodId);
    window.dispatchEvent(new Event("satunilai:notifications"));
    flash("Bukti dukung berhasil ditambahkan");
  };
  const isStaff = data.user?.role === "staff";
  const selectedStatus = String(selectedIndicator?.status ?? "");
  const canEdit =
    isStaff &&
    selectedStatus !== "approved" &&
    selectedStatus !== "locked" &&
    String(data.selectedPeriod?.status) !== "finalized";
  const periodMaxScore = Number(data.selectedPeriod?.maxScore ?? 5);
  const isAdmin = data.user?.role === "admin";
  const rejectingIndicator = rejectingId
    ? data.indicators.find(
        (indicator) => String(indicator.scoreId ?? "") === rejectingId,
      )
    : undefined;
  const weightedFinalScore = (() => {
    const entered = data.subcategories.filter((subcategory) => {
      const raw = finalValues[String(subcategory.id)];
      return raw !== "" && Number.isFinite(Number(raw));
    });
    if (!entered.length) return null;
    const categoryIds = [
      ...new Set(entered.map((subcategory) => String(subcategory.categoryId))),
    ];
    const categoryScores = categoryIds.map((categoryId) => {
      const children = entered.filter(
        (subcategory) => String(subcategory.categoryId) === categoryId,
      );
      const childWeight = children.reduce(
        (total, subcategory) => total + Number(subcategory.weight ?? 0),
        0,
      );
      const score =
        childWeight > 0
          ? children.reduce(
              (total, subcategory) =>
                total +
                Number(finalValues[String(subcategory.id)]) *
                  Number(subcategory.weight ?? 0),
              0,
            ) / childWeight
          : children.reduce(
              (total, subcategory) =>
                total + Number(finalValues[String(subcategory.id)]),
              0,
            ) / children.length;
      return { score, weight: Number(children[0]?.categoryWeight ?? 0) };
    });
    const mainWeight = categoryScores.reduce(
      (total, category) => total + category.weight,
      0,
    );
    return mainWeight > 0
      ? categoryScores.reduce(
          (total, category) => total + category.score * category.weight,
          0,
        ) / mainWeight
      : categoryScores.reduce((total, category) => total + category.score, 0) /
          categoryScores.length;
  })();
  const deleteEvidence = async () => {
    const scoreId = String(selectedIndicator?.scoreId ?? "");
    const evidenceId = String(pendingEvidenceDelete?.id ?? "");
    if (!scoreId || !evidenceId) return;
    const response = await fetch("/api/evidence", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceId, scoreId }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      flash(result.error ?? "Bukti belum dapat dihapus");
      setPendingEvidenceDelete(null);
      return;
    }
    setPendingEvidenceDelete(null);
    await load(periodId);
    window.dispatchEvent(new Event("satunilai:notifications"));
    flash("Bukti berhasil dihapus");
  };
  const reviewScore = async (
    scoreId: string,
    decision: "approved" | "rejected",
  ) => {
    setReviewing(true);
    const response = await fetch("/api/assessment-workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "review",
        scoreId,
        decision,
        note: reviewNotes[scoreId] ?? "",
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setReviewing(false);
    if (!response.ok) {
      flash(result.error ?? "Verifikasi belum dapat disimpan");
      return;
    }
    setRejectingId("");
    await load(periodId);
    window.dispatchEvent(new Event("satunilai:notifications"));
    flash(
      decision === "approved"
        ? "Bukti indikator diterima"
        : "Bukti indikator ditolak dan dikembalikan untuk perbaikan",
    );
  };
  useImperativeHandle(
    ref,
    () => ({
      openFinalize: () => {
        if (!periodId) {
          flash("Pilih jenis dan tahun penilaian terlebih dahulu");
          return;
        }
        if (String(data.selectedPeriod?.status) === "finalized") {
          flash("Periode ini sudah final dan dikunci");
          return;
        }
        setFinalValues(
          Object.fromEntries(
            data.subcategories.map((row) => [
              String(row.id),
              row.finalValue == null ? "" : String(row.finalValue),
            ]),
          ),
        );
        setShowFinalize(true);
      },
    }),
    [data.selectedPeriod?.status, data.subcategories, flash, periodId],
  );
  const finalizePeriod = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/assessment-workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "finalize",
        periodId,
        finalValues: Object.fromEntries(
          Object.entries(finalValues).map(([key, number]) => [
            key,
            Number(number),
          ]),
        ),
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setSaving(false);
    if (!response.ok) {
      flash(result.error ?? "Periode belum dapat difinalisasi");
      return;
    }
    setShowFinalize(false);
    await load(periodId);
    flash("Nilai asesor tersimpan dan periode berhasil difinalisasi");
  };

  if (!data.types.length)
    return (
      <section className="panel empty-workspace">
        <h2>Belum ada akses penilaian</h2>
        <p>
          Hubungi administrator untuk memberikan akses ke satu atau beberapa
          jenis penilaian.
        </p>
      </section>
    );
  return (
    <div className="assessment-workspace">
      <section className="panel assessment-context">
        <div>
          <strong>Pilih Penilaian</strong>
          <small>Hanya jenis penilaian yang diberikan kepada akun Anda</small>
        </div>
        <label>
          Jenis Penilaian
          <select
            value={typeId}
            onChange={(event) => void selectType(event.target.value)}
          >
            {data.types.length > 1 && (
              <option value="">Pilih jenis penilaian</option>
            )}
            {data.types.map((type) => (
              <option key={String(type.id)} value={String(type.id)}>
                {String(type.code)} · {String(type.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tahun Penilaian
          <select
            value={periodId}
            disabled={!typeId}
            onChange={(event) => void selectPeriod(event.target.value)}
          >
            <option value="">Pilih tahun penilaian</option>
            {periodsForType.map((period) => (
              <option key={String(period.id)} value={String(period.id)}>
                {String(period.year)} · {String(period.name)}
              </option>
            ))}
          </select>
        </label>
        <span className="badge green">
          {String(data.selectedPeriod?.status ?? "-")}
        </span>
      </section>
      <section className="panel assessment-subcategories">
        <div className="panel-head">
          <div>
            <h2>Nilai Subkategori</h2>
            <p>
              Pilih subkategori untuk menampilkan indikator yang perlu
              ditindaklanjuti.
            </p>
          </div>
        </div>
        <div className="subcategory-grid dynamic">
          {!typeId && (
            <div className="empty-selection">
              Pilih jenis penilaian untuk menampilkan nilai subkategori.
            </div>
          )}
          {data.subcategories.map((subcategory) => {
            const score = Number(subcategory.score ?? 0);
            const targetValue = Number(subcategory.target ?? 0);
            const active = String(subcategory.id) === subcategoryId;
            const hasEvidence = Number(subcategory.evidenceCount ?? 0) > 0;
            return (
              <button
                key={String(subcategory.id)}
                className={`${active ? "selected" : ""} ${hasEvidence ? "has-evidence" : ""}`.trim()}
                onClick={() => {
                  setSubcategoryId(String(subcategory.id));
                  setIndicatorId("");
                }}
              >
                <span>
                  <b>{String(subcategory.code)}</b>
                  <small>{String(subcategory.categoryName)}</small>
                </span>
                <strong>{String(subcategory.name)}</strong>
                <div>
                  <em>{score.toFixed(2).replace(".", ",")}</em>
                  <small>
                    Mandiri · Target {targetValue.toLocaleString("id-ID")}
                  </small>
                </div>
                <div className="subcategory-final">
                  <span>Nilai final asesor</span>
                  <strong>
                    {subcategory.finalValue == null
                      ? "Belum diisi"
                      : Number(subcategory.finalValue).toLocaleString("id-ID")}
                  </strong>
                </div>
                <i>
                  <span
                    style={{
                      width: `${targetValue > 0 ? Math.min(100, (score / targetValue) * 100) : 0}%`,
                    }}
                  />
                </i>
                <footer>
                  {Number(subcategory.completed ?? 0)} dari{" "}
                  {Number(subcategory.indicatorCount ?? 0)} dinilai · Bobot{" "}
                  {Number(subcategory.weight ?? 0)}% ·{" "}
                  {Number(subcategory.evidenceCount ?? 0)} indikator memiliki
                  bukti
                </footer>
              </button>
            );
          })}
        </div>
      </section>
      <section className="panel module-table assessment-indicators">
        <div className="panel-head">
          <div>
            <h2>Indikator yang Perlu Ditindaklanjuti</h2>
            <p>Daftar menyesuaikan subkategori yang dipilih.</p>
          </div>
          <span>{indicatorsForSubcategory.length} indikator</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>KODE</th>
                <th>INDIKATOR</th>
                <th>NILAI MANDIRI</th>
                <th>TARGET SUBKATEGORI</th>
                <th>BUKTI</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {indicatorsForSubcategory.map((indicator) => {
                const evidenceCount = Number(indicator.evidenceCount ?? 0);
                const status = String(indicator.status ?? "");
                const statusInfo = !evidenceCount
                  ? { label: "Belum ada bukti", tone: "neutral" }
                  : status === "approved" || status === "locked"
                    ? { label: "Telah terverifikasi", tone: "success" }
                    : status === "rejected"
                      ? { label: "Belum sesuai", tone: "danger" }
                      : { label: "Menunggu verifikasi admin", tone: "warning" };
                const scoreId = String(indicator.scoreId ?? "");
                return (
                  <tr
                    key={String(indicator.id)}
                    className={`${String(indicator.id) === String(selectedIndicator?.id) ? "selected-row" : ""} status-row-${statusInfo.tone}`.trim()}
                    onClick={() => setIndicatorId(String(indicator.id))}
                  >
                    <td>
                      <span className="code">{String(indicator.code)}</span>
                    </td>
                    <td>
                      <strong>{String(indicator.name)}</strong>
                      <small>{String(indicator.description ?? "")}</small>
                    </td>
                    <td>
                      {indicator.internalValue == null
                        ? "Belum dinilai"
                        : String(indicator.internalValue)}
                    </td>
                    <td>{String(indicator.targetValue ?? "-")}</td>
                    <td>{evidenceCount} bukti</td>
                    <td className="verification-cell">
                      <span
                        className={`verification-status ${statusInfo.tone}`}
                      >
                        {statusInfo.label}
                      </span>
                      {String(indicator.reviewerNote ?? "") && (
                        <small className="reviewer-note">
                          {String(indicator.reviewerNote)}
                        </small>
                      )}
                      {isAdmin &&
                        evidenceCount > 0 &&
                        ["submitted", "draft"].includes(status) &&
                        String(data.selectedPeriod?.status) !== "finalized" && (
                          <div className="verification-actions">
                            <button
                              type="button"
                              className="accept"
                              disabled={reviewing}
                              onClick={(event) => {
                                event.stopPropagation();
                                void reviewScore(scoreId, "approved");
                              }}
                            >
                              <span>✓</span> Terima
                            </button>
                            <button
                              type="button"
                              className="reject"
                              disabled={reviewing}
                              onClick={(event) => {
                                event.stopPropagation();
                                setRejectingId(scoreId);
                                setReviewNotes((current) => ({
                                  ...current,
                                  [scoreId]: "",
                                }));
                              }}
                            >
                              <span>×</span> Tolak
                            </button>
                          </div>
                        )}
                      {isAdmin && evidenceCount === 0 && (
                        <small className="verification-hint">
                          Menunggu staf mengunggah bukti
                        </small>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {selectedIndicator && (
        <section className="panel score-editor">
          <div className="score-editor-head">
            <div>
              <span className="code">{String(selectedIndicator.code)}</span>
              <div>
                <h2>{String(selectedIndicator.name)}</h2>
                <p>
                  {String(selectedIndicator.categoryName)} /{" "}
                  {String(selectedIndicator.subcategoryName)}
                </p>
              </div>
            </div>
            {isStaff && !["approved", "locked"].includes(selectedStatus) && (
              <button
                className="primary"
                disabled={!canEdit || saving}
                onClick={() => void saveScore()}
              >
                {saving ? "Menyimpan..." : "Simpan Draf"}
              </button>
            )}
          </div>
          {isStaff && !["approved", "locked"].includes(selectedStatus) && (
            <div
              className={`score-editor-grid ${!canEdit ? "viewer-only" : ""}`}
            >
              <div>
                <label className="numeric-score">
                  Nilai Mandiri
                  <input
                    type="number"
                    min="0"
                    max={periodMaxScore}
                    step="0.01"
                    disabled={!canEdit}
                    value={value}
                    onChange={(event) =>
                      setValue(
                        event.target.value === ""
                          ? ""
                          : Math.min(
                              periodMaxScore,
                              Math.max(0, Number(event.target.value)),
                            ),
                      )
                    }
                    placeholder={`Masukkan nilai, maksimal ${periodMaxScore}`}
                  />
                  <small>Nilai maksimal periode: {periodMaxScore}</small>
                </label>
                <div className="target-display">
                  <span>Target Subkategori</span>
                  <strong>
                    {Number(selectedIndicator.targetValue ?? 0).toLocaleString(
                      "id-ID",
                    )}
                  </strong>
                </div>
                <label className="staff-note">
                  Catatan staf
                  <textarea
                    disabled={!canEdit}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Jelaskan kondisi atau tindak lanjut..."
                  />
                </label>
              </div>
              {canEdit && selectedStatus !== "approved" && (
                <form
                  className="evidence-entry"
                  onSubmit={(event) => void saveEvidence(event)}
                >
                  <div>
                    <strong>Tambah Bukti Dukung</strong>
                  </div>
                  <label>
                    Nama bukti yang mudah dicari
                    <input
                      disabled={!canEdit}
                      value={evidenceTitle}
                      onChange={(event) => setEvidenceTitle(event.target.value)}
                      placeholder="Contoh: Rekap RUP Penyedia 2026"
                    />
                    <small>Jika dikosongkan, nama dibuat otomatis dari nama berkas.</small>
                  </label>
                  <label>
                    Tautan Google Drive / website
                    <input
                      disabled={!canEdit || Boolean(evidenceFile)}
                      type="url"
                      placeholder="https://..."
                      value={evidenceUrl}
                      onChange={(event) => setEvidenceUrl(event.target.value)}
                    />
                  </label>
                  <label>
                    Atau unggah berkas
                    <input
                      disabled={!canEdit || Boolean(evidenceUrl)}
                      type="file"
                      accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                      onChange={(event) => { const selectedFile = event.target.files?.[0] ?? null; setEvidenceFile(selectedFile); if (selectedFile && !evidenceTitle.trim()) setEvidenceTitle(selectedFile.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase())); }}
                    />
                  </label>
                  <button className="outline" disabled={!canEdit}>
                    Tambah Bukti
                  </button>
                </form>
              )}
            </div>
          )}
          <section className="evidence-list">
            <div>
              <strong>Daftar Bukti Dukung</strong>
              <span>{evidenceRows.length} dokumen</span>
            </div>
            {evidenceRows.length === 0 && (
              <p>Belum ada bukti dukung pada indikator ini.</p>
            )}
            {evidenceRows.map((row) => {
              const viewUrl = row.externalUrl
                ? String(row.externalUrl)
                : `/api/evidence/${encodeURIComponent(String(row.id))}/download?view=1`;
              return (
                <article key={String(row.id)}>
                  <div>
                    <b>{String(row.title)}</b>
                    <small>
                      {String(row.filename ?? row.externalUrl ?? "Berkas")}
                    </small>
                  </div>
                  <div className="evidence-actions">
                    <a href={viewUrl} target="_blank" rel="noreferrer">
                      Lihat
                      {Boolean(row.rejectedAt) && (
                        <i title="Bukti pernah ditolak" />
                      )}
                    </a>
                    {isStaff &&
                      ["submitted", "draft"].includes(selectedStatus) && (
                        <button
                          type="button"
                          onClick={() => setPendingEvidenceDelete(row)}
                        >
                          Hapus
                        </button>
                      )}
                  </div>
                </article>
              );
            })}
          </section>
        </section>
      )}
      {pendingEvidenceDelete && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setPendingEvidenceDelete(null)}
        >
          <section
            className="evidence-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-indicator-evidence-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="delete-dialog-icon" aria-hidden="true">
              ⌫
            </span>
            <div className="delete-dialog-copy">
              <p>HAPUS BUKTI DUKUNG</p>
              <h2 id="delete-indicator-evidence-title">Hapus bukti ini?</h2>
              <span>
                Bukti yang masih menunggu verifikasi akan dilepaskan dari
                indikator ini.
              </span>
            </div>
            <div className="delete-evidence-summary">
              <strong>{String(pendingEvidenceDelete.title)}</strong>
              <small>
                {String(
                  pendingEvidenceDelete.filename ??
                    pendingEvidenceDelete.externalUrl ??
                    "Dokumen bukti dukung",
                )}
              </small>
            </div>
            <div className="delete-dialog-actions">
              <button
                type="button"
                className="outline"
                onClick={() => setPendingEvidenceDelete(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="delete-confirm-button"
                onClick={() => void deleteEvidence()}
              >
                Hapus Bukti
              </button>
            </div>
          </section>
        </div>
      )}
      {rejectingIndicator && (
        <div className="modal-backdrop" onMouseDown={() => setRejectingId("")}>
          <form
            className="admin-modal rejection-modal"
            onSubmit={(event) => {
              event.preventDefault();
              void reviewScore(rejectingId, "rejected");
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div>
              <h2>Tolak Bukti Dukung</h2>
              <button type="button" onClick={() => setRejectingId("")}>
                ×
              </button>
            </div>
            <p>
              Jelaskan bukti yang belum sesuai untuk indikator{" "}
              <strong>
                {String(rejectingIndicator.code)} ·{" "}
                {String(rejectingIndicator.name)}
              </strong>
              . Alasan ini akan tampil pada status staf dan kepala unit.
            </p>
            <label>
              Alasan penolakan
              <textarea
                aria-label={`Alasan penolakan ${String(rejectingIndicator.code)}`}
                placeholder="Contoh: Dokumen belum ditandatangani dan periode datanya tidak sesuai…"
                value={reviewNotes[rejectingId] ?? ""}
                onChange={(event) =>
                  setReviewNotes({
                    ...reviewNotes,
                    [rejectingId]: event.target.value,
                  })
                }
              />
            </label>
            <div className="rejection-actions">
              <button
                type="button"
                className="outline"
                onClick={() => setRejectingId("")}
              >
                Batal
              </button>
              <button
                type="submit"
                className="danger-solid"
                disabled={reviewing || !(reviewNotes[rejectingId] ?? "").trim()}
              >
                {reviewing ? "Memproses…" : "Lanjutkan Penolakan"}
              </button>
            </div>
          </form>
        </div>
      )}
      {showFinalize && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setShowFinalize(false)}
        >
          <form
            className="admin-modal finalize-modal"
            onSubmit={(event) => void finalizePeriod(event)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div>
              <h2>Nilai Final Asesor</h2>
              <button type="button" onClick={() => setShowFinalize(false)}>
                ×
              </button>
            </div>
            <section className="overall-final-score">
              <span>Nilai keseluruhan</span>
              <strong>
                {weightedFinalScore == null
                  ? "—"
                  : weightedFinalScore.toLocaleString("id-ID", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </strong>
              <small>
                {String(data.selectedPeriod?.typeCode ?? "Penilaian")} · Tahun{" "}
                {String(data.selectedPeriod?.year ?? "-")} · nilai subkategori
                dihitung dalam kategori, kemudian dikalikan bobot kategori utama
              </small>
            </section>
            <p className="finalize-warning">
              Finalisasi hanya berhasil jika seluruh indikator memiliki bukti
              yang telah diterima admin. Setelah final, periode terkunci dan
              tidak dapat diubah.
            </p>
            {data.subcategories.map((subcategory) => (
              <label className="final-value-field" key={String(subcategory.id)}>
                <span>
                  <strong>
                    {String(subcategory.code)} · {String(subcategory.name)}
                  </strong>
                  <small>
                    Kategori utama: {String(subcategory.categoryName)} · Bobot{" "}
                    {Number(subcategory.categoryWeight ?? 0)}% &nbsp;|&nbsp;
                    Bobot subkategori dalam kategori:{" "}
                    {Number(subcategory.weight ?? 0)}%
                  </small>
                </span>
                <input
                  type="number"
                  min="0"
                  max={periodMaxScore}
                  step="0.01"
                  required
                  value={finalValues[String(subcategory.id)] ?? ""}
                  onChange={(event) =>
                    setFinalValues({
                      ...finalValues,
                      [String(subcategory.id)]: event.target.value,
                    })
                  }
                />
              </label>
            ))}
            <button className="primary" disabled={saving}>
              {saving ? "Memfinalisasi…" : "Simpan Nilai Asesor & Finalisasi"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
});

const StructureManager = forwardRef<
  { openCategory: () => void },
  {
    adminData: AdminData;
    refreshAdmin: () => Promise<void>;
    flash: (message: string) => void;
  }
>(function StructureManager({ adminData, refreshAdmin, flash }, ref) {
  type StructureItem = Record<string, unknown>;
  const [modal, setModal] = useState<{
    resource: "category" | "subcategory" | "indicator";
    id?: string;
    parentId?: string;
  } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    resource: "category" | "subcategory" | "indicator";
    id: string;
    name: string;
  } | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const effectiveTypeId = adminData.types.some(
    (type) => String(type.id) === selectedTypeId,
  )
    ? selectedTypeId
    : "";
  const periodsForType = useMemo(
    () =>
      adminData.periods.filter(
        (period) => String(period.typeId) === effectiveTypeId,
      ),
    [adminData.periods, effectiveTypeId],
  );
  const effectivePeriodId = periodsForType.some(
    (period) => String(period.id) === selectedPeriodId,
  )
    ? selectedPeriodId
    : "";
  const selectedPeriod = periodsForType.find(
    (period) => String(period.id) === effectivePeriodId,
  );
  const selectedVersionId = String(selectedPeriod?.instrumentVersionId ?? "");
  const selectedStructure = useMemo(
    () =>
      adminData.structure.filter(
        (row) => String(row.instrumentVersionId) === selectedVersionId,
      ),
    [adminData.structure, selectedVersionId],
  );
  const categories = useMemo(() => {
    const map = new Map<string, StructureItem>();
    selectedStructure.forEach((row) => map.set(String(row.categoryId), row));
    return [...map.values()];
  }, [selectedStructure]);
  const previousPeriod = useMemo(() => {
    if (!selectedPeriod) return undefined;
    return periodsForType
      .filter((period) => Number(period.year) < Number(selectedPeriod.year))
      .sort((left, right) => Number(right.year) - Number(left.year))
      .find((period) => {
        const versionId = String(period.instrumentVersionId ?? "");
        return adminData.structure.some(
          (row) => String(row.instrumentVersionId) === versionId,
        );
      });
  }, [adminData.structure, periodsForType, selectedPeriod]);
  const subcategoriesFor = (categoryId: string) => {
    const map = new Map<string, StructureItem>();
    selectedStructure
      .filter(
        (row) => String(row.categoryId) === categoryId && row.subcategoryId,
      )
      .forEach((row) => map.set(String(row.subcategoryId), row));
    return [...map.values()];
  };
  const indicatorsFor = (subcategoryId: string) => {
    const map = new Map<string, StructureItem>();
    selectedStructure
      .filter(
        (row) => String(row.subcategoryId) === subcategoryId && row.indicatorId,
      )
      .forEach((row) => map.set(String(row.indicatorId), row));
    return [...map.values()];
  };
  const open = (
    resource: "category" | "subcategory" | "indicator",
    parentId?: string,
    item?: StructureItem,
  ) => {
    const prefix =
      resource === "category"
        ? "category"
        : resource === "subcategory"
          ? "subcategory"
          : "indicator";
    setModal({
      resource,
      parentId,
      id: item ? String(item[`${prefix}Id`]) : undefined,
    });
    setForm(
      item
        ? {
            code: String(item[`${prefix}Code`] ?? ""),
            name: String(item[`${prefix}Name`] ?? ""),
            description: String(item.indicatorDescription ?? ""),
            weight: String(item[`${prefix}Weight`] ?? "0"),
            target:
              resource === "subcategory"
                ? String(item.subcategoryTarget ?? "4")
                : "",
            sortOrder: String(item[`${prefix}SortOrder`] ?? "0"),
          }
        : {
            weight: "0",
            target: resource === "subcategory" ? "4" : "",
            sortOrder: "0",
          },
    );
  };
  useImperativeHandle(
    ref,
    () => ({
      openCategory: () => {
        if (!selectedVersionId) {
          flash("Pilih jenis dan tahun penilaian terlebih dahulu");
          return;
        }
        setModal({ resource: "category" });
        setForm({ weight: "0", sortOrder: "0" });
      },
    }),
    [selectedVersionId, flash],
  );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      resource: modal.resource,
      ...form,
      parentId: modal.parentId,
    };
    if (modal.resource === "category") payload.versionId = selectedVersionId;
    if (modal.resource === "category" && !selectedVersionId) {
      setSaving(false);
      flash("Pilih jenis dan tahun penilaian terlebih dahulu");
      return;
    }
    if (modal.id) payload.id = modal.id;
    const response = await fetch("/api/admin", {
      method: modal.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setSaving(false);
    if (!response.ok) {
      flash(data.error ?? "Kategori belum dapat disimpan");
      return;
    }
    setModal(null);
    setForm({});
    await refreshAdmin();
    flash(
      modal.id
        ? "Kategori berhasil diperbarui"
        : "Kategori berhasil ditambahkan",
    );
  };
  const remove = async (
    resource: "category" | "subcategory" | "indicator",
    id: string,
    name: string,
  ) => {
    const response = await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, id }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      flash(data.error ?? "Kategori belum dapat dihapus");
      return;
    }
    setPendingDelete(null);
    await refreshAdmin();
    flash(`${name} berhasil dihapus`);
  };
  const duplicatePreviousStructure = async () => {
    if (!selectedPeriod || !previousPeriod || duplicating) return;
    setDuplicating(true);
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "structureDuplicate",
        targetPeriodId: selectedPeriod.id,
        sourcePeriodId: previousPeriod.id,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      sourceYear?: number;
    };
    setDuplicating(false);
    if (!response.ok) {
      flash(data.error ?? "Kategori indikator belum dapat diduplikasi");
      return;
    }
    await refreshAdmin();
    flash(
      `Kategori indikator berhasil diduplikasi dari tahun ${data.sourceYear ?? previousPeriod.year}`,
    );
  };
  const resourceLabel =
    modal?.resource === "category"
      ? "Kategori"
      : modal?.resource === "subcategory"
        ? "Subkategori"
        : "Indikator";
  return (
    <>
      <section className="panel structure-panel nested-structure">
        <div className="structure-toolbar">
          <div>
            <strong>Kategori Indikator</strong>
            <small>
              Setiap jenis dan tahun memakai versi instrumen tersendiri
            </small>
          </div>
          <label>
            Jenis Penilaian
            <select
              value={effectiveTypeId}
              onChange={(event) => {
                setSelectedTypeId(event.target.value);
                setSelectedPeriodId("");
              }}
            >
              <option value="">Pilih jenis penilaian</option>
              {adminData.types.map((type) => (
                <option key={String(type.id)} value={String(type.id)}>
                  {String(type.code)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tahun Penilaian
            <select
              value={effectivePeriodId}
              disabled={!effectiveTypeId}
              onChange={(event) => setSelectedPeriodId(event.target.value)}
            >
              <option value="">Pilih tahun penilaian</option>
              {periodsForType.map((period) => (
                <option key={String(period.id)} value={String(period.id)}>
                  {String(period.year)} · {String(period.versionName)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!effectiveTypeId && (
          <div className="empty-structure">
            Pilih jenis penilaian dan tahun penilaian untuk menampilkan kategori
            indikator.
          </div>
        )}
        {effectiveTypeId && !effectivePeriodId && (
          <div className="empty-structure">
            Pilih tahun penilaian untuk menampilkan kategori indikator.
          </div>
        )}
        {effectivePeriodId && !categories.length && (
          <div className="empty-structure">
            <span>
              Belum ada kategori untuk {String(selectedPeriod?.typeCode)}{" "}
              {String(selectedPeriod?.year)}. Tambahkan kategori pertama.
            </span>
            {previousPeriod && (
              <button
                type="button"
                className="secondary duplicate-structure-button"
                disabled={duplicating}
                onClick={duplicatePreviousStructure}
              >
                {duplicating
                  ? "Menduplikasi kategori…"
                  : `⧉ Duplikasi dari ${String(previousPeriod.typeCode)} ${String(previousPeriod.year)}`}
              </button>
            )}
          </div>
        )}
        {categories.map((category, categoryIndex) => {
          const categoryId = String(category.categoryId);
          const subs = subcategoriesFor(categoryId);
          return (
            <details key={categoryId} open>
              <summary>
                <span className={`cat-num c${(categoryIndex % 4) + 1}`}>
                  {String(category.categoryCode)}
                </span>
                <div>
                  <strong>{String(category.categoryName)}</strong>
                  <small>
                    Bobot {Number(category.categoryWeight ?? 0)}% ·{" "}
                    {subs.length} subkategori
                  </small>
                </div>
                <span className="structure-actions">
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      open("subcategory", categoryId);
                    }}
                  >
                    ＋ Subkategori
                  </button>
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      open("category", undefined, category);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="danger"
                    onClick={(event) => {
                      event.preventDefault();
                      setPendingDelete({
                        resource: "category",
                        id: categoryId,
                        name: String(category.categoryName),
                      });
                    }}
                  >
                    Hapus
                  </button>
                </span>
              </summary>
              <div className="nested-list">
                {subs.map((subcategory) => {
                  const subcategoryId = String(subcategory.subcategoryId);
                  const indicatorRows = indicatorsFor(subcategoryId);
                  return (
                    <article key={subcategoryId} className="subcategory-block">
                      <div className="subcategory-head">
                        <span>{String(subcategory.subcategoryCode)}</span>
                        <div>
                          <strong>{String(subcategory.subcategoryName)}</strong>
                          <small>
                            Bobot {Number(subcategory.subcategoryWeight ?? 0)}%
                            · Target{" "}
                            {Number(
                              subcategory.subcategoryTarget ?? 0,
                            ).toLocaleString("id-ID")}{" "}
                            · {indicatorRows.length} indikator
                          </small>
                        </div>
                        <div className="structure-actions">
                          <button
                            onClick={() => open("indicator", subcategoryId)}
                          >
                            ＋ Indikator
                          </button>
                          <button
                            onClick={() =>
                              open("subcategory", categoryId, subcategory)
                            }
                          >
                            Edit
                          </button>
                          <button
                            className="danger"
                            onClick={() =>
                              setPendingDelete({
                                resource: "subcategory",
                                id: subcategoryId,
                                name: String(subcategory.subcategoryName),
                              })
                            }
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                      <div className="indicator-list">
                        {indicatorRows.map((indicator) => (
                          <div key={String(indicator.indicatorId)}>
                            <span>{String(indicator.indicatorCode)}</span>
                            <div className="indicator-copy">
                              <strong>{String(indicator.indicatorName)}</strong>
                              {Boolean(indicator.indicatorDescription) && (
                                <em>
                                  {String(indicator.indicatorDescription)}
                                </em>
                              )}
                            </div>
                            <small>
                              Bobot {Number(indicator.indicatorWeight ?? 0)}
                            </small>
                            <div className="structure-actions">
                              <button
                                onClick={() =>
                                  open("indicator", subcategoryId, indicator)
                                }
                              >
                                Edit
                              </button>
                              <button
                                className="danger"
                                onClick={() =>
                                  setPendingDelete({
                                    resource: "indicator",
                                    id: String(indicator.indicatorId),
                                    name: String(indicator.indicatorName),
                                  })
                                }
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </details>
          );
        })}
      </section>
      {modal && (
        <div className="modal-backdrop">
          <form
            className="admin-modal"
            onSubmit={(event) => void submit(event)}
          >
            <div>
              <h2>
                {modal.id ? `Edit ${resourceLabel}` : `Tambah ${resourceLabel}`}
              </h2>
              <button type="button" onClick={() => setModal(null)}>
                ×
              </button>
            </div>
            <label>
              Kode
              <input
                required
                value={form.code ?? ""}
                onChange={(event) =>
                  setForm({ ...form, code: event.target.value })
                }
              />
            </label>
            <label>
              Nama
              <input
                required
                value={form.name ?? ""}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
            <label>
              Bobot (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.weight ?? "0"}
                onChange={(event) =>
                  setForm({ ...form, weight: event.target.value })
                }
              />
            </label>
            {modal.resource === "subcategory" && (
              <label>
                Target Nilai
                <input
                  required
                  type="number"
                  min="0"
                  max={Number(selectedPeriod?.maxScore ?? 5)}
                  step="0.01"
                  value={form.target ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, target: event.target.value })
                  }
                  placeholder={`Maksimal ${Number(selectedPeriod?.maxScore ?? 5)}`}
                />
              </label>
            )}
            <label>
              Urutan
              <input
                type="number"
                min="0"
                value={form.sortOrder ?? "0"}
                onChange={(event) =>
                  setForm({ ...form, sortOrder: event.target.value })
                }
              />
            </label>
            {modal.resource === "indicator" && (
              <label>
                Deskripsi
                <textarea
                  value={form.description ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
            )}
            <button className="primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </form>
        </div>
      )}
      {pendingDelete && (
        <div className="modal-backdrop">
          <section
            className="admin-modal confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-structure-title"
          >
            <div>
              <h2 id="delete-structure-title">Hapus Kategori?</h2>
              <button type="button" onClick={() => setPendingDelete(null)}>
                ×
              </button>
            </div>
            <p>
              <strong>{pendingDelete.name}</strong> beserta seluruh kategori di
              bawahnya akan dihapus.
            </p>
            <div className="confirm-actions">
              <button type="button" onClick={() => setPendingDelete(null)}>
                Batal
              </button>
              <button
                type="button"
                className="danger-solid"
                onClick={() =>
                  void remove(
                    pendingDelete.resource,
                    pendingDelete.id,
                    pendingDelete.name,
                  )
                }
              >
                Ya, hapus
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
});
