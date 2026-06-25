import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function InspectionGuidePage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || '/maintenance'

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('inspection_checklist_items')
      .select('*')
      .eq('id', itemId)
      .single()
      .then(({ data }) => {
        setItem(data)
        setLoading(false)
      })
  }, [itemId])

  if (loading) return <p style={{ textAlign: 'center', padding: 40 }}>در حال بارگذاری...</p>

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <button className="btn-secondary" style={{ marginBottom: 16 }} onClick={() => navigate(returnTo)}>
        ← بازگشت به فرم
      </button>

      <div className="card">
        {item?.category && (
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 6px' }}>{item.category}</p>
        )}
        <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>{item?.item_text}</p>

        {item?.inspection_method && (
          <div style={{ marginBottom: 12 }}>
            <p className="label" style={{ marginBottom: 4 }}>روش بازرسی</p>
            <p style={{ fontSize: 14, margin: 0 }}>{item.inspection_method}</p>
          </div>
        )}

        {item?.threshold_text && (
          <div style={{ marginBottom: 12 }}>
            <p className="label" style={{ marginBottom: 4 }}>حد مجاز</p>
            <p style={{ fontSize: 14, margin: 0 }}>{item.threshold_text}</p>
          </div>
        )}

        <div>
          <p className="label" style={{ marginBottom: 4 }}>توضیح کامل</p>
          <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>{item?.detail_text}</p>
        </div>
      </div>

      <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => navigate(returnTo)}>
        بازگشت به فرم
      </button>
    </div>
  )
}
