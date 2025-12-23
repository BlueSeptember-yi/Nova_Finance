import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd' // 👈 新增：引入配置组件
import zhCN from 'antd/locale/zh_CN' // 👈 新增：引入中文语言包
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 👇 新增：用 ConfigProvider 包裹住 App */}
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#722ed1', // 💜 NovaFinance 星云紫
          borderRadius: 4,         // 圆角设置
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
