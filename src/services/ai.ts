// AI 服务 - 调用 OpenAI 兼容接口

export interface AIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export interface TaskItem {
  title: string
  description: string
  order: number
}

export interface PlanBreakdown {
  subjectName: string
  tasks: TaskItem[]
  startDate: string
  endDate: string
}

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  dashscope: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  kimi: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  glm: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
}

function getDefaults(): { baseUrl: string; model: string } {
  return PROVIDER_DEFAULTS['dashscope']
}

async function getConfigFromStorage(): Promise<AIConfig> {
  try {
    const apiKey = await window.electronAPI.configGet('ai_api_key')
    const baseUrl = await window.electronAPI.configGet('ai_base_url')
    const model = await window.electronAPI.configGet('ai_model')
    const provider = await window.electronAPI.configGet('ai_provider')
    const defaults = (provider && PROVIDER_DEFAULTS[provider]) || getDefaults()
    return {
      apiKey: apiKey || '',
      baseUrl: baseUrl || defaults.baseUrl,
      model: model || defaults.model,
    }
  } catch {
    const defaults = getDefaults()
    return {
      apiKey: '',
      baseUrl: defaults.baseUrl,
      model: defaults.model,
    }
  }
}

async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const config = await getConfigFromStorage()
  if (!config.apiKey) {
    throw new Error('未配置 API Key，请在设置页配置')
  }

  const baseUrl = config.baseUrl.replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AI 请求失败: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

export async function breakDownGoal(
  goalText: string,
  startDate: string,
  endDate: string,
): Promise<PlanBreakdown> {
  const prompt = `你是一个学习计划助手。请将用户的学习目标拆解为每日可执行的任务。

请严格按照以下 JSON 格式返回，不要包含其他内容：
{
  "subjectName": "学科名称（根据内容自动识别）",
  "tasks": [
    {"title": "任务标题", "description": "任务描述", "order": 1}
  ]
}

学习目标：${goalText}
时间范围：${startDate} 至 ${endDate}

要求：
1. 任务数量根据时间范围合理安排（每天 1-3 个任务）
2. 任务要循序渐进，从基础到深入
3. subjectName 用中文，简洁明了（如：算法、英语、数学等）`

  const result = await callAI([{ role: 'user', content: prompt }])

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('AI 返回格式不正确')
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('AI 返回格式不正确，请重试')
    }
    throw e
  }
}

export async function breakDownPDF(
  pdfContent: string,
  fileName: string,
  startDate: string,
  endDate: string,
): Promise<PlanBreakdown> {
  // Truncate content if too long (keep first 8000 chars for AI context)
  const truncatedContent = pdfContent.length > 8000 ? pdfContent.slice(0, 8000) + '...(内容过长已截断)' : pdfContent

  const prompt = `你是一个学习计划助手。请分析以下 PDF 文档的内容，并按章节/知识点拆解为每日可执行的学习任务。

请严格按照以下 JSON 格式返回，不要包含其他内容：
{
  "subjectName": "学科名称",
  "tasks": [
    {"title": "任务标题", "description": "任务描述", "order": 1}
  ]
}

PDF 文件名：${fileName}
PDF 内容摘要：
${truncatedContent}

时间范围：${startDate} 至 ${endDate}

要求：
1. 根据 PDF 的章节/知识点结构进行拆分
2. 任务数量根据时间范围合理安排（每天 1-3 个任务）
3. 任务要循序渐进
4. subjectName 用中文，简洁明了`

  const result = await callAI([{ role: 'user', content: prompt }])

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('AI 返回格式不正确')
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('AI 返回格式不正确，请重试')
    }
    throw e
  }
}

export async function identifySubject(text: string): Promise<string> {
  const prompt = `请判断以下学习内容属于哪个学科，只返回学科名称（中文，2-6个字），不要返回其他内容：

${text}`

  return await callAI([{ role: 'user', content: prompt }])
}

export async function generateRecommendLinks(topic: string): Promise<
  Array<{ title: string; url: string; source: string }>
> {
  const prompt = `你是一个学习资源推荐助手。请根据以下学习主题，推荐 3-5 个高质量学习链接。

请严格按照以下 JSON 格式返回，不要包含其他内容：
{
  "links": [
    {"title": "资源标题", "url": "https://...", "source": "来源平台"}
  ]
}

学习主题：${topic}

要求：
1. 推荐真实存在的公开学习资源
2. 优先推荐官方文档、知名教程、经典文章
3. 来源可以是：官方文档、GitHub、Coursera、B站、知乎、博客等`

  const result = await callAI([{ role: 'user', content: prompt }])

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.links || []
    }
    return []
  } catch {
    return []
  }
}

export async function adjustPlan(
  completedReports: Array<{ date: string; summary: string | null }>,
  remainingTasks: Array<{ title: string; date: string }>,
): Promise<Array<{ title: string; date: string }>> {
  const prompt = `你是一个学习计划调整助手。请根据用户的实际完成情况，调整后续学习计划。

用户完成情况：
${JSON.stringify(completedReports)}

原计划剩余任务：
${JSON.stringify(remainingTasks)}

请严格按照以下 JSON 格式返回调整后的计划，不要包含其他内容：
{
  "adjustedTasks": [
    {"title": "任务标题", "date": "YYYY-MM-DD"}
  ]
}

调整原则：
1. 未完成的任务顺延到后续日期
2. 已完成日期的任务不再安排
3. 如果进度落后，适当压缩非核心任务
4. 如果提前完成，可以推进后续内容或安排扩展学习`

  const result = await callAI([{ role: 'user', content: prompt }])

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.adjustedTasks || remainingTasks
    }
    return remainingTasks
  } catch {
    return remainingTasks
  }
}

export async function generateWeeklyReport(
  reports: Array<{
    date: string
    summary: string | null
    study_duration: number
    tasks: Array<{ title: string; status: string }>
  }>,
): Promise<{
  completionRate: number
  achievements: string[]
  nextWeekPlan: string
  aiAdvice: string
}> {
  const prompt = `你是一个学习复盘助手。请根据用户本周的学习日报生成周报。

本周学习记录：
${JSON.stringify(reports)}

请严格按照以下 JSON 格式返回，不要包含其他内容：
{
  "completionRate": 75,
  "achievements": ["完成了XX章节的学习", "掌握了XX概念"],
  "nextWeekPlan": "下周计划继续学习...",
  "aiAdvice": "建议..."
}

要求：
1. completionRate 是完成百分比（0-100）
2. achievements 列出 2-4 个关键学习成果
3. nextWeekPlan 是简短的下周计划（1-2句话）
4. aiAdvice 是建设性学习建议`

  const result = await callAI([{ role: 'user', content: prompt }])

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('AI 返回格式不正确')
  } catch {
    return {
      completionRate: 0,
      achievements: [],
      nextWeekPlan: '',
      aiAdvice: '',
    }
  }
}
