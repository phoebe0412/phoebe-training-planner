import { useEffect, useState } from 'react';
import { TRAINING_SYNC_URL } from './config';

const PROGRAM_VERSION = 'experience-plan-2026-09-08';
const PROGRAM = [
  ['', 'KAT 整合呼吸', '5', '2', '次', '平躺腳抬高 90 度、骨盆後傾呼吸；每次慢吸長吐'],
  ['', '死蟲式（Dead Bug）', '6', '2', '下', '每側 6 下；專注肋骨下沉與骨盆中立'],
  ['', '大象漫步（Elephant Walk）', '15–20', '1', '下', '每側；快速鬆開後側鏈'],
  ['', '脛前肌上提（Tibialis Raise）', '20', '2', '次', '與下一動作連續進行'],
  ['', '斜板深蹲自重啟動（Slant Board Squat）', '15', '2', '次', '與脛前肌上提組成超級組'],
  ['', 'ATG 分腿蹲（ATG Split Squat）', '8', '3', '下', '每側；組間休息 90 秒，抓滿行程與後腳髖伸'],
  ['', '輔助式北歐挺身（Assisted Nordic Curl）', '6', '3', '下', '專注膕繩肌離心控制'],
  ['', '滑輪下拉', '8–10', '3', '下', '與壺鈴單手農夫走路組成超級組'],
  ['', '壺鈴單手農夫走路', '30', '3', '公尺', '每側；作為背部組間的抗側屈核心訓練'],
  ['', '俯身啞鈴划船', '8–10', '2–3', '下', '支撐式或雙手，注意避免下背代償'],
  ['', '沙發伸展（Couch Stretch）', '60', '2', '秒', '每側；徹底打開深層髖屈肌與股直肌'],
];

const makePlan = () => PROGRAM.map(([section, name, reps, sets, unit, note]) => ({ id: `exercise-${crypto.randomUUID()}`, section, name, reps, sets, unit, note, weight: '' }));
const initialStudents = [
  { id: 'demo-1', name: '林安妮', goal: '改善久坐與肩頸僵硬', plan: makePlan() },
  { id: 'demo-2', name: '王子維', goal: '建立下肢力量與膝蓋耐受', plan: makePlan() },
];

function useStudents() {
  const [students, setStudents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phoebe-training-students')) || initialStudents; } catch { return initialStudents; }
  });
  useEffect(() => localStorage.setItem('phoebe-training-students', JSON.stringify(students)), [students]);
  return [students, setStudents];
}

function useSessions() {
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phoebe-training-sessions')) || []; } catch { return []; }
  });
  useEffect(() => localStorage.setItem('phoebe-training-sessions', JSON.stringify(sessions)), [sessions]);
  return [sessions, setSessions];
}

const newSessionDraft = () => ({ id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString().slice(0, 10), time: '10:00', record: '' });

function useSessionDrafts() {
  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phoebe-session-drafts')) || {}; } catch { return {}; }
  });
  useEffect(() => localStorage.setItem('phoebe-session-drafts', JSON.stringify(drafts)), [drafts]);
  return [drafts, setDrafts];
}

function useSharedPlan() {
  const [plan, setPlan] = useState(() => {
    try {
      const savedVersion = localStorage.getItem('phoebe-shared-training-plan-version');
      if (savedVersion === PROGRAM_VERSION) return JSON.parse(localStorage.getItem('phoebe-shared-training-plan')) || makePlan();
    } catch { /* 使用新版預設課表 */ }
    localStorage.setItem('phoebe-shared-training-plan-version', PROGRAM_VERSION);
    return makePlan();
  });
  useEffect(() => localStorage.setItem('phoebe-shared-training-plan', JSON.stringify(plan)), [plan]);
  return [plan, setPlan];
}

function useStudentTrainingValues() {
  const [values, setValues] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phoebe-student-training-values')) || {}; } catch { return {}; }
  });
  useEffect(() => localStorage.setItem('phoebe-student-training-values', JSON.stringify(values)), [values]);
  return [values, setValues];
}

function StudentModal({ mode, student, onClose, onSave }) {
  const [form, setForm] = useState({ name: student?.name || '', goal: student?.goal || '' });
  const submit = (event) => { event.preventDefault(); if (form.name.trim()) onSave({ name: form.name.trim(), goal: form.goal.trim() || '尚未設定訓練重點' }); };
  return <div className="modal-backdrop"><form className="student-modal" onSubmit={submit}><button className="modal-close" type="button" onClick={onClose} aria-label="關閉">×</button><p className="overline">{mode === 'new' ? '新增學員' : '編輯學員'}</p><h2>{mode === 'new' ? '建立個別課表' : '更新學員資料'}</h2><label>學員姓名<input autoFocus value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="例如：陳小美" /></label><label>本次訓練重點<input value={form.goal} onChange={(e) => setForm((prev) => ({ ...prev, goal: e.target.value }))} placeholder="例如：肩頸放鬆、下肢穩定" /></label><button type="submit">{mode === 'new' ? '建立課表' : '儲存修改'}</button></form></div>;
}

