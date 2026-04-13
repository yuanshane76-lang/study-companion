import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { breakDownGoal, breakDownPDF } from '../services/ai'
import * as db from '../services/db'
import { useAppStore } from '../store'
import './NewPlan.css'

export default function NewPlan() {
  const navigate = useNavigate()
  const loadSubjects = useAppStore((s) => s.loadSubjects)
  const subjects = useAppStore((s) => s.subjects)

  const [inputType, setInputType] = useState<'text' | 'pdf'>('text')
  const [textContent, setTextContent] = useState('')
  const [planTitle, setPlanTitle] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // PDF state
  const [pdfFile, setPdfFile] = useState<{ name: string; size: number; path?: string } | null>(null)
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfParsed, setPdfParsed] = useState(false)

  useEffect(() => {
    loadSubjects()
  }, [])

  // Auto-generate plan title from PDF name
  useEffect(() => {
    if (pdfFile && !planTitle) {
      setPlanTitle(pdfFile.name.replace(/\.pdf$/i, '').slice(0, 30))
    }
  }, [pdfFile])

  // Set default end date (7 days from start)
  useEffect(() => {
    if (startDate && !endDate) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + 6)
      setEndDate(d.toISOString().split('T')[0])
    }
  }, [startDate])

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      setError('文件大小超过 50MB 限制')
      return
    }

    setPdfFile({ name: file.name, size: file.size })
    setError('')

    // In Electron environment, use dialog to open and parse PDF
    if (window.electronAPI?.pdfOpen) {
      try {
        setPdfParsing(true)
        const result = await window.electronAPI.pdfOpen()
        if (result) {
          setPdfFile({ name: result.name, size: result.size, path: result.path })
          setPdfParsing(false)
          setPdfParsed(false)
        }
      } catch (e) {
        setError((e as Error).message)
        setPdfFile(null)
        setPdfParsing(false)
      }
    }
  }

  const handlePdfParse = async () => {
    if (!pdfFile?.path) {
      // In browser mode, show a message
      setError('PDF 解析需要在 Electron 环境下运行。请先配置 API Key 并在桌面端打开。')
      return
    }

    setPdfParsing(true)
    try {
      const parsed = await window.electronAPI.pdfParse(pdfFile.path)
      if (!parsed.text || parsed.text.trim().length < 50) {
        setError('PDF 内容为空或为扫描件（不支持图片型 PDF）')
        return
      }
      setPdfParsed(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPdfParsing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!planTitle.trim()) {
      setError('请输入计划名称')
      return
    }
    if (inputType === 'text' && !textContent.trim()) {
      setError('请输入学习目标描述')
      return
    }
    if (inputType === 'pdf' && !pdfFile) {
      setError('请选择 PDF 文件')
      return
    }
    if (!startDate || !endDate) {
      setError('请选择时间范围')
      return
    }

    setLoading(true)
    try {
      let breakdown: Awaited<ReturnType<typeof breakDownGoal>>

      if (inputType === 'text') {
        // Text input: AI breakdown
        breakdown = await breakDownGoal(textContent, startDate, endDate)
      } else {
        // PDF input: parse + AI breakdown
        let pdfText = ''
        if (pdfFile?.path) {
          // Electron: parse PDF
          const parsed = await window.electronAPI.pdfParse(pdfFile.path)
          pdfText = parsed.text
        } else {
          // Browser: simulate (user needs to provide text manually)
          pdfText = `PDF 文件: ${pdfFile?.name}\n(请在桌面端打开以自动解析内容)`
        }
        breakdown = await breakDownPDF(pdfText, pdfFile.name, startDate, endDate)
      }

      // Find or create subject
      let subject = subjects.find((s) => s.name === breakdown.subjectName)
      if (!subject) {
        await db.createSubject(breakdown.subjectName)
        const subjectsList = await db.getSubjects()
        subject = subjectsList.find((s) => s.name === breakdown.subjectName) || null
      }

      if (!subject) {
        setError('学科创建失败')
        setLoading(false)
        return
      }

      // Create plan
      const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      await db.createPlan({
        id: planId,
        subjectId: subject.id,
        title: planTitle,
        sourceType: inputType,
        sourceContent: inputType === 'text' ? textContent : JSON.stringify({ name: pdfFile?.name, path: pdfFile?.path }),
        startDate,
        endDate,
      })

      // Create daily reports with tasks distributed across days
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days: Date[] = []
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d))
      }

      const tasks = breakdown.tasks.map((t, i) => ({
        id: `task_${Date.now()}_${i}`,
        title: t.title,
        description: t.description,
        status: 'pending' as const,
        order: t.order,
      }))

      // Distribute tasks evenly across days
      const tasksPerDay = Math.max(1, Math.ceil(tasks.length / days.length))
      for (let i = 0; i < days.length; i++) {
        const dateStr = days[i].toISOString().split('T')[0]
        const reportId = `report_${planId}_${dateStr.replace(/-/g, '')}`
        const dayTasks = tasks.slice(i * tasksPerDay, (i + 1) * tasksPerDay)
        await db.createOrUpdateReport({
          id: reportId,
          planId,
          date: dateStr,
          tasks: JSON.stringify(dayTasks),
        })
      }

      navigate(`/subjects/${subject.id}`)
    } catch (e) {
      setError((e as Error).message || '创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="new-plan-page">
      <h1>新建学习计划</h1>

      <form onSubmit={handleSubmit} className="new-plan-form">
        {/* 输入类型选择 */}
        <div className="form-section">
          <label className="form-label">输入类型</label>
          <div className="type-selector">
            <button
              type="button"
              className={`type-btn ${inputType === 'text' ? 'active' : ''}`}
              onClick={() => setInputType('text')}
            >
              📝 文本目标
            </button>
            <button
              type="button"
              className={`type-btn ${inputType === 'pdf' ? 'active' : ''}`}
              onClick={() => setInputType('pdf')}
            >
              📄 PDF 上传
            </button>
          </div>
        </div>

        {/* 计划名称 */}
        <div className="form-section">
          <label className="form-label" htmlFor="plan-title">
            计划名称
          </label>
          <input
            id="plan-title"
            type="text"
            className="form-input"
            placeholder="例如：算法导论第3-5章"
            value={planTitle}
            onChange={(e) => setPlanTitle(e.target.value)}
          />
        </div>

        {/* 文本输入 / PDF 上传 */}
        {inputType === 'text' ? (
          <div className="form-section">
            <label className="form-label" htmlFor="text-content">
              学习目标描述
            </label>
            <textarea
              id="text-content"
              className="form-textarea"
              placeholder="描述你的学习目标，AI 会自动拆解为每日任务..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />
          </div>
        ) : (
          <div className="form-section">
            <label className="form-label">上传 PDF</label>
            <div className="pdf-upload-area">
              <div className="pdf-upload-icon">📄</div>
              {pdfFile ? (
                <div className="pdf-file-info">
                  <p className="pdf-file-name">{pdfFile.name}</p>
                  <p className="pdf-file-size">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  {!pdfParsed && !pdfFile.path && (
                    <button type="button" className="btn-parse-pdf" onClick={handlePdfParse} disabled={pdfParsing}>
                      {pdfParsing ? '解析中...' : '解析 PDF'}
                    </button>
                  )}
                  {pdfParsed && <p className="pdf-parsed-hint">✅ 已解析，AI 将自动按章节拆分任务</p>}
                </div>
              ) : (
                <>
                  <p>点击或拖拽上传 PDF 文件</p>
                  <p className="pdf-hint">支持文本型 PDF，最大 50MB</p>
                </>
              )}
              <input
                type="file"
                accept=".pdf"
                className="pdf-file-input"
                onChange={handlePdfSelect}
                disabled={pdfParsing}
              />
            </div>
          </div>
        )}

        {/* 时间范围 */}
        <div className="form-row">
          <div className="form-section">
            <label className="form-label" htmlFor="start-date">
              开始日期
            </label>
            <input
              id="start-date"
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-section">
            <label className="form-label" htmlFor="end-date">
              结束日期
            </label>
            <input
              id="end-date"
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* 错误提示 */}
        {error && <div className="form-error">{error}</div>}

        {/* 提交 */}
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading || pdfParsing}>
            {loading
              ? 'AI 拆解中...'
              : inputType === 'pdf' && !pdfParsed
                ? '创建计划（建议先解析 PDF）'
                : '创建计划'}
          </button>
        </div>
      </form>
    </div>
  )
}
