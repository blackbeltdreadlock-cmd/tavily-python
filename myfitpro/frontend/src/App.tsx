import { useMemo, useState } from 'react'

type Page = 'inicio' | 'alunos' | 'treinos' | 'avaliacoes' | 'agenda'

type Student = {
  id: number
  name: string
  goal: string
  lastWorkout: string
  progress: number
  color: string
}

const students: Student[] = [
  { id: 1, name: 'Marina Souza', goal: 'Hipertrofia', lastWorkout: 'Hoje, 07:00', progress: 82, color: '#8b5cf6' },
  { id: 2, name: 'Rafael Lima', goal: 'Emagrecimento', lastWorkout: 'Ontem, 18:30', progress: 68, color: '#10b981' },
  { id: 3, name: 'Juliana Prado', goal: 'Longevidade', lastWorkout: 'Seg, 19:30', progress: 91, color: '#38bdf8' },
]

const nav: { id: Page; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Início', icon: '⌂' },
  { id: 'alunos', label: 'Alunos', icon: '♙' },
  { id: 'treinos', label: 'Treinos', icon: '▦' },
  { id: 'avaliacoes', label: 'Avaliações', icon: '◒' },
  { id: 'agenda', label: 'Agenda', icon: '□' },
]

function Brand() {
  return <div className="brand"><span className="brand-mark"><i /></span><span>MyFit <b>Pro</b></span></div>
}

function Stat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <article className={`stat-card ${tone}`}><span className="stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function App() {
  const [page, setPage] = useState<Page>('inicio')
  const [selected, setSelected] = useState<Student | null>(null)
  const [notice, setNotice] = useState('')

  const title = useMemo(() => ({ inicio: 'Bom dia, Alessandro', alunos: 'Alunos', treinos: 'Treinos', avaliacoes: 'Avaliações físicas', agenda: 'Agenda' }[page]), [page])
  const subtitle = page === 'inicio' ? 'Aqui está o resumo da sua operação hoje.' : 'Gerencie sua rotina e acompanhe resultados em um só lugar.'

  function action(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <Brand />
      <div className="workspace"><span className="avatar avatar-orange">AT</span><div><b>Alessandro Torres</b><small>Personal trainer</small></div><span className="chevron">⌄</span></div>
      <nav className="main-nav" aria-label="Navegação principal">
        {nav.map(item => <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item.id)}><span>{item.icon}</span>{item.label}</button>)}
      </nav>
      <div className="sidebar-bottom"><button className="nav-item"><span>⚙</span>Configurações</button><button className="nav-item"><span>?</span>Central de ajuda</button><div className="sidebar-footer">MyFit Pro v0.1 · Dados locais</div></div>
    </aside>

    <main className="content">
      <header className="topbar"><button className="mobile-brand"><Brand /></button><div className="breadcrumb">Painel <span>/</span> {title}</div><div className="top-actions"><button className="icon-button" aria-label="Notificações">♢<em>3</em></button><div className="profile"><span className="avatar avatar-orange">AT</span><span>Alessandro</span><b>⌄</b></div></div></header>
      <div className="page-header"><div><p className="eyebrow">Segunda-feira, 28 de setembro de 2026</p><h1>{title}</h1><p className="subtitle">{subtitle}</p></div><button className="button primary" onClick={() => action(page === 'alunos' ? 'Fluxo de novo aluno aberto.' : 'Ação registrada com sucesso.')}>＋ {page === 'alunos' ? 'Novo aluno' : 'Nova ação'}</button></div>

      {page === 'inicio' && <Dashboard onSelect={setSelected} onAction={action} />}
      {page === 'alunos' && <Students onSelect={setSelected} onAction={action} />}
      {page === 'treinos' && <Workouts onAction={action} />}
      {page === 'avaliacoes' && <Assessments onAction={action} />}
      {page === 'agenda' && <Schedule onAction={action} />}

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)}>×</button><span className="avatar large" style={{ background: selected.color }}>{selected.name.split(' ').map(part => part[0]).join('')}</span><p className="eyebrow">Perfil do aluno</p><h2>{selected.name}</h2><p className="subtitle">Objetivo: {selected.goal}</p><div className="modal-grid"><div><small>Adesão ao plano</small><strong>{selected.progress}%</strong></div><div><small>Último treino</small><strong>{selected.lastWorkout}</strong></div></div><button className="button primary full" onClick={() => { setSelected(null); action('Treino do aluno selecionado.') }}>Ver plano completo</button></section></div>}
      {notice && <div className="toast">✓ {notice}</div>}
    </main>
  </div>
}

