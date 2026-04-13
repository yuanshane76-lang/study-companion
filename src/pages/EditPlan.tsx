import { useParams } from 'react-router-dom'

export default function EditPlan() {
  const { id } = useParams()

  return (
    <div style={{ padding: 'var(--spacing-2xl)' }}>
      <h1>编辑计划</h1>
      <p>编辑计划 ID: {id}（开发中）</p>
    </div>
  )
}