export function App() {
  const [students, setStudents] = useStudents();
  const [sessions, setSessions] = useSessions();
  const [sessionDrafts, setSessionDrafts] = useSessionDrafts();
  const [sharedPlan, setSharedPlan] = useSharedPlan();
  const [studentTrainingValues, setStudentTrainingValues] = useStudentTrainingValues();
  const [selectedId, setSelectedId] = useState(students[0]?.id || '');
  const [modal, setModal] = useState('');
  const [view, setView] = useState('training');
  const [dragIndex, setDragIndex] = useState(null);
  const student = students.find((item) => item.id === selectedId) || students[0];
  const sessionDraft = sessionDrafts[student?.id] || newSessionDraft();
  const updateSessionDraft = (patch) => setSessionDrafts((drafts) => ({ ...drafts, [student.id]: { ...sessionDraft, ...patch } }));
  const studentPlan = sharedPlan.map((exercise) => ({ ...exercise, ...(studentTrainingValues[student?.id]?.[exercise.id] || {}) }));
  const [saveState, setSaveState] = useState('');
  const updateSharedExercise = (index, key, value) => setSharedPlan((plan) => plan.map((exercise, i) => i === index ? { ...exercise, [key]: value } : exercise));
  const updateStudentExercise = (exerciseId, key, value) => setStudentTrainingValues((allValues) => ({ ...allValues, [student.id]: { ...allValues[student.id], [exerciseId]: { ...allValues[student.id]?.[exerciseId], [key]: value } } }));
  const addExercise = () => setSharedPlan((plan) => [...plan, { id: `exercise-${crypto.randomUUID()}`, section: '共用課表', name: '新動作', reps: '8', sets: '3', unit: '下', note: '', weight: '' }]);
  const deleteExercise = (index) => setSharedPlan((plan) => plan.filter((_, i) => i !== index));
  const moveExerciseTo = (from, to) => {
    if (from === to || from == null || to == null) return;
    setSharedPlan((plan) => { const nextPlan = [...plan]; const [exercise] = nextPlan.splice(from, 1); nextPlan.splice(to, 0, exercise); return nextPlan; });
  };
  const saveToSheets = async () => {
    setSaveState('儲存中…');
    const nextSession = { ...sessionDraft, studentId: student.id, studentName: student.name, goal: student.goal };
    setSessions((items) => [...items.filter((item) => item.id !== nextSession.id), nextSession]);
    if (!TRAINING_SYNC_URL) { setSaveState('已儲存於本機'); return; }
    try {
      await Promise.all([
        fetch(TRAINING_SYNC_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'appendTraining', student: { ...student, plan: studentPlan } }) }),
        fetch(TRAINING_SYNC_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'appendSession', session: nextSession }) }),
      ]);
      setSaveState('已同步至 Google Sheets');
    } catch { setSaveState('已儲存於本機；Google Sheets 同步失敗'); }
  };
  const saveStudent = (form) => {
    if (modal === 'new') { const next = { id: `student-${Date.now()}`, ...form, plan: makePlan() }; setStudents((items) => [...items, next]); setSelectedId(next.id); }
    else setStudents((items) => items.map((item) => item.id === student.id ? { ...item, ...form } : item));
    setModal('');
  };
  const deleteStudent = () => {
    if (!window.confirm(`確定刪除「${student.name}」及其所有訓練紀錄嗎？`)) return;
    const remaining = students.filter((item) => item.id !== student.id);
    setStudents(remaining); setSelectedId(remaining[0]?.id || '');
  };
  if (!student) return <main className="empty-state"><h1>先新增第一位學員</h1><button onClick={() => setModal('new')}>＋ 新增學員</button>{modal && <StudentModal mode="new" onClose={() => setModal('')} onSave={saveStudent} />}</main>;
  const sortedSessions = [...sessions].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return <main className="training-shell">
    <header className="app-topbar"><a className="brand" href="#top">PHOEBE <span>COACHING</span></a><nav className="app-tabs"><button className={view === 'training' ? 'nav-active' : ''} type="button" onClick={() => setView('training')}>課表</button><button className={view === 'calendar' ? 'nav-active' : ''} type="button" onClick={() => setView('calendar')}>行事曆</button></nav><div className="coach-avatar">P</div></header>
    {view === 'calendar' ? <section className="calendar-page"><div className="calendar-heading"><div><p className="overline">上課紀錄</p><h1>學員行事曆</h1></div><span>{sessions.length} 堂課</span></div>{sortedSessions.length ? <div className="session-list">{sortedSessions.map((session) => <article className="session-card" key={session.id}><time><strong>{new Date(`${session.date}T00:00:00`).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</strong><span>{new Date(`${session.date}T00:00:00`).toLocaleDateString('zh-TW', { weekday: 'short' })}</span></time><div><h2>{session.studentName}</h2><p>{session.time} ・ {session.goal}</p>{session.record && <p className="session-record">{session.record}</p>}</div><button type="button" onClick={() => setSessions((items) => items.filter((item) => item.id !== session.id))} aria-label="刪除課程紀錄">×</button></article>)}</div> : <div className="calendar-empty"><p>還沒有上課紀錄。</p><button type="button" onClick={() => setView('training')}>回到課表安排課程</button></div>}</section> : <>
    <div className="app-layout" id="top">
      <aside className="student-sidebar"><div className="sidebar-label"><span>學員名單</span><button type="button" onClick={() => setModal('new')} aria-label="新增學員">＋</button></div><div className="student-list">{students.map((item) => <button key={item.id} type="button" className={`student-item ${item.id === student.id ? 'selected' : ''}`} onClick={() => setSelectedId(item.id)}><span className="student-initial">{item.name.slice(0, 1)}</span><strong>{item.name}</strong></button>)}</div></aside>
      <section className="program-area"><div className="program-heading"><div><p className="overline">{student.name}・{student.goal}</p></div><div className="program-actions"><button type="button" className="quiet-button" onClick={() => setModal('edit')}>編輯學員</button><button type="button" className="delete-button" onClick={deleteStudent}>刪除</button></div></div>
        <div className="session-note"><span>本次課程</span><input aria-label="上課日期" type="date" value={sessionDraft.date} onChange={(e) => updateSessionDraft({ date: e.target.value })} /><input aria-label="上課時間" type="time" value={sessionDraft.time} onChange={(e) => updateSessionDraft({ time: e.target.value })} /><textarea aria-label="上課紀錄" value={sessionDraft.record} onChange={(e) => updateSessionDraft({ record: e.target.value })} placeholder="上課紀錄（選填）" /></div>
        <section className="program-section no-section-title"><div className="exercise-head"><span>動作</span><span>重量</span><span>次數</span><span>組數</span></div>{studentPlan.map((exercise, index) => <div className={`exercise-row ${dragIndex === index ? 'is-dragging' : ''}`} key={exercise.id || index} onDragOver={(event) => event.preventDefault()} onDrop={() => { moveExerciseTo(dragIndex, index); setDragIndex(null); }}><div className="exercise-title"><input className="exercise-name" value={exercise.name} onChange={(e) => updateSharedExercise(index, 'name', e.target.value)} aria-label="動作名稱" /><input className="exercise-description" value={exercise.note} onChange={(e) => updateSharedExercise(index, 'note', e.target.value)} placeholder="動作敘述（選填）" aria-label="動作敘述" /></div><label className="metric"><input inputMode="decimal" value={exercise.weight} onChange={(e) => updateStudentExercise(exercise.id, 'weight', e.target.value)} placeholder="—" /><span>kg</span></label><label className="metric"><input value={exercise.reps} onChange={(e) => updateStudentExercise(exercise.id, 'reps', e.target.value)} /><span>{exercise.unit}</span></label><label className="metric"><input inputMode="numeric" value={exercise.sets} onChange={(e) => updateStudentExercise(exercise.id, 'sets', e.target.value)} /><span>組</span></label><div className="row-controls"><button className="drag-handle" type="button" draggable onDragStart={() => setDragIndex(index)} onDragEnd={() => setDragIndex(null)} aria-label={`拖拉排序 ${exercise.name}`}>⠿</button><button className="delete-exercise" type="button" onClick={() => deleteExercise(index)} aria-label={`刪除 ${exercise.name}`}>×</button></div></div>)}</section>
        <button className="add-exercise-bottom" type="button" onClick={addExercise}>＋ 新增動作</button>
        <div className="finish-card"><div><p className="overline">手動儲存</p><h2>完成本次調整後儲存</h2><p>{saveState || '重量、次數與組數會保留在此手機，並同步至 Google Sheets。'}</p></div><button type="button" onClick={saveToSheets}>儲存課表</button></div>
      </section>
    </div></>}
    {modal && <StudentModal mode={modal} student={modal === 'edit' ? student : null} onClose={() => setModal('')} onSave={saveStudent} />}
  </main>;
}
