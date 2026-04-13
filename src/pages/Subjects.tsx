import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store'
import * as db from '../services/db'
import './Subjects.css'

export default function Subjects() {
  const subjects = useAppStore((s) => s.subjects)
  const plans = useAppStore((s) => s.plans)
  const loadSubjects = useAppStore((s) => s.loadSubjects)
  const loadPlans = useAppStore((s) => s.loadPlans)

  useEffect(() => {
    loadSubjects()
    loadPlans()
  }, [])

  if (subjects.length === 0) {
    return (
      <div className="subjects-page">
        <div className="subjects-header">
          <h1>学科列表</h1>
          <Link to="/plans/new" className="btn-primary">
            ＋ 新建计划
          </Link>
        </div>
        <div className="subjects-empty">
          <div className="empty-icon">📚</div>
          <p>暂无学科，请先创建一个学习计划</p>
          <Link to="/plans/new" className="btn-primary">
            创建计划
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="subjects-page">
      <div className="subjects-header">
        <h1>学科列表</h1>
        <Link to="/plans/new" className="btn-primary">
          ＋ 新建计划
        </Link>
      </div>

      <div className="subjects-grid">
        {subjects.map((subject) => {
          const subjectPlans = plans.filter((p) => p.subject_id === subject.id)
          const activePlans = subjectPlans.filter((p) => p.status === 'active')
          return (
            <Link key={subject.id} to={`/subjects/${subject.id}`} className="subject-card">
              <div className="subject-icon">{subject.icon}</div>
              <div className="subject-info">
                <h3>{subject.name}</h3>
                <p>{activePlans.length} 个进行中计划</p>
              </div>
              <div className="subject-arrow">›</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
