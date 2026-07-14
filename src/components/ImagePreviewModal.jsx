import { useEffect } from 'react'

export default function ImagePreviewModal({ album, index, onClose, onIndexChange }) {
  const urls = album?.imageUrls || (album?.imageUrl ? [album.imageUrl] : [])
  const total = urls.length
  const url = urls[index]

  useEffect(() => {
    if (total <= 1) return
    const onKey = e => {
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + total) % total)
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % total)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, total, onClose, onIndexChange])

  if (!album) return null

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
    >
      {total > 1 && (
        <button onClick={e => { e.stopPropagation(); onIndexChange((index - 1 + total) % total) }} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.14)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 26, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.28)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}>‹</button>
      )}
      {url ? (
        <img
          src={url}
          onClick={e => e.stopPropagation()}
          alt=""
          style={{ maxWidth: '90vw', maxHeight: '86vh', borderRadius: 8, objectFit: 'contain', display: 'block', boxShadow: '0 12px 48px rgba(0,0,0,.5)' }}
        />
      ) : (
        <div onClick={e => e.stopPropagation()} style={{ width: 'min(86vw, 78vh)', aspectRatio: album.ratio || '1', background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 15, boxShadow: '0 12px 48px rgba(0,0,0,.5)' }}>生成失败</div>
      )}
      {total > 1 && (
        <button onClick={e => { e.stopPropagation(); onIndexChange((index + 1) % total) }} style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.14)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 26, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.28)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}>›</button>
      )}
      <div onClick={e => { e.stopPropagation(); onClose() }} style={{ position: 'absolute', top: 22, right: 22, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,.14)', color: '#fff', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.28)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}>✕</div>
      {total > 1 && (
        <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 13, letterSpacing: 1 }}>{index + 1} / {total}</div>
      )}
    </div>
  )
}
