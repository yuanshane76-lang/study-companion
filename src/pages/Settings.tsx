import { useState, useEffect } from 'react'
import { setConfig, getConfig } from '../services/db'
import './Settings.css'

interface ProviderOption {
  id: string
  name: string
  baseUrl: string
  models: { value: string; label: string }[]
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'dashscope',
    name: '阿里云百炼（推荐）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { value: 'qwen-turbo', label: 'Qwen Turbo（快速）' },
      { value: 'qwen-plus', label: 'Qwen Plus（均衡）' },
      { value: 'qwen-max', label: 'Qwen Max（效果最好）' },
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner（深度推理）' },
      { value: 'glm-4-flash', label: 'GLM-4 Flash' },
      { value: 'glm-4-plus', label: 'GLM-4 Plus' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek 官方',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat（推荐）' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner（深度推理）' },
    ],
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { value: 'moonshot-v1-8k', label: 'Moonshot V1 8K' },
      { value: 'moonshot-v1-32k', label: 'Moonshot V1 32K' },
      { value: 'moonshot-v1-128k', label: 'Moonshot V1 128K（长文本）' },
    ],
  },
  {
    id: 'glm',
    name: '智谱 GLM 官方',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { value: 'glm-4-flash', label: 'GLM-4 Flash（免费快速）' },
      { value: 'glm-4-air', label: 'GLM-4 Air（均衡）' },
      { value: 'glm-4-plus', label: 'GLM-4 Plus（效果最好）' },
      { value: 'glm-4', label: 'GLM-4' },
    ],
  },
]

export default function Settings() {
  const [provider, setProvider] = useState('dashscope')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function loadConfig() {
      const key = await getConfig('ai_api_key')
      const url = await getConfig('ai_base_url')
      const mdl = await getConfig('ai_model')
      const prov = await getConfig('ai_provider')
      if (key) setApiKey(key)
      if (prov) {
        setProvider(prov)
        const p = PROVIDERS.find((p) => p.id === prov)
        if (p) {
          setBaseUrl(url || p.baseUrl)
          setModel(mdl || p.models[0].value)
        }
      } else {
        const p = PROVIDERS.find((p) => p.id === 'dashscope')!
        setBaseUrl(p.baseUrl)
        setModel(p.models[0].value)
      }
    }
    loadConfig()
  }, [])

  const handleProviderChange = (id: string) => {
    const p = PROVIDERS.find((p) => p.id === id)
    if (!p) return
    setProvider(id)
    setBaseUrl(p.baseUrl)
    setModel(p.models[0].value)
  }

  const handleSave = async () => {
    await setConfig('ai_provider', provider)
    await setConfig('ai_api_key', apiKey)
    await setConfig('ai_base_url', baseUrl)
    await setConfig('ai_model', model)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const currentProvider = PROVIDERS.find((p) => p.id === provider)

  return (
    <div className="settings-page">
      <h1>设置</h1>

      <div className="settings-section">
        <h2>AI 配置</h2>

        <div className="form-group">
          <label className="form-label" htmlFor="provider">
            服务商
          </label>
          <select
            id="provider"
            className="form-input"
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="api-key">
            API Key
          </label>
          <input
            id="api-key"
            type="password"
            className="form-input"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <span className="form-hint">
            {currentProvider && (
              <>
                获取地址：
                <a href={
                  provider === 'dashscope' ? 'https://bailian.console.aliyun.com/' :
                  provider === 'deepseek' ? 'https://platform.deepseek.com/' :
                  provider === 'kimi' ? 'https://platform.moonshot.cn/' :
                  'https://open.bigmodel.cn/'
                } target="_blank" rel="noopener noreferrer">
                  {currentProvider.name} 控制台
                </a>
              </>
            )}
          </span>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="base-url">
            Base URL
          </label>
          <input
            id="base-url"
            type="text"
            className="form-input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <span className="form-hint">切换服务商时自动填入，一般无需修改</span>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="model">
            模型
          </label>
          <select
            id="model"
            className="form-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {currentProvider?.models.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="save-row">
          <button className="btn-primary" onClick={handleSave}>
            保存配置
          </button>
          {saved && <span className="save-success">✅ 已保存</span>}
        </div>
      </div>

      <div className="settings-section">
        <h2>数据存储</h2>
        <p className="settings-hint">所有数据存储在本地 SQLite 数据库中，不会上传云端。</p>
      </div>
    </div>
  )
}
