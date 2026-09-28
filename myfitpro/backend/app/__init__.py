:root {
  --bg: #0a0d12;
  --panel: #121821;
  --panel-soft: #171f2a;
  --line: #2a3644;
  --text: #eef4ff;
  --muted: #8a98aa;
  --orange: #ff7a3d;
  --green: #10b981;
  --purple: #8b5cf6;
  --blue: #38bdf8;
  --danger: #ef4444;
  --shadow: 0 26px 60px rgba(0,0,0,0.32);
  --radius: 18px;
}

* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; height: 100%; font-family: Inter, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); }
body { min-height: 100vh; }
button, input, select { font: inherit; }
button { cursor: pointer; }

.app-shell {
  display: grid;
  grid-template-columns: 240px minmax(0,1fr);
  min-height: 100vh;
  background: radial-gradient(circle at top, rgba(255,122,61,0.08), transparent 20%), var(--bg);
}

.sidebar {
  background: rgba(18, 24, 33, 0.92);
  border-right: 1px solid var(--line);
  padding: 18px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  letter-spacing: -0.04em;
  font-size: 1.1rem;
}
.brand-mark {
  width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
  background: linear-gradient(135deg, var(--orange), var(--purple));
}
.brand-mark i {
  width: 12px; height: 12px; border-radius: 4px; display: block; background: rgba(10,13,18,0.92);
  box-shadow: 0 0 0 2px rgba(10,13,18,0.92);
}

.workspace {
  display: flex; align-items: center; gap: 10px; padding: 12px 10px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,0.02);
}
.workspace b { display: block; font-size: 0.9rem; }
.workspace small { color: var(--muted); }
.avatar {
  display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 12px; font-size: 0.76rem; font-weight: 800; color: white; background: linear-gradient(135deg, var(--orange), var(--purple));
}
.avatar.small { width: 28px; height: 28px; border-radius: 10px; font-size: 0.66rem; }
.avatar.large { width: 60px; height: 60px; border-radius: 16px; font-size: 1.1rem; }
.avatar-orange { background: linear-gradient(135deg, var(--orange), #ff9f59); }

.main-nav { display: flex; flex-direction: column; gap: 8px; }
.nav-item {
  width: 100%; border: 0; background: transparent; color: var(--muted); display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; text-align: left; font-weight: 600;
}
.nav-item:hover, .nav-item.active { background: var(--panel-soft); color: var(--text); }
.nav-item span { width: 18px; display: inline-block; text-align: center; }
.sidebar-bottom { margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
.sidebar-footer { color: var(--muted); font-size: 0.75rem; padding: 12px 6px 0; }

.content { padding: 24px 24px 40px; min-width: 0; }
.topbar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid var(--line);
}
.mobile-brand { display: none; }
.breadcrumb { color: var(--muted); font-size: 0.8rem; }
.breadcrumb span { margin: 0 10px; }
.profile { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 12px; }

.page-header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 20px 0 24px;
}
.page-header h1 {
  margin: 8px 0 10px; font-size: clamp(2rem, 4vw, 3rem); letter-spacing: -0.05em;
}
.eyebrow { margin: 0; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.72rem; font-weight: 700; }
.subtitle { margin: 0; color: var(--muted); }

.button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; border: 1px solid transparent; padding: 11px 18px; font-weight: 700; background: transparent; color: var(--text);
}
.button.primary { background: linear-gradient(135deg, var(--orange), #ff8e5b); color: #180f09; }
.button.ghost { border-color: var(--line); color: var(--text); background: rgba(255,255,255,0.01); }
.button.full { width: 100%; }

.stats-grid {
  display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; margin-bottom: 22px;
}
.stat-card {
  padding: 18px 18px 16px; border-radius: var(--radius); border: 1px solid var(--line); background: var(--panel); box-shadow: var(--shadow);
}
.stat-card.orange { border-top: 2px solid var(--orange); }
.stat-card.green { border-top: 2px solid var(--green); }
.stat-card.purple { border-top: 2px solid var(--purple); }
.stat-card.blue { border-top: 2px solid var(--blue); }
.stat-label { display: block; color: var(--muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; }
.stat-card strong { display: block; font-size: clamp(1.4rem, 3vw, 2.3rem); margin: 10px 0 6px; letter-spacing: -0.05em; }
.stat-card small { color: var(--muted); }

.dashboard-grid {
  display: grid; grid-template-columns: minmax(0,1.35fr) minmax(280px,0.95fr);
  gap: 18px;
  margin-bottom: 18px;
}
.panel {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow);
}
.panel-heading {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px;
}
.panel-heading h2 { margin: 6px 0 0; font-size: 1.1rem; }
.text-button { padding: 0; border: 0; background: transparent; color: var(--orange); font-weight: 700; }
.student-list { display: flex; flex-direction: column; gap: 10px; }
.student-row {
  width: 100%; display: grid; grid-template-columns: auto minmax(0,1.2fr) minmax(120px, 0.8fr) auto; align-items: center; gap: 12px; background: rgba(255,255,255,0.012); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; text-align: left; color: var(--text);
}
.student-info { display: flex; flex-direction: column; min-width: 0; }
.student-info b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.student-info small { color: var(--muted); }
.progress-wrap { display: flex; flex-direction: column; gap: 6px; }
.progress-label { font-size: 0.75rem; color: var(--muted); }
.progress { display: block; width: 100%; height: 7px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
.progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--orange), var(--green)); }
.row-arrow { color: var(--muted); }

