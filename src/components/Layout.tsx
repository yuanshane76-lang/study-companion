import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

const navItems = [
  { label: '首页', path: '/', icon: '🏠' },
  { label: '学科', path: '/subjects', icon: '📚' },
  { label: '设置', path: '/settings', icon: '⚙️' },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="layout">
      {/* 顶部导航栏 */}
      <header className="app-header draggable">
        <div className="header-left">
          <span className="app-logo">📖</span>
          <span className="app-title">学习陪伴助手</span>
        </div>
        <div className="header-right non-draggable">
          <button className="header-btn" onClick={() => window.electronAPI?.windowMinimize()}>
            —
          </button>
          <button className="header-btn" onClick={() => window.electronAPI?.windowMaximize()}>
            □
          </button>
          <button className="header-btn close" onClick={() => window.electronAPI?.windowClose()}>
            ✕
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* 左侧边栏 */}
        <aside className="app-sidebar">
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}

            {/* 快捷操作 */}
            <div className="nav-divider" />
            <Link to="/plans/new" className="nav-item nav-action">
              <span className="nav-icon">➕</span>
              <span className="nav-label">新建计划</span>
            </Link>
          </nav>
        </aside>

        {/* 右侧内容区 */}
        <main className="app-content">{children}</main>
      </div>

      {/* 状态栏 */}
      <footer className="app-statusbar">
        <span className="status-item">就绪</span>
        <span className="status-spacer" />
        <span className="status-item">本地存储</span>
      </footer>
    </div>
  )
}
