import { useState } from 'react'
import { todayShamsiString } from '../lib/jalaliDate'
import DailyDashboardView from '../components/dashboard/DailyDashboardView'
import MonthlyDashboardView from '../components/dashboard/MonthlyDashboardView'

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState('daily') // 'daily' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(todayShamsiString())

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <a href="/" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>← بازگشت به خانه</a>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>شرکت کی‌کاو آلتین</p>
        <p style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 0' }}>داشبورد مدیریت — گزارش روزانه</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        <button
          className={`btn-toggle ${viewMode === 'daily' ? 'active' : ''}`}
          onClick={() => setViewMode('daily')}
        >
          نمای روزانه
        </button>
        <button
          className={`btn-toggle ${viewMode === 'monthly' ? 'active' : ''}`}
          onClick={() => setViewMode('monthly')}
        >
          نمای ماهانه
        </button>
      </div>

      {viewMode === 'daily' ? (
        <DailyDashboardView selectedDate={selectedDate} onChangeDate={setSelectedDate} />
      ) : (
        <MonthlyDashboardView />
      )}
    </div>
  )
}
