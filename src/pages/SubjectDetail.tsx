import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as db from '../services/db'
import './SubjectDetail.css'

export default function SubjectDetail() {
  const { id } = useParams()
  const [subject, setSubject] = useState<db.Subject | null>(null)
  const [plans, setPlans] = useState<db.Plan[]>([])
  const [reports, setReports] = useState<db.DailyReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!id) return
      setLoading(true)
      try {
        const s = await db.getSubject(id)
        setSubject(s)
        const p = await db.getPlans(id)
        setPlans(p)

        // Load reports for all plans
        const allReports: db.DailyReport[] = []
        for (const plan of p) {
          const r = await db.getReportsByPlan(plan.id)
          allReports.push(...r)
        }
        setReports(allReports)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const todayStr = new Date().toISOString().split('T')[0]
  const todayReport = reports.find((r) => r.date === todayStr)

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '进行中'
      case 'completed': return '已完成'
      case 'paused': return '已暂停'
      default: return status
    }
  }

  return (
    <div className="subject-detail-page">
      <div className="subject-detail-header">
        <Link to="/subjects" className="back-link">← 返回学科列表</Link>
        {subject && <h1>{subject.icon} {subject.name}</h1>}
        {id && (
          <Link to={`/subjects/${id}/weekly`} className="btn-secondary weekly-link">
            📊 查看周报
          </Link>
        )}
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : plans.length === 0 ? (
        <div className="subject-detail-empty">
          <p>该学科下暂无学习计划</p>
          <Link to="/plans/new" className="btn-primary">
            创建计划
          </Link>
        </div>
      ) : (
        <div className="plans-list">
          {plans.map((plan) => {
            const planReports = reports.filter((r) => r.plan_id === plan.id)
            const completedCount = planReports.filter((r) => r.summary).length
            const totalCount = planReports.length
            const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

            return (
              <div key={plan.id} className="plan-card">
                <div className="plan-header">
                  <div>
                    <h3>{plan.title}</h3>
                    <p className="plan-dates">
                      {plan.start_date} ~ {plan.end_date}
                    </p>
                  </div>
                  <span className={`plan-status ${plan.status}`}>{getStatusLabel(plan.status)}</span>
                </div>

                {/* 进度条 */}
                <div className="plan-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="progress-text">{progress}% ({completedCount}/{totalCount})</span>
                </div>

                {/* 日报列表 */}
                {planReports.length > 0 && (
                  <div className="plan-reports">
                    <h4>每日日报</h4>
                    <div className="reports-grid">
                      {planReports.map((report) => {
                        const isCompleted = !!report.summary
                        const isToday = report.date === todayStr
                        return (
                          <Link
                            key={report.id}
                            to={`/reports/${report.id}`}
                            className={`report-item ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}`}
                          >
                            <span className="report-date">{report.date}</span>
                            <span className="report-status">{isCompleted ? '✅' : '○'}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 编辑/删除 */}
                <div className="plan-actions">
                  <Link to={`/plans/${plan.id}/edit`} className="action-link">编辑</Link>
                  <button
                    className="action-link danger"
                    onClick={async () => {
                      if (confirm('确定删除此计划？')) {
                        await db.deletePlan(plan.id)
                        // Reload plans
                        const p = await db.getPlans(id)
                        setPlans(p)
                      }
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
