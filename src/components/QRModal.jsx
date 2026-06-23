export default function QRModal({ visible, qrDataUrl, onClose }) {
  if (!visible) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1010,
        background: 'rgba(0,0,0,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
        <div onClick={e => e.stopPropagation()} style={{
          animation: 'qrSlideUp .35s cubic-bezier(.22,1,.36,1) forwards',
        }}>
          <div style={{
            width: 360,
            padding: 24,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,.25)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 16,
            position: 'relative',
          }}>
            <svg
              onClick={onClose}
              style={{ position: 'absolute', top: 8, right: 8, cursor: 'pointer' }}
              width="16" height="16" viewBox="0 0 16 16"
            >
              <line x1="3" y1="3" x2="13" y2="13" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="13" y1="3" x2="3" y2="13" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }} />
                <div style={{ fontSize: 13, color: '#999', letterSpacing: 1 }}>请使用 微信 扫一扫</div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#999' }}>生成中...</div>
            )}
          </div>
        </div>
    </div>
  )
}