.schedule-list { display: flex; flex-direction: column; gap: 12px; }
.schedule-item {
  display: grid; grid-template-columns: 56px auto minmax(0,1fr) auto; align-items: center; gap: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px;
}
.schedule-item strong { color: var(--orange); }
.schedule-item span { display: flex; flex-direction: column; gap: 2px; }
.schedule-item small { color: var(--muted); }
.icon-button { border: 1px solid var(--line); background: transparent; color: var(--text); border-radius: 10px; width: 32px; height: 32px; }
.icon-button.small { width: 28px; height: 28px; font-size: 0.9rem; }

.chart-panel { margin-bottom: 18px; }
.chart-placeholder {
  min-height: 190px; display: grid; place-items: center; color: var(--muted); border: 1px dashed var(--line); border-radius: 12px; background: rgba(255,255,255,0.01);
}

.create-panel { margin-bottom: 18px; }
.student-form {
  display: grid; grid-template-columns: 1.3fr 1.1fr 0.9fr auto; gap: 10px; margin-top: 16px;
}
.student-form input, .student-form select, .search input {
  background: rgba(255,255,255,0.02); color: var(--text); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; outline: none;
}
.student-form input:focus, .student-form select:focus { border-color: var(--orange); }
.table-panel { padding: 0; overflow: hidden; }
.toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); background: rgba(255,255,255,0.01);
}
.search {
  flex: 1; display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 10px; padding: 0 10px; background: rgba(255,255,255,0.01);
}
.search input { flex: 1; border: 0; background: transparent; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 14px 16px; border-bottom: 1px solid var(--line); }
th { text-align: left; color: var(--muted); font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; }
tbody tr { cursor: pointer; }
tbody tr:hover { background: rgba(255,255,255,0.02); }
.table-person { display: inline-flex; align-items: center; gap: 10px; }
.status { display: inline-flex; align-items: center; justify-content: center; padding: 6px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
.active-status { background: rgba(16, 185, 129, 0.15); color: var(--green); }

.cards-grid {
  display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 18px;
}
.workout-card {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; display: flex; flex-direction: column; gap: 12px; min-height: 220px;
}
.workout-card h2 { margin: 0; font-size: 1.2rem; }
.workout-card p { margin: 0; color: var(--muted); }
.workout-icon { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; font-size: 1.4rem; }
.workout-icon.c0 { background: rgba(255,122,61,0.12); color: var(--orange); }
.workout-icon.c1 { background: rgba(139,92,246,0.12); color: var(--purple); }
.workout-icon.c2 { background: rgba(16,185,129,0.12); color: var(--green); }
.pill { display: inline-flex; align-items: center; padding: 6px 8px; background: rgba(255,255,255,0.035); color: var(--muted); border-radius: 999px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.workout-meta { display: flex; justify-content: space-between; gap: 8px; color: var(--muted); font-size: 0.8rem; }
.add-card { align-items: center; justify-content: center; text-align: center; border-style: dashed; }
.add-plus { font-size: 2rem; color: var(--orange); }

.assessment-layout {
  display: grid; grid-template-columns: minmax(0,1.5fr) minmax(260px,0.8fr); gap: 18px;
}
.metric-list { display: flex; flex-direction: column; gap: 12px; }
.metric-row {
  display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,0.02);
}
.metric-row b { display: block; }
.metric-row small { color: var(--muted); }
.metric-values { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.metric-values span { color: var(--orange); font-weight: 700; }
.metric-values strong { color: var(--muted); font-size: 0.8rem; }
.insights { display: flex; flex-direction: column; gap: 12px; }
.insights > div { display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.orange-text { color: var(--orange); }

.calendar-panel { padding: 18px; }
.calendar-header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px;
}
.calendar-grid {
  display: grid; grid-template-columns: repeat(7, minmax(0,1fr)); gap: 8px;
}
.calendar-grid b { display: block; text-align: center; color: var(--muted); font-size: 0.74rem; padding-bottom: 6px; }
.calendar-day {
  border: 1px solid var(--line); border-radius: 10px; background: transparent; color: var(--text); height: 42px; font-weight: 700;
}
.calendar-day.today { background: rgba(255,122,61,0.12); border-color: var(--orange); color: var(--orange); }
.margin-top { margin-top: 18px; }

.modal-backdrop {
  position: fixed; inset: 0; background: rgba(5, 8, 12, 0.75); display: grid; place-items: center; padding: 20px; z-index: 30;
}
.modal {
  width: min(560px, 100%); background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 22px; position: relative; box-shadow: var(--shadow);
}
.modal-close { position: absolute; right: 14px; top: 14px; width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--line); background: transparent; color: var(--text); }
.modal-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; margin: 18px 0 20px;
}
.modal-grid div {
  background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 6px;
}
.modal-grid small { color: var(--muted); }
.modal-grid strong { font-size: 1.1rem; }

