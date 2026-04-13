import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as db from '../services/db'
import './Home.css'

export default function Home() {
  const [stats, setStats] = useState({ pending: 0, completed: 0, streak: 0 })
  const [todayReport, setTodayReport] = useState<db.DailyReport | null>(null)
  const [plans, setPlans] = useState<db.Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const allPlans = await db.getPlans()
        setPlans(allPlans)

        const todayStr = new Date().toISOString().split('T')[0]

        // Find today's report
        let todayRep: db.DailyReport | null = null
        for (const plan of allPlans) {
          const reports = await db.getReportsByPlan(plan.id)
          const rep = reports.find((r) => r.date === todayStr)
          if (rep) {
            todayRep = rep
            break
          }
        }
        setTodayReport(todayRep)

        // Calculate stats
        let pendingCount = 0
        let completedCount = 0

        for (const plan of allPlans) {
          const reports = await db.getReportsByPlan(plan.id)
          for (const report of reports) {
            if (report.summary) {
              completedCount++
            } else {
              pendingCount++
            }
          }
        }

        // Calculate streak (simplified)
        let streak = 0
        const today = new Date()
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today)
          checkDate.setDate(checkDate.getDate() - i)
          const dateStr = checkDate.toISOString().split('T')[0]

          let hasReport = false
          for (const plan of allPlans) {
            const reports = await db.getReportsByPlan(plan.id)
            if (reports.some((r) => r.date === dateStr && r.summary)) {
              hasReport = true
              break
            }
          }

          if (hasReport) {
            streak++
          } else if (i > 0) {
            break
          }
        }

        setStats({ pending: pendingCount, completed: completedCount, streak })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return <div className="home-page loading">加载中...</div>
  }

  if (plans.length === 0) {
    return (
      <div className="home-page">
        <div className="home-header">
          <h1>今日概览</h1>
          <Link to="/plans/new" className="btn-primary">
            ＋ 新建计划
          </Link>
        </div>
        <div className="home-empty">
          <div className="empty-icon">📝</div>
          <p>还没有学习计划</p>
          <Link to="/plans/new" className="btn-primary">
            创建第一个学习计划
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>今日概览</h1>
        <Link to="/plans/new" className="btn-primary">
          ＋ 新建计划
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="home-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">待完成任务</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">已完成</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">连续学习天数</div>
        </div>
      </div>

      {/* 今日日报快捷入口 */}
      {todayReport ? (
        <div className="today-report-card">
          <h3>今日日报</h3>
          <p className={todayReport.summary ? 'status-complete' : 'status-pending'}>
            {todayReport.summary ? '✅ 已完成' : '○ 未完成'}
          </p>
          <Link to={`/reports/${todayReport.id}`} className="btn-primary">
            {todayReport.summary ? '查看日报' : '去写总结'}
          </Link>
        </div>
      ) : (
        <div className="today-report-card empty">
          <p>今天还没有对应的日报</p>
          <Link to="/subjects" className="btn-primary">
            选择学科
          </Link>
        </div>
      )}

      {/* 计划列表 */}
      <div className="home-plans">
        <h3>我的计划</h3>
        <div className="plans-mini-list">
          {plans.slice(0, 5).map((plan) => (
            <Link key={plan.id} to={`/subjects/${plan.subject_id}`} className="plan-mini-item">
              <span>{plan.title}</span>
              <span className="plan-mini-status">{plan.status === 'active' ? '进行中' : plan.status}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
