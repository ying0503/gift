const s = {
  wrap: { position: 'fixed', inset: 0, zIndex: 1000 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)' },
  panel: { position: 'fixed', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  phoneOuter: { height: '100%', maxHeight: 820, display: 'flex', flexDirection: 'column', position: 'relative' },
  phone: { width: 388, flex: 1, background: '#b9b2c0', borderRadius: 32, padding: 5, boxShadow: '0 12px 80px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.06), inset 0 2px 0 rgba(255,255,255,.8), inset 0 -1px 0 rgba(0,0,0,.1), inset 2px 0 0 rgba(255,255,255,.15), inset -1px 0 0 rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 2 },
  screen: { flex: 1, borderRadius: 27, overflow: 'hidden', border: '3px solid #0a0a0a', background: '#f7f7f8', display: 'flex', flexDirection: 'column' },
  statusBar: { height: 34, background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', flexShrink: 0 },
  battery: { display: 'flex', alignItems: 'center', gap: 6 },
  navBar: { background: '#f7f7f8', display: 'flex', alignItems: 'center', padding: '6px 10px', flexShrink: 0, gap: 8, borderBottom: '1px solid #e5e5e5' },
  titleWrap: { flex: 1, textAlign: 'center', overflow: 'hidden' },
  title: { fontSize: 13, fontWeight: 500, color: '#111', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  subtitle: { fontSize: 9, color: '#999', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  content: { flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' },
  spinner: { width: 32, height: 32, border: '3px solid #e5e5e5', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin .8s linear infinite' },
  loadingText: { fontSize: 12, color: '#999' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  frame: { width: '100%', height: '100%', border: 'none' },
  deco1: { position: 'absolute', left: -4, top: 100, width: 3, height: 30, background: 'linear-gradient(180deg, #d0ccc4, #bbb7af)', borderRadius: '2px 0 0 2px' },
  deco2: { position: 'absolute', left: -4, top: 138, width: 3, height: 30, background: 'linear-gradient(180deg, #d0ccc4, #bbb7af)', borderRadius: '2px 0 0 2px' },
  deco3: { position: 'absolute', right: -4, top: 120, width: 3, height: 40, background: 'linear-gradient(180deg, #d0ccc4, #bbb7af)', borderRadius: '0 2px 2px 0' },
}

function SvgClose({ onClick, style }) {
  return (
    <svg onClick={onClick} style={style} width="16" height="16" viewBox="0 0 16 16"><line x1="3" y1="3" x2="13" y2="13" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/><line x1="13" y1="3" x2="3" y2="13" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/></svg>
  )
}

function SvgSignal() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14"><rect x="0" y="9.5" width="3.5" height="4.5" rx="0.8" fill="#666"/><rect x="5.5" y="6" width="3.5" height="8" rx="0.8" fill="#666"/><rect x="11" y="2.5" width="3.5" height="11.5" rx="0.8" fill="#666"/><rect x="16.5" y="0" width="3.5" height="14" rx="0.8" fill="#666"/></svg>
  )
}

function SvgBattery() {
  return (
    <svg width="24" height="14" viewBox="0 0 24 14"><rect x="0" y="2.5" width="17" height="9" rx="1.5" fill="none" stroke="#666" strokeWidth="1.2"/><rect x="17" y="5" width="2.5" height="4" rx="0.5" fill="#666"/><rect x="1.8" y="4" width="3.5" height="6" rx="0.8" fill="#4ade80"/><rect x="6.3" y="4" width="3.5" height="6" rx="0.8" fill="#4ade80"/><rect x="10.8" y="4" width="3.5" height="6" rx="0.8" fill="#4ade80"/></svg>
  )
}

function SvgMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="3" cy="8" r="1.2" fill="#666"/><circle cx="8" cy="8" r="1.2" fill="#666"/><circle cx="13" cy="8" r="1.2" fill="#666"/></svg>
  )
}

export default function PreviewModal({ visible, onClose, anim, loading, previewKey, user, albumIdRef, currentTime, pageTitle }) {
  if (!visible) return null;

  const overlayAnim = anim === 'out' ? 'fadeOut .35s cubic-bezier(.4,0,.2,1) forwards' : 'fadeIn .4s cubic-bezier(.22,1,.36,1)'
  const panelAnim = anim === 'in' ? 'slideInRight .4s cubic-bezier(.22,1,.36,1)' : 'slideOutRight .3s cubic-bezier(.4,0,.2,1) forwards'

  return (
    <div style={s.wrap}>
      <div onClick={onClose} style={{ ...s.overlay, animation: overlayAnim, pointerEvents: anim === 'out' ? 'none' : 'auto' }} />
      <div style={{ ...s.panel, animation: panelAnim }}>
        <div style={s.phoneOuter}>
          <div style={s.phone}>
            <div style={s.screen}>
              <div style={s.statusBar}>
                <span style={{ color: '#333', fontSize: 14, fontWeight: 600 }}>{currentTime}</span>
                <div style={s.battery}>
                  <SvgSignal />
                  <SvgBattery />
                </div>
              </div>
              <div style={s.navBar}>
                <SvgClose onClick={onClose} style={{ cursor: 'pointer' }} />
                <div style={s.titleWrap}>
                  <div style={s.title}>{pageTitle}</div>
                  <div style={s.subtitle}>liqihui.com</div>
                </div>
                <SvgMenu />
              </div>
              <div style={s.content}>
                {loading ? (
                  <div style={s.loadingWrap}>
                    <div style={s.spinner} />
                    <span style={s.loadingText}>加载中...</span>
                  </div>
                ) : (
                  <iframe key={previewKey} src={`/preview/${user.id}${albumIdRef.current ? '/' + albumIdRef.current : ''}`} style={s.frame} title="预览" />
                )}
              </div>
            </div>
          </div>
          <div style={s.deco1} />
          <div style={s.deco2} />
          <div style={s.deco3} />
        </div>
      </div>
    </div>
  )
}