.toast {
  position: fixed; right: 24px; bottom: 24px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.5); color: #d7ffef; border-radius: 12px; padding: 12px 16px; box-shadow: var(--shadow); z-index: 40;
}

.auth-screen {
  min-height: 100vh; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at top, rgba(255,122,61,0.1), transparent 20%), var(--bg);
}
.auth-card {
  width: min(420px, 100%); background: var(--panel); border: 1px solid var(--line); border-radius: 24px; padding: 24px; box-shadow: var(--shadow);
  display: flex; flex-direction: column; gap: 16px;
}
.auth-card h1 { margin: 0; font-size: clamp(2rem, 4vw, 2.4rem); letter-spacing: -0.05em; }
.auth-card label {
  display: flex; flex-direction: column; gap: 8px; color: var(--muted); font-weight: 600; font-size: 0.85rem;
}
.auth-card input {
  background: rgba(255,255,255,0.02); color: var(--text); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; outline: none;
}
.auth-card input:focus { border-color: var(--orange); }
.error { margin: 0; color: #ffb4b4; font-size: 0.9rem; }
.muted { color: var(--muted); }
.loading { min-height: 180px; display: grid; place-items: center; color: var(--muted); }

@media (max-width: 980px) {
  .app-shell { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .content { padding: 18px 16px 32px; }
  .stats-grid, .cards-grid, .assessment-layout { grid-template-columns: 1fr 1fr; }
  .dashboard-grid { grid-template-columns: 1fr; }
  .student-form { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .stats-grid, .cards-grid, .assessment-layout { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .topbar { flex-wrap: wrap; }
  .mobile-brand { display: inline-flex; }
  .breadcrumb { display: none; }
}
