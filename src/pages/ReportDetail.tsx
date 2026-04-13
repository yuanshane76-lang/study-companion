import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as db from '../services/db'
import { generateRecommendLinks, adjustPlan } from '../services/ai'
import './ReportDetail.css'

export default function ReportDetail() {
  const { id } = useParams()
  const [report, setReport] = useState<db.DailyReport | null>(null)
  const [plan, setPlan] = useState<db.Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState<db.Link[]>([])
  const [linksLoading, setLinksLoading] = useState(false)
  const [adjusting, setAdjusting] = useState(false)

  // Timer state
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  // Editable fields
  const [notes, setNotes] = useState('')
  const [summary, setSummary] = useState('')

  // Load report
  useEffect(() => {
    async function loadData() {
      if (!id) return
      setLoading(true)
      try {
        const r = await db.getReport(id)
        setReport(r)
        if (r) {
          setNotes(r.notes || '')
          setSummary(r.summary || '')
          setElapsed((r.study_duration || 0) * 1000)

          const p = await db.getPlan(r.plan_id)
          setPlan(p)

          // Load links for this report
          const allLinks = await db.getLinks()
          // Filter links that are associated with this report (by link_ids)
          const reportLinkIds = r.link_ids || []
          const reportLinks = allLinks.filter((l) => reportLinkIds.includes(l.id))
          setLinks(reportLinks)
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  // Generate recommended links
  const handleGenerateLinks = async () => {
    if (!report || !plan) return
    setLinksLoading(true)
    try {
      // Get today's task titles as topic
      const topics = (report.tasks || []).map((t) => t.title).join('、') || plan.title
      const aiLinks = await generateRecommendLinks(topics)

      // Save links to DB and associate with report
      const linkIds: string[] = []
      for (const link of aiLinks) {
        const linkId = `link_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        await db.createLink({ id: linkId, ...link })
        linkIds.push(linkId)
      }

      await db.updateReport(report.id, { link_ids: linkIds })
      const allLinks = await db.getLinks()
      setLinks(allLinks.filter((l) => linkIds.includes(l.id)))
    } catch (e) {
      console.error('生成链接失败:', e)
    } finally {
      setLinksLoading(false)
    }
  }

  // Link feedback
  const handleLinkFeedback = async (linkId: string, feedback: 'useful' | 'useless') => {
    await db.updateLinkFeedback(linkId, feedback)
    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, feedback } : l)))
  }

  // Trigger plan adjustment
  const handleAdjustPlan = async () => {
    if (!plan || !report) return
    setAdjusting(true)
    try {
      // Get all reports for this plan
      const allReports = await db.getReportsByPlan(plan.id)

      // Find incomplete reports before today
      const incompleteReports = allReports
        .filter((r) => r.date < report.date && !r.summary)
        .map((r) => ({ date: r.date, summary: r.summary }))

      // Find remaining tasks (future reports with pending tasks)
      const futureReports = allReports.filter((r) => r.date >= report.date)
      const remainingTasks = futureReports.flatMap((r) =>
        (r.tasks || [])
          .filter((t) => t.status === 'pending')
          .map((t) => ({ title: t.title, date: r.date })),
      )

      if (incompleteReports.length === 0 && remainingTasks.length === 0) {
        setAdjusting(false)
        return
      }

      const adjustedTasks = await adjustPlan(
        incompleteReports,
        remainingTasks.map((t) => ({ title: t.title, date: t.date })),
      )

      // Reassign tasks to future dates
      const dates = futureReports.map((r) => r.date)
      const tasksPerDay = Math.max(1, Math.ceil(adjustedTasks.length / dates.length))

      for (let i = 0; i < futureReports.length; i++) {
        const dayTasks = adjustedTasks.slice(i * tasksPerDay, (i + 1) * tasksPerDay).map((t, idx) => ({
          id: `task_adj_${Date.now()}_${i}_${idx}`,
          title: t.title,
          description: '',
          status: 'pending' as const,
          order: idx,
        }))
        await db.updateReport(futureReports[i].id, { tasks: dayTasks as any })
      }

      // Reload reports
      const r = await db.getReport(id!)
      if (r) {
        r.tasks = typeof r.tasks === 'string' ? JSON.parse(r.tasks) : r.tasks
        setReport(r)
      }
    } catch (e) {
      console.error('计划调整失败:', e)
    } finally {
      setAdjusting(false)
    }
  }

  // Timer functions
  const startTimer = useCallback(() => {
    setIsRunning(true)
    startTimeRef.current = Date.now() - elapsed
    intervalRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current)
    }, 1000)
  }, [elapsed])

  const pauseTimer = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (report) {
      const totalSeconds = Math.floor(elapsed / 1000)
      db.updateReport(report.id, { study_duration: totalSeconds })
    }
  }, [elapsed, report])

  const resetTimer = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setElapsed(0)
    if (report) {
      db.updateReport(report.id, { study_duration: 0 })
    }
  }, [report])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Save notes
  const saveNotes = async (value: string) => {
    setNotes(value)
    if (report) {
      await db.updateReport(report.id, { notes: value })
    }
  }

  // Save summary (mark as complete if >= 10 chars)
  const saveSummary = async (value: string) => {
    setSummary(value)
    if (report) {
      const isComplete = value.trim().length >= 10
      await db.updateReport(report.id, {
        summary: isComplete ? value : (value.trim().length > 0 ? value : null),
        completed_at: isComplete ? new Date().toISOString() : null,
      })
      setReport({ ...report, summary: isComplete ? value : (value.trim().length > 0 ? value : null) })
    }
  }

  // Toggle task status
  const toggleTask = async (taskId: string) => {
    if (!report) return
    const tasks = (report.tasks || []).map((t) => {
      if (t.id === taskId) {
        return { ...t, status: t.status === 'done' ? 'pending' : 'done' }
      }
      return t
    })
    await db.updateReport(report.id, { tasks: tasks as any })
    setReport({ ...report, tasks })
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const summaryLength = summary.trim().length
  const isComplete = summaryLength >= 10

  if (loading) {
    return <div className="report-page loading">加载中...</div>
  }

  if (!report) {
    return <div className="report-page empty">日报不存在</div>
  }

  const tasks = report.tasks || []

  return (
    <div className="report-page">
      <div className="report-header">
        <div className="report-title">
          <Link to={`/subjects/${plan?.subject_id}`} className="back-link">← 返回</Link>
          <h1>{report.date}</h1>
          {plan && <p className="report-plan">{plan.title}</p>}
        </div>

        {/* 计时器 */}
        <div className="timer">
          <span className="timer-display">{formatTime(elapsed)}</span>
          {!isRunning ? (
            <button className="timer-btn start" onClick={startTimer}>
              开始
            </button>
          ) : (
            <button className="timer-btn pause" onClick={pauseTimer}>
              暂停
            </button>
          )}
          {elapsed > 0 && !isRunning && (
            <button className="timer-btn reset" onClick={resetTimer}>
              重置
            </button>
          )}
        </div>
      </div>

      <div className="report-body">
        {/* 今日任务 */}
        <section className="report-section">
          <div className="section-header">
            <h2>📋 今日任务</h2>
            <button
              className="btn-adjust"
              onClick={handleAdjustPlan}
              disabled={adjusting}
              title="AI 根据完成情况调整后续计划"
            >
              {adjusting ? '调整中...' : '🔄 AI 调整计划'}
            </button>
          </div>
          {tasks.length > 0 ? (
            <div className="task-list">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`task-item ${task.status === 'done' ? 'done' : ''}`}
                  onClick={() => toggleTask(task.id)}
                >
                  <span className="task-checkbox">
                    {task.status === 'done' ? '☑' : '☐'}
                  </span>
                  <div className="task-content">
                    <span className="task-title">{task.title}</span>
                    {task.description && (
                      <span className="task-desc">{task.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="section-empty">今日暂无任务</div>
          )}
        </section>

        {/* 推荐链接 */}
        <section className="report-section">
          <div className="section-header">
            <h2>🔗 推荐链接</h2>
            <button
              className="btn-generate-links"
              onClick={handleGenerateLinks}
              disabled={linksLoading}
            >
              {linksLoading ? '生成中...' : '✨ 生成推荐'}
            </button>
          </div>
          {links.length > 0 ? (
            <div className="links-list">
              {links.map((link) => (
                <div key={link.id} className="link-item">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-title">
                    {link.title}
                  </a>
                  <span className="link-source">{link.source}</span>
                  <div className="link-feedback">
                    <button
                      className={`feedback-btn ${link.feedback === 'useful' ? 'active useful' : ''}`}
                      onClick={() => handleLinkFeedback(link.id, 'useful')}
                    >
                      👍
                    </button>
                    <button
                      className={`feedback-btn ${link.feedback === 'useless' ? 'active useless' : ''}`}
                      onClick={() => handleLinkFeedback(link.id, 'useless')}
                    >
                      👎
                    </button>
                  </div>
                </div>
              ))}
              <p className="link-disclaimer">AI 生成的链接可能不可用，请以实际访问为准</p>
            </div>
          ) : (
            <div className="section-empty">
              <p>点击"生成推荐"获取相关学习资源</p>
            </div>
          )}
        </section>

        {/* 学习笔记 */}
        <section className="report-section">
          <h2>📝 学习笔记</h2>
          <textarea
            className="notes-textarea"
            placeholder="记录今天的学习内容..."
            value={notes}
            onChange={(e) => saveNotes(e.target.value)}
          />
        </section>

        {/* 完成总结 */}
        <section className={`report-section summary-section ${isComplete ? 'completed' : ''}`}>
          <h2>✅ 完成总结</h2>
          <textarea
            className="summary-textarea"
            placeholder="写下今天的学习总结（至少10个字符）..."
            value={summary}
            onChange={(e) => saveSummary(e.target.value)}
          />
          <div className="summary-status">
            {summaryLength > 0 && (
              <span className={isComplete ? 'status-complete' : 'status-incomplete'}>
                {isComplete ? '✅ 已完成' : `还需 ${10 - summaryLength} 个字符`}
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