function Dashboard({ onSelect, onAction }: { onSelect: (student: Student) => void; onAction: (message: string) => void }) {
  return <>
    <section className="stats-grid"><Stat label="Alunos ativos" value="24" detail="↑ 12% este mês" tone="orange" /><Stat label="Treinos esta semana" value="87" detail="↑ 8% vs. semana passada" tone="green" /><Stat label="Receita mensal" value="R$ 8.420" detail="3 pagamentos pendentes" tone="purple" /><Stat label="Adesão média" value="78%" detail="↑ 4,2% este mês" tone="blue" /></section>
    <section className="dashboard-grid"><div className="panel"><div className="panel-heading"><div><p className="eyebrow">Acompanhamento</p><h2>Alunos em destaque</h2></div><button className="text-button" onClick={() => onAction('Lista completa de alunos aberta.')}>Ver todos →</button></div><div className="student-list">{students.map(student => <button className="student-row" key={student.id} onClick={() => onSelect(student)}><span className="avatar" style={{ background: student.color }}>{student.name.split(' ').map(part => part[0]).join('')}</span><span className="student-info"><b>{student.name}</b><small>{student.goal} · Último treino: {student.lastWorkout}</small></span><span className="progress-wrap"><span className="progress-label">{student.progress}%</span><span className="progress"><i style={{ width: `${student.progress}%` }} /></span></span><span className="row-arrow">→</span></button>)}</div></div><div className="panel"><div className="panel-heading"><div><p className="eyebrow">Hoje</p><h2>Próximos horários</h2></div><button className="icon-button small" onClick={() => onAction('Novo horário criado.')}>＋</button></div><div className="schedule-list"><ScheduleItem time="07:00" name="Marina Souza" type="Treino presencial" color="#8b5cf6" /><ScheduleItem time="12:30" name="Rafael Lima" type="Avaliação física" color="#10b981" /><ScheduleItem time="18:30" name="Juliana Prado" type="Treino online" color="#38bdf8" /></div><button className="button ghost full" onClick={() => onAction('Agenda completa aberta.')}>Ver agenda completa</button></div></section>
    <section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">Performance</p><h2>Volume de treino</h2></div><select aria-label="Período"><option>Últimos 30 dias</option><option>Últimos 90 dias</option></select></div><div className="chart"><div className="chart-y"><span>12k</span><span>8k</span><span>4k</span><span>0</span></div><div className="chart-area"><div className="grid-lines"><i /><i /><i /><i /></div><svg viewBox="0 0 700 220" preserveAspectRatio="none" role="img" aria-label="Gráfico de volume de treino"><path d="M0 180 C55 164,70 130,120 148 S180 181,230 125 S280 92,330 112 S385 90,430 100 S480 55,535 76 S600 20,700 38" fill="none" stroke="#ff6b35" strokeWidth="4" strokeLinecap="round" /><path d="M0 180 C55 164,70 130,120 148 S180 181,230 125 S280 92,330 112 S385 90,430 100 S480 55,535 76 S600 20,700 38 V220 H0 Z" fill="url(#area)" opacity=".28" /><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#ff6b35" /><stop offset="1" stopColor="#ff6b35" stopOpacity="0" /></linearGradient></defs></svg><div className="chart-x"><span>01 set</span><span>08 set</span><span>15 set</span><span>22 set</span><span>28 set</span></div></div></div></section>
  </>
}

function ScheduleItem({ time, name, type, color }: { time: string; name: string; type: string; color: string }) { return <div className="schedule-item"><strong>{time}</strong><span className="avatar small" style={{ background: color }}>{name.split(' ').map(part => part[0]).join('')}</span><span><b>{name}</b><small>{type}</small></span><i>⋮</i></div> }

