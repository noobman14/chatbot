import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 引入路由库
import './i18n'; // 初始化 i18n 配置
import './App.css'
import { App } from './App.tsx'

const container = document.getElementById('root');
if (!container) {
  throw new Error('未找到 id="root" 的 DOM 元素，请检查 index.html');
}

// 在最外层包裹 BrowserRouter，为整个应用提供路由上下文
createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
