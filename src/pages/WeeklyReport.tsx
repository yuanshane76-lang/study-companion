import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as db from '../services/db'
import { generateWeeklyReport } from '../services/ai'
import './WeeklyReport.css'

export default function WeeklyReport() {
  const { subjectId } = useParams()
  const [subject, setSubject] = useState<db.Subject | null>(null)
  const [reports, setReports] = useState<db.DailyReport[]>([])
  const [weeklyReport, setWeeklyReport] = useState<{
    completionRate: number
    achievements: string[]
    nextWeekPlan: string
    aiAdvice: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!subjectId) return
      setLoading(true)
      try {
        const s = await db.getSubject(subjectId)
        setSubject(s)

        // Get all plans for this subject
        const plans = await db.getPlans(subjectId)

        // Get all reports for all plans
        const allReports: db.DailyReport[] = []
        for (const plan of plans) {
          const r = await db.getReportsByPlan(plan.id)
          allReports.push(...r)
        }

        // Sort by date
        allReports.sort((a, b) => a.date.localeCompare(b.date))
        setReports(allReports)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [subjectId])

  // Calculate week range (current week Monday to Sunday)
  const getWeekRange = () => {
    const today = new Date()
    const dayOfWeek = today.getDay() || 7 // 1-7 (Mon-Sun)
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    }
  }

  const weekRange = getWeekRange()
  const weekReports = reports.filter(
    (r) => r.date >= weekRange.start && r.date <= weekRange.end,
  )

  const completedCount = weekReports.filter((r) => r.summary).length
  const totalCount = weekReports.length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Manual generate
  const handleGenerate = async () => {
    if (weekReports.length === 0) return
    setGenerating(true)
    try {
      const result = await generateWeeklyReport(
        weekReports.map((r) => ({
          date: r.date,
          summary: r.summary,
          study_duration: r.study_duration,
          tasks: r.tasks || [],
        })),
      )
      setWeeklyReport(result)
    } catch (e) {
      console.error('周报生成失败:', e)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <div className="weekly-report-page loading">加载中...</div>
  }

  return (
    <div className="weekly-report-page">
      <div className="weekly-header">
        <Link to={`/subjects/${subjectId}`} className="back-link">← 返回学科详情</Link>
        <h1>{subject?.icon} {subject?.name} 周报</h1>
        <p className="week-range">{weekRange.start} ~ {weekRange.end}</p>
      </div>

      {/* 本周概览 */}
      <div className="weekly-overview">
        <div className="overview-stat">
          <div className="stat-value">{completionRate}%</div>
          <div className="stat-label">完成率</div>
        </div>
        <div className="overview-stat">
          <div className="stat-value">{completedCount}/{totalCount}</div>
          <div className="stat-label">已完成/总计</div>
        </div>
        <div className="overview-stat">
          <div className="stat-value">
            {Math.round(weekReports.reduce((sum, r) => sum + (r.study_duration || 0), 0) / 3600 * 10) / 10}h
          </div>
          <div className="stat-label">学习时长</div>
        </div>
      </div>

      {/* 每日完成情况 */}
      <div className="weekly-reports">
        <h2>每日完成情况</h2>
        <div className="daily-grid">
          {weekReports.length > 0 ? weekReports.map((report) => (
            <Link key={report.id} to={`/reports/${report.id}`} className="daily-item">
              <span className="daily-date">{report.date.slice(5)}</span>
              <span className={`daily-status ${report.summary ? 'completed' : 'pending'}`}>
                {report.summary ? '✅' : '○'}
              </span>
              {report.summary && (
                <span className="daily-summary">{report.summary.slice(0, 30)}...</span>
              )}
            </Link>
          )) : (
            <p className="no-data">本周暂无日报</p>
          )}
        </div>
      </div>

      {/* AI 周报 */}
      <div className="ai-weekly-report">
        <div className="section-header">
          <h2>🤖 AI 周报</h2>
          <button
            className="btn-generate"
            onClick={handleGenerate}
            disabled={generating || weekReports.length === 0}
          >
            {generating ? '生成中...' : '生成周报'}
          </button>
        </div>

        {weeklyReport ? (
          <div className="weekly-report-content">
            <div className="report-section">
              <h3>📊 关键成果</h3>
              <ul>
                {weeklyReport.achievements.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <div className="report-section">
              <h3>📅 下周计划</h3>
              <p>{weeklyReport.nextWeekPlan}</p>
            </div>
            <div className="report-section">
              <h3>💡 学习建议</h3>
              <p>{weeklyReport.aiAdvice}</p>
            </div>
          </div>
        ) : (
          <div className="section-empty">
            <p>{weekReports.length > 0 ? '点击"生成周报"获取 AI 分析' : '本周暂无足够数据生成周报'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
