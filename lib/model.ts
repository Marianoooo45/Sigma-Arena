// lib/model.ts
import db, { ensureMasteryAndActivity, tx } from "./db";

const SIG_A = 4.0;   // pente logistique
const BASE_K = 6.0;  // pas d'apprentissage
const EMA_ALPHA = 0.2;

type Row = {[k: string]: any};

function sigmoid(x:number){ return 1/(1+Math.exp(-x)); }

export function getAllCategories(): Row[] {
  return db.prepare(`
    SELECT c.*, 
      COALESCE(m.rating, 50.0) AS rating, 
      COALESCE(a.ema_activity, 0.0) AS ema_activity
    FROM categories c
    LEFT JOIN mastery m ON m.category_id=c.id
    LEFT JOIN activity_rollup a ON a.category_id=c.id
    WHERE c.active=1
    ORDER BY (CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END), name
  `).all();
}

export function currentWeights(): Row[] {
  const rows = getAllCategories();
  const scores = rows.map((r:Row) => {
    const comp = (0.5 + 0.5*(r.rating/100)) * (0.3 + 0.7*(r.ema_activity));
    return {...r, comp};
  });
  const total = scores.reduce((s:number,r:Row)=>s+(r.comp||0), 0) || 1;
  return scores.map((r:Row) => ({...r, current_weight: r.comp/total}));
}

export function nav(): number {
  const rows = db.prepare(`
    SELECT target_weight, COALESCE(m.rating,50.0) AS rating
    FROM categories c
    LEFT JOIN mastery m ON m.category_id=c.id
    WHERE c.active=1
  `).all();
  return rows.reduce((s:number, r:Row)=> s + r.target_weight*(r.rating), 0);
}

export function trackingError(): number {
  const rows = currentWeights();
  const sumsq = rows.reduce((s:number, r:Row) => {
    const diff = (r.current_weight || 0) - (r.target_weight || 0);
    return s + diff*diff;
  }, 0);
  return Math.sqrt(sumsq);
}

function expectedP(rating:number, difficulty:number){
  const d = 2*difficulty - 1; // 0..1 -> -1..1
  return sigmoid(SIG_A * ((rating/100) - d));
}

export function selectBatch(N=15): Row[] {
  const rows = currentWeights();
  const themeScores = rows.map((r:Row) => {
    const mastery = db.prepare(`SELECT rating_var FROM mastery WHERE category_id=?`).get(r.id) as Row | undefined;
    const rv = mastery?.rating_var ?? 50.0;
    const gap = (r.target_weight || 0) - (r.current_weight || 0);
    const priority = 0.6*Math.abs(gap) + 0.3*(rv/100) + 0.1*(1 - (r.ema_activity||0));
    return { id: r.id, priority };
  }).sort((a,b)=> b.priority - a.priority);

  const pool: Row[] = [];
  // top-3 catégories prioritaires : plus de questions
  for (const t of themeScores.slice(0,3)) {
    const rows = db.prepare(`
      SELECT id, category_id, difficulty FROM questions 
      WHERE category_id=? ORDER BY RANDOM() LIMIT 50
    `).all(t.id);
    pool.push(...rows);
  }
  // long tail
  for (const t of themeScores.slice(3)) {
    const rows = db.prepare(`
      SELECT id, category_id, difficulty FROM questions 
      WHERE category_id=? ORDER BY RANDOM() LIMIT 10
    `).all(t.id);
    pool.push(...rows);
  }
  // shuffle simple
  for (let i=pool.length-1;i>0;i--){
    const j = Math.floor(Math.random()* (i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, N);
}

export function openSession(): number {
  const nav0 = nav();
  const te0 = trackingError();
  const started = new Date().toISOString();
  const res = db.prepare(`
    INSERT INTO sessions(started_at, te_before, nav_before) VALUES (?,?,?)
  `).run(started, te0, nav0);
  return Number(res.lastInsertRowid);
}

export function loadQuestion(qid:number): Row {
  const row = db.prepare(`
    SELECT q.*, c.name AS category_name,
      COALESCE(m.rating,50.0) as rating
    FROM questions q
    JOIN categories c ON c.id=q.category_id
    LEFT JOIN mastery m ON m.category_id=c.id
    WHERE q.id=?
  `).get(qid) as Row;
  return row;
}

export function answerQuestion(sessionId:number, questionId:number, userCorrect:boolean, timeSec:number): Row {
  const q = db.prepare(`SELECT category_id, difficulty FROM questions WHERE id=?`).get(questionId) as Row;
  ensureMasteryAndActivity(q.category_id);

  const { rating, rating_var } = db.prepare(`
    SELECT rating, rating_var FROM mastery WHERE category_id=?
  `).get(q.category_id) as Row;

  const p = expectedP(rating, q.difficulty);
  let speedAdj = 0;
  if (timeSec <= 15) speedAdj = 0.5;
  else if (timeSec >= 60) speedAdj = -0.5;

  const K = BASE_K * (1 + rating_var/100) + speedAdj;
  const delta = K * ((userCorrect?1:0) - p);

  tx(() => {
    db.prepare(`
      UPDATE mastery SET rating=?, rating_var=?, last_reviewed=?
      WHERE category_id=?
    `).run(
      Math.max(0, Math.min(100, rating + delta)),
      Math.max(5, rating_var * 0.97),
      new Date().toISOString(),
      q.category_id
    );

    const actRow = db.prepare(`
      SELECT ema_activity, ema_perf FROM activity_rollup WHERE category_id=?
    `).get(q.category_id) as Row | undefined;
    const act = actRow?.ema_activity ?? 0;
    const perf = actRow?.ema_perf ?? 0.5;
    const actNew = (1-EMA_ALPHA)*act + EMA_ALPHA*1.0;
    const perfNew = (1-EMA_ALPHA)*perf + EMA_ALPHA*(userCorrect?1:0);
    db.prepare(`
      UPDATE activity_rollup SET ema_activity=?, ema_perf=? WHERE category_id=?
    `).run(actNew, perfNew, q.category_id);

    db.prepare(`
      INSERT INTO answers(session_id, question_id, category_id, correct, time_sec, rating_delta)
      VALUES (?,?,?,?,?,?)
    `).run(sessionId, questionId, q.category_id, userCorrect?1:0, timeSec, delta);
  });

  return { p, delta };
}

export function closeSession(sessionId:number){
  const nav1 = nav();
  const te1 = trackingError();
  const row = db.prepare(`SELECT nav_before, te_before FROM sessions WHERE id=?`).get(sessionId) as Row;
  const pnl = nav1 - (row?.nav_before ?? 0);
  db.prepare(`
    UPDATE sessions SET ended_at=?, te_after=?, nav_after=?, pnl=? WHERE id=?
  `).run(new Date().toISOString(), te1, nav1, pnl, sessionId);
  return { nav_before: row?.nav_before ?? 0, nav_after: nav1, pnl, te_before: row?.te_before ?? 0, te_after: te1 };
}
