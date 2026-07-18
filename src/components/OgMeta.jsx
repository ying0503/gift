import { useEffect } from 'react'

export default function OgMeta({ title, description, image, url }) {
  useEffect(() => {
    if (title) document.title = title
    const setMeta = (prop, content) => {
      if (!content) return
      const el = document.querySelector(`meta[property="${prop}"]`) || (() => { const e = document.createElement('meta'); e.setAttribute('property', prop); document.head.appendChild(e); return e })()
      el.setAttribute('content', content)
    }
    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:image', image)
    setMeta('og:url', url || window.location.href)
    setMeta('og:type', 'website')
  }, [title, description, image, url])

  return null
}
