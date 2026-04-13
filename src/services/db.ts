// Database service - runs in renderer via IPC

const db = window.electronAPI

// ========== Subjects ==========

export async function createSubject(name: string, icon = '📖'): Promise<string> {
  const id = `subj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await db.dbRun(
    'INSERT INTO subjects (id, name, icon) VALUES (?, ?)',
    [id, name, icon],
  )
  return id
}

export async function getSubjects(): Promise<Subject[]> {
  return db.dbAll('SELECT * FROM subjects ORDER BY created_at DESC') as Promise<Subject[]>
}

export async function getSubject(id: string): Promise<Subject | null> {
  const result = await db.dbGet('SELECT * FROM subjects WHERE id = ?', [id])
  return (result as Subject) || null
}

export async function deleteSubject(id: string): Promise<void> {
  await db.dbRun('DELETE FROM subjects WHERE id = ?', [id])
}

// ========== Plans ==========

export async function createPlan(data: {
  id: string
  subjectId: string
  title: string
  sourceType: 'text' | 'pdf'
  sourceContent: string | null
  startDate: string
  endDate: string
}): Promise<void> {
  await db.dbRun(
    `INSERT INTO plans (id, subject_id, title, source_type, source_content, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [data.id, data.subjectId, data.title, data.sourceType, data.sourceContent, data.startDate, data.endDate],
  )
}

export async function getPlans(subjectId?: string): Promise<Plan[]> {
  if (subjectId) {
    return db.dbAll(
      'SELECT * FROM plans WHERE subject_id = ? ORDER BY created_at DESC',
      [subjectId],
    ) as Promise<Plan[]>
  }
  return db.dbAll('SELECT * FROM plans ORDER BY created_at DESC') as Promise<Plan[]>
}

export async function getPlan(id: string): Promise<Plan | null> {
  const result = await db.dbGet('SELECT * FROM plans WHERE id = ?', [id])
  return (result as Plan) || null
}

export async function updatePlan(id: string, data: Partial<Plan>): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      fields.push(`${col} = ?`)
      values.push(value)
    }
  }
  values.push(id)
  await db.dbRun(`UPDATE plans SET ${fields.join(', ')} WHERE id = ?`, values)
}

export async function deletePlan(id: string): Promise<void> {
  await db.dbRun('DELETE FROM plans WHERE id = ?', [id])
}

// ========== Daily Reports ==========

export async function createOrUpdateReport(data: {
  id: string
  planId: string
  date: string
  tasks?: string
}): Promise<void> {
  await db.dbRun(
    `INSERT INTO daily_reports (id, plan_id, date, tasks)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(plan_id, date) DO UPDATE SET tasks = excluded.tasks`,
    [data.id, data.planId, data.date, data.tasks || '[]'],
  )
}

export async function getReportsByPlan(planId: string): Promise<DailyReport[]> {
  return db.dbAll(
    'SELECT * FROM daily_reports WHERE plan_id = ? ORDER BY date ASC',
    [planId],
  ) as Promise<DailyReport[]>
}

export async function getReport(id: string): Promise<DailyReport | null> {
  const result = await db.dbGet('SELECT * FROM daily_reports WHERE id = ?', [id])
  if (!result) return null
  const report = result as DailyReport
  // Parse JSON fields
  report.tasks = typeof report.tasks === 'string' ? JSON.parse(report.tasks) : report.tasks
  report.link_ids = typeof report.link_ids === 'string' ? JSON.parse(report.link_ids) : report.link_ids
  return report
}

export async function updateReport(id: string, data: Partial<DailyReport>): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      fields.push(`${col} = ?`)
      values.push(typeof value === 'object' ? JSON.stringify(value) : value)
    }
  }
  values.push(id)
  await db.dbRun(`UPDATE daily_reports SET ${fields.join(', ')} WHERE id = ?`, values)
}

export async function getReportsByDateRange(start: string, end: string): Promise<DailyReport[]> {
  return db.dbAll(
    'SELECT * FROM daily_reports WHERE date BETWEEN ? AND ? ORDER BY date ASC',
    [start, end],
  ) as Promise<DailyReport[]>
}

// ========== Links ==========

export async function createLink(data: {
  id: string
  url: string
  title: string
  source: string
}): Promise<void> {
  await db.dbRun(
    'INSERT INTO links (id, url, title, source) VALUES (?, ?, ?, ?)',
    [data.id, data.url, data.title, data.source],
  )
}

export async function getLinks(): Promise<Link[]> {
  return db.dbAll('SELECT * FROM links ORDER BY created_at DESC') as Promise<Link[]>
}

export async function updateLinkFeedback(id: string, feedback: 'useful' | 'useless' | null): Promise<void> {
  await db.dbRun('UPDATE links SET feedback = ? WHERE id = ?', [feedback, id])
}

// ========== Config ==========

export async function getConfig(key: string): Promise<string | null> {
  return db.configGet(key)
}

export async function setConfig(key: string, value: string): Promise<void> {
  await db.configSet(key, value)
}

// ========== Types ==========

export interface Subject {
  id: string
  name: string
  icon: string
  created_at: string
}

export interface Plan {
  id: string
  subject_id: string
  title: string
  source_type: 'text' | 'pdf'
  source_content: string | null
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'paused'
  created_at: string
}

export interface DailyReport {
  id: string
  plan_id: string
  date: string
  tasks: Array<{ id: string; title: string; description: string; status: string; order: number }>
  link_ids: string[]
  notes: string
  summary: string | null
  completed_at: string | null
  study_duration: number
  created_at: string
}

export interface Link {
  id: string
  url: string
  title: string
  source: string
  feedback: 'useful' | 'useless' | null
  created_at: string
}
