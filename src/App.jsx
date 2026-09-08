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
const EXPERIENCE_CLASS = { id: 'experience-class', name: '體驗課', goal: '體驗課課表' };

const newSessionDraft = () => ({ id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString().slice(0, 10), time: '10:00', record: '' });

function useSessionDraft() {
  const [draft, setDraft] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phoebe-experience-session-draft')) || newSessionDraft(); } catch { return newSessionDraft(); }
  });
  useEffect(() => localStorage.setItem('phoebe-experience-session-draft', JSON.stringify(draft)), [draft]);
  return [draft, setDraft];
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

function useTrainingValues() {
  const [values, setValues] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phoebe-experience-training-values')) || {}; } catch { return {}; }
  });
  useEffect(() => localStorage.setItem('phoebe-experience-training-values', JSON.stringify(values)), [values]);
  return [values, setValues];
}

export function App() {
  const [sessionDraft, setSessionDraft] = useSessionDraft();
  const [sharedPlan, setSharedPlan] = useSharedPlan();
  const [trainingValues, setTrainingValues] = useTrainingValues();
  const [dragIndex, setDragIndex] = useState(null);
  const updateSessionDraft = (patch) => setSessionDraft((draft) => ({ ...draft, ...patch }));
  const experiencePlan = sharedPlan.map((exercise) => ({ ...exercise, ...(trainingValues[exercise.id] || {}) }));
  const [saveState, setSaveState] = useState('');
  const updateSharedExercise = (index, key, value) => setSharedPlan((plan) => plan.map((exercise, i) => i === index ? { ...exercise, [key]: value } : exercise));
  const updateTrainingValue = (exerciseId, key, value) => setTrainingValues((allValues) => ({ ...allValues, [exerciseId]: { ...allValues[exerciseId], [key]: value } }));
  const addExercise = () => setSharedPlan((plan) => [...plan, { id: `exercise-${crypto.randomUUID()}`, section: '共用課表', name: '新動作', reps: '8', sets: '3', unit: '下', note: '', weight: '' }]);
  const deleteExercise = (index) => setSharedPlan((plan) => plan.filter((_, i) => i !== index));
  const moveExerciseTo = (from, to) => {
    if (from === to || from == null || to == null) return;
    setSharedPlan((plan) => { const nextPlan = [...plan]; const [exercise] = nextPlan.splice(from, 1); nextPlan.splice(to, 0, exercise); return nextPlan; });
  };
  const saveToSheets = async () => {
    setSaveState('儲存中…');
    const nextSession = { ...sessionDraft, studentId: EXPERIENCE_CLASS.id, studentName: EXPERIENCE_CLASS.name, goal: EXPERIENCE_CLASS.goal };
    if (!TRAINING_SYNC_URL) { setSaveState('已儲存於本機'); return; }
    try {
      await Promise.all([
        fetch(TRAINING_SYNC_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'appendTraining', student: { ...EXPERIENCE_CLASS, plan: experiencePlan } }) }),
        fetch(TRAINING_SYNC_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'appendSession', session: nextSession }) }),
      ]);
      setSaveState('已同步至 Google Sheets');
    } catch { setSaveState('已儲存於本機；Google Sheets 同步失敗'); }
  };
  return <main className="training-shell">
    <header className="app-topbar"><a className="brand" href="#top">PHOEBE <span>COACHING</span></a><div className="coach-avatar">P</div></header>
    <div className="app-layout single-program" id="top">
      <section className="program-area"><div className="program-heading"><div><p className="overline">體驗課</p></div></div>
        <div className="session-note"><span>本次課程</span><input aria-label="上課日期" type="date" value={sessionDraft.date} onChange={(e) => updateSessionDraft({ date: e.target.value })} /><input aria-label="上課時間" type="time" value={sessionDraft.time} onChange={(e) => updateSessionDraft({ time: e.target.value })} /><textarea aria-label="上課紀錄" value={sessionDraft.record} onChange={(e) => updateSessionDraft({ record: e.target.value })} placeholder="上課紀錄（選填）" /></div>
        <section className="program-section no-section-title"><div className="exercise-head"><span>動作</span><span>重量</span><span>次數</span><span>組數</span></div>{experiencePlan.map((exercise, index) => <div className={`exercise-row ${dragIndex === index ? 'is-dragging' : ''}`} key={exercise.id || index} onDragOver={(event) => event.preventDefault()} onDrop={() => { moveExerciseTo(dragIndex, index); setDragIndex(null); }}><div className="exercise-title"><input className="exercise-name" value={exercise.name} onChange={(e) => updateSharedExercise(index, 'name', e.target.value)} aria-label="動作名稱" /><input className="exercise-description" value={exercise.note} onChange={(e) => updateSharedExercise(index, 'note', e.target.value)} placeholder="動作敘述（選填）" aria-label="動作敘述" /></div><label className="metric"><input inputMode="decimal" value={exercise.weight} onChange={(e) => updateTrainingValue(exercise.id, 'weight', e.target.value)} placeholder="—" /><span>kg</span></label><label className="metric"><input value={exercise.reps} onChange={(e) => updateTrainingValue(exercise.id, 'reps', e.target.value)} /><span>{exercise.unit}</span></label><label className="metric"><input inputMode="numeric" value={exercise.sets} onChange={(e) => updateTrainingValue(exercise.id, 'sets', e.target.value)} /><span>組</span></label><div className="row-controls"><button className="drag-handle" type="button" draggable onDragStart={() => setDragIndex(index)} onDragEnd={() => setDragIndex(null)} aria-label={`拖拉排序 ${exercise.name}`}>⠿</button><button className="delete-exercise" type="button" onClick={() => deleteExercise(index)} aria-label={`刪除 ${exercise.name}`}>×</button></div></div>)}</section>
        <button className="add-exercise-bottom" type="button" onClick={addExercise}>＋ 新增動作</button>
        <div className="finish-card"><div><p className="overline">手動儲存</p><h2>完成本次調整後儲存</h2><p>{saveState || '重量、次數與組數會保留在此手機，並同步至 Google Sheets。'}</p></div><button type="button" onClick={saveToSheets}>儲存課表</button></div>
      </section>
    </div>
  </main>;
}