function Students({ onSelect, onAction }: { onSelect: (student: Student) => void; onAction: (message: string) => void }) { return <section className="panel table-panel"><div className="toolbar"><div className="search">⌕<input placeholder="Buscar aluno..." /></div><select aria-label="Filtrar objetivo"><option>Todos os objetivos</option><option>Hipertrofia</option><option>Emagrecimento</option></select><button className="button ghost" onClick={() => onAction('Filtro aplicado.')}>Filtrar</button></div><div className="table-wrap"><table><thead><tr><th>Aluno</th><th>Objetivo</th><th>Último treino</th><th>Adesão</th><th>Status</th><th /></tr></thead><tbody>{students.map(student => <tr key={student.id} onClick={() => onSelect(student)}><td><span className="table-person"><span className="avatar small" style={{ background: student.color }}>{student.name.split(' ').map(part => part[0]).join('')}</span><b>{student.name}</b></span></td><td>{student.goal}</td><td>{student.lastWorkout}</td><td><span className="table-progress"><i style={{ width: `${student.progress}%` }} />{student.progress}%</span></td><td><span className="status active-status">Ativo</span></td><td>•••</td></tr>)}</tbody></table></div></section> }

function Workouts({ onAction }: { onAction: (message: string) => void }) { return <section className="cards-grid">{['Peito & Tríceps', 'Costas & Bíceps', 'Pernas & Ombros'].map((name, index) => <article className="workout-card" key={name}><div className={`workout-icon c${index}`}>▦</div><span className="pill">TREINO {String.fromCharCode(65 + index)}</span><h2>{name}</h2><p>{index === 0 ? 'Marina Souza' : index === 1 ? 'Rafael Lima' : 'Juliana Prado'}</p><div className="workout-meta"><span>▦ {index === 1 ? 6 : 8} exercícios</span><span>◷ {index === 2 ? 52 : 45} min</span></div><button className="button ghost full" onClick={() => onAction(`Ficha ${name} aberta.`)}>Editar ficha</button></article>)}<article className="workout-card add-card" onClick={() => onAction('Criador de ficha aberto.')}><span className="add-plus">＋</span><h2>Nova ficha</h2><p>Monte um treino personalizado para seu aluno.</p></article></section> }

function Assessments({ onAction }: { onAction: (message: string) => void }) { return <section className="assessment-layout"><div className="panel"><div className="panel-heading"><div><p className="eyebrow">Composição corporal</p><h2>Evolução média</h2></div><button className="button ghost" onClick={() => onAction('Nova avaliação aberta.')}>＋ Registrar avaliação</button></div><div className="metric-highlight"><strong>−3,8%</strong><span>gordura corporal média</span><small>Últimos 90 dias</small></div><div className="mini-bars"><i style={{ height: '72%' }} /><i style={{ height: '64%' }} /><i style={{ height: '58%' }} /><i style={{ height: '46%' }} /><i style={{ height: '39%' }} /><i style={{ height: '31%' }} /></div></div><div className="panel insights"><p className="eyebrow">Resumo</p><h2>Indicadores importantes</h2><div><span>Alunos avaliados este mês</span><b>18/24</b></div><div><span>Meta de perda de gordura</span><b className="green-text">72%</b></div><div><span>Reavaliações pendentes</span><b className="orange-text">4</b></div><button className="button primary full" onClick={() => onAction('Relatório de avaliações gerado.')}>Gerar relatório</button></div></section> }

function Schedule({ onAction }: { onAction: (message: string) => void }) { return <section className="panel calendar-panel"><div className="calendar-header"><button className="icon-button">‹</button><h2>Setembro 2026</h2><button className="icon-button">›</button><button className="button primary" onClick={() => onAction('Novo atendimento agendado.')}>＋ Agendar horário</button></div><div className="calendar-grid">{['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(day => <b key={day}>{day}</b>)}{Array.from({ length: 30 }, (_, index) => <button className={index === 27 ? 'calendar-day today' : 'calendar-day'} key={index}>{index + 1}{[2, 8, 15, 22, 27].includes(index) && <i />}</button>)}</div></section> }

export default App
