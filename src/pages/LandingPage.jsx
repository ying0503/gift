import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f7f7fc 0%, #f5f0ff 45%, #eef0ff 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  container: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: 0,
  },
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    background: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
  },
  navInner: {
    padding: '0 50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111',
    letterSpacing: -0.5,
  },
  logoBadge: {
    fontSize: 11,
    color: '#fff',
    background: '#111',
    padding: '3px 10px',
    borderRadius: 999,
    marginLeft: 6,
    letterSpacing: 0.5,
    display: 'inline-block',
  },
  navCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: 32,
  },
  navLink: {
    fontSize: 14,
    color: '#666',
    cursor: 'pointer',
    transition: 'color 0.2s',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  navCta: {
    padding: '10px 24px',
    background: 'linear-gradient(90deg, #ff7db8, #8f7cff)',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  hero: {
    minHeight: 760,
    display: 'flex',
    alignItems: 'center',
    paddingTop: 72,
  },
  heroInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
  },
  heroLeft: {
    flex: '0 0 45%',
  },
  heroTitle1: {
    fontSize: 72,
    fontWeight: 900,
    color: '#111',
    lineHeight: 1.1,
    letterSpacing: -2,
    margin: 0,
  },
  heroTitle2: {
    fontSize: 72,
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: -2,
    margin: '0 0 20px 0',
    background: 'linear-gradient(90deg, #ff72c3, #8f7cff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroDesc: {
    fontSize: 18,
    color: '#666',
    lineHeight: 1.6,
    marginBottom: 40,
  },
  heroCta: {
    padding: '14px 28px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  heroRight: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minWidth: 0,
  },

  section: {
    padding: '80px 0',
    maxWidth: 1280,
    margin: '0 auto',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: 48,
  },
  sectionTag: {
    display: 'inline-block',
    padding: '4px 16px',
    background: 'linear-gradient(90deg, #ff7db8, #8f7cff)',
    color: '#fff',
    borderRadius: 999,
    fontSize: 13,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: '#111',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  videoCard: {
    background: '#fff',
    borderRadius: 32,
    overflow: 'hidden',
    boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
    aspectRatio: '1200/680',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
  },

  showcaseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 24,
    marginBottom: 40,
  },
  showcaseCard: {
    borderRadius: 24,
    overflow: 'hidden',
    aspectRatio: '380/620',
    position: 'relative',
    cursor: 'pointer',
    background: '#fff',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },
  showcaseOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
    color: '#fff',
  },
  showcaseOverlayTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },
  showcaseOverlayDesc: {
    fontSize: 13,
    opacity: 0.8,
  },
  ctaBtn: {
    padding: '12px 32px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  avatarsRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: (index) => ({
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: '3px solid #fff',
    overflow: 'hidden',
    marginLeft: index === 0 ? 0 : -12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flexShrink: 0,
  }),
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  usersTitle: {
    fontSize: 30,
    fontWeight: 700,
    color: '#111',
    marginBottom: 12,
    textAlign: 'center',
  },
  usersHighlight: {
    color: '#111',
  },
  usersDesc: {
    fontSize: 17,
    color: '#888',
    textAlign: 'center',
    marginBottom: 40,
  },
  testimonials: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 24,
  },
  testimonialCard: {
    background: '#fff',
    borderRadius: 24,
    padding: 32,
    boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
  },
  testimonialText: {
    fontSize: 16,
    lineHeight: 1.8,
    color: '#555',
    marginBottom: 20,
    flex: 1,
  },
  testimonialAuthor: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  authorName: {
    fontWeight: 600,
    color: '#111',
  },
  authorTitle: {
    fontSize: 13,
    color: '#999',
  },
  ctaSection: {
    textAlign: 'center',
    padding: '60px 0 80px',
    maxWidth: 1280,
    margin: '0 auto',
  },
  ctaDesc: {
    fontSize: 26,
    color: '#666',
    lineHeight: 1.8,
    marginBottom: 40,
  },
  qrWrapper: {
    display: 'inline-block',
    textAlign: 'center',
  },
  qrLabel: {
    fontSize: 24,
    color: '#555',
    marginBottom: 12,
  },
  qrBox: {
    display: 'inline-block',
    padding: 6,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    marginBottom: 8,
  },
  qrImage: {
    display: 'block',
    maxWidth: '100%',
  },
  qrTip: {
    fontSize: 16,
    color: '#555',
  },
  footer: {
    borderTop: '1px solid rgba(0,0,0,0.06)',
    padding: '32px 0 24px',
  },
  footerInner: {
    maxWidth: 1280,
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  footerLogo: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111',
  },
  footerCopyright: {
    fontSize: 12,
    color: '#aaa',
    lineHeight: 1.8,
  },
  footerRight: {
    display: 'flex',
    gap: 12,
  },
  socialCircle: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#f0f0f0',
    border: '1px solid #5A6080',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    fontSize: 12,
    color: '#666',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
}

const showcaseItems = [
  {
    bg: 'linear-gradient(135deg, #667eea, #764ba2)',
    title: '慢炖锅',
    desc: '智能厨房家电',
    img: 'https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/image/index061103.avif',
  },
  {
    bg: 'linear-gradient(135deg, #f6d365, #fda085)',
    title: '柠檬冰茶',
    desc: '夏日清爽海报',
    img: 'https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/image/index061101.avif',
  },
  {
    bg: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    title: '商务背包',
    desc: '城市通勤系列',
    img: 'https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/image/index061102.avif',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  const navItems = ['首页', '核心功能', '客户心声', '版本定价']
  const [activeNav, setActiveNav] = useState('首页')

  return (
    <div style={styles.page}>
      {/* Fixed Navbar */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.navLeft}>
            <img src="https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/site/logo-64.png" alt="logo" style={{ height: 36, display: 'block' }} />
            <div>
              <span style={styles.logoText}>Ligent</span>
              <span style={styles.logoBadge}>礼企AI智能体</span>
            </div>
          </div>
          <div style={styles.navCenter}>
            {navItems.map((item) => (
              <button
                key={item}
                style={{
                  ...styles.navLink,
                  color: activeNav === item ? '#7B61FF' : '#666',
                }}
                onClick={() => setActiveNav(item)}
                onMouseEnter={(e) => { e.target.style.color = '#7B61FF' }}
                onMouseLeave={(e) => { e.target.style.color = activeNav === item ? '#7B61FF' : '#666' }}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            style={styles.navCta}
            onClick={() => navigate('/auth')}
            onMouseEnter={(e) => { e.target.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.target.style.opacity = '1' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <path d="M6.9087987,2.1813321L8.775465,7.2245321L13.818132,9.0911989L8.775466,10.956798L6.9087996,15.999997L5.0432005,10.956797L0,9.091732L5.0431991,7.2250652L6.9087987,2.1823981L6.9087987,2.1813321ZM13.090667,0L13.876266,2.1237338L16,2.9093328L13.876266,3.6943991L13.090667,5.8181319L12.3056,3.6943991L10.181867,2.9087985L12.3056,2.1237323L13.090667,0Z" fill="#FFFFFF" />
            </svg>
            去创作
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={{ ...styles.container, width: '100%' }}>
          <div style={styles.heroInner}>
            <div style={styles.heroLeft}>
              <h1 style={styles.heroTitle1}>超级礼业AI设计</h1>
              <h1 style={styles.heroTitle2}>智能体</h1>
              <p style={styles.heroDesc}>
                让生成图海报、奖章包装和营销物料设计<br />
                像点外卖一样简单高效
              </p>
              <button
                style={styles.heroCta}
                onClick={() => navigate('/auth')}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'none'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                  <path d="M6.9087987,2.1813321L8.775465,7.2245321L13.818132,9.0911989L8.775466,10.956798L6.9087996,15.999997L5.0432005,10.956797L0,9.091732L5.0431991,7.2250652L6.9087987,2.1823981L6.9087987,2.1813321ZM13.090667,0L13.876266,2.1237338L16,2.9093328L13.876266,3.6943991L13.090667,5.8181319L12.3056,3.6943991L10.181867,2.9087985L12.3056,2.1237323L13.090667,0Z" fill="#FFFFFF" />
                </svg>
                立即创作
              </button>
            </div>
            <div style={styles.heroRight}>
              <img
                src="https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/image/061106.avif"
                alt="产品演示"
                style={{ zoom: 0.5, display: 'block', position: 'relative', right: -140 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTag}>核心功能</span>
          <h2 style={styles.sectionTitle}>满足礼业全场景AI创作需求</h2>
          <p style={styles.sectionSubtitle}>
            AI智能生成海报、主图、详情页、宣传页、电商图、PPT
          </p>
        </div>
        <div style={styles.videoCard}>
          <video
            src="https://coohom-biz-sg-s3.coohom.com/ins/static/homepage/video/compressoed.webm"
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
            controls
            muted
            loop
            playsInline
          />
        </div>
      </section>

      {/* Showcase Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTag}>案例</span>
          <h2 style={styles.sectionTitle}>AI全链路赋能 专属智能化增收专家</h2>
          <p style={styles.sectionSubtitle}>帮您提升营销效率 打造爆款营销内容</p>
        </div>
        <div style={styles.showcaseGrid}>
          {showcaseItems.map((item, i) => (
            <div key={i} style={styles.showcaseCard}>
              <img src={item.img} alt={item.title} style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }} />
              <div style={styles.showcaseOverlay}>
                <div style={styles.showcaseOverlayTitle}>{item.title}</div>
                <div style={styles.showcaseOverlayDesc}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button
            style={styles.ctaBtn}
            onClick={() => navigate('/auth')}
            onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)' }}
            onMouseLeave={(e) => { e.target.style.transform = 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <path d="M6.9087987,2.1813321L8.775465,7.2245321L13.818132,9.0911989L8.775466,10.956798L6.9087996,15.999997L5.0432005,10.956797L0,9.091732L5.0431991,7.2250652L6.9087987,2.1823981L6.9087987,2.1813321ZM13.090667,0L13.876266,2.1237338L16,2.9093328L13.876266,3.6943991L13.090667,5.8181319L12.3056,3.6943991L10.181867,2.9087985L12.3056,2.1237323L13.090667,0Z" fill="#FFFFFF" />
            </svg>
            去创作
          </button>
        </div>
      </section>

      {/* Users + Testimonials Section */}
      <section style={styles.section}>
        <div style={styles.avatarsRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} style={styles.avatar(i - 1)}>
              <img
                style={styles.avatarImg}
                src={`https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/image/avatar-${i}.jpg`}
                alt={`user${i}`}
              />
            </div>
          ))}
        </div>
        <h2 style={styles.usersTitle}>
          <span style={styles.usersHighlight}>礼品行业</span> 用户
        </h2>
        <p style={styles.usersDesc}>
          使用礼企AI智能体来提升整体营销效率
        </p>
        <div style={styles.testimonials}>
          <div style={styles.testimonialCard}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" width="41" height="46" viewBox="0 0 41.035 46.249" style={{ marginBottom: 16 }}>
              <path d="M0.0095834732,46.248901L0.0095834732,24.206242C-0.065563202,21.034714,0.30123377,18.056532,1.1097789,15.271758C1.918324,12.486985,3.0517225,10.036792,4.5187149,7.9201465C5.9809704,5.8098326,7.7301893,4.056869,9.7757463,2.6614373C11.816616,1.2720326,14.031166,0.3809104,16.419888,0L16.419888,9.5088024C13.490591,10.757518,11.487368,12.603991,10.410562,15.054668C9.3290186,17.505348,8.7931786,20.506723,8.7931786,24.059282L16.419643,24.059282L16.419643,46.248535L0.0096340179,46.248535L0.0095834732,46.248901ZM24.624819,46.248901L24.624819,24.206242C24.544838,21.034714,24.911684,18.056532,25.720278,15.27182C26.529165,12.487106,27.66691,10.036854,29.129213,7.9202085C30.591471,5.8098946,32.345421,4.0569305,34.386246,2.661499C36.427116,1.2720944,38.6464,0.38097224,41.035072,0.000061828578L41.035072,9.5088644C38.105728,10.75758,36.102554,12.604053,35.025742,15.05473C33.944199,17.505411,33.408363,20.506786,33.408363,24.059343L41.035118,24.059343L41.035118,46.248596L24.624819,46.248901L24.624819,46.248901Z" fill="#DDDDDD" />
            </svg>
            <p style={styles.testimonialText}>
              作为品牌方，我们每年需要为经销商、礼品渠道和销售团队提供大量营销素材。过去设计一张海报、一套产品画册往往需要反复沟通和修改。使用礼企AI设计智能体后，只需上传产品资料，即可快速生成高品质宣传海报、电子画册和产品PPT，大幅提升了品牌传播效率。
            </p>
            <div style={styles.testimonialAuthor}>
              <span style={styles.authorName}>张总</span>
              <span style={styles.authorTitle}>礼品公司市场总监</span>
            </div>
          </div>
          <div style={styles.testimonialCard}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" width="41" height="46" viewBox="0 0 41.035 46.249" style={{ marginBottom: 16 }}>
              <path d="M0.0095834732,46.248901L0.0095834732,24.206242C-0.065563202,21.034714,0.30123377,18.056532,1.1097789,15.271758C1.918324,12.486985,3.0517225,10.036792,4.5187149,7.9201465C5.9809704,5.8098326,7.7301893,4.056869,9.7757463,2.6614373C11.816616,1.2720326,14.031166,0.3809104,16.419888,0L16.419888,9.5088024C13.490591,10.757518,11.487368,12.603991,10.410562,15.054668C9.3290186,17.505348,8.7931786,20.506723,8.7931786,24.059282L16.419643,24.059282L16.419643,46.248535L0.0096340179,46.248535L0.0095834732,46.248901ZM24.624819,46.248901L24.624819,24.206242C24.544838,21.034714,24.911684,18.056532,25.720278,15.27182C26.529165,12.487106,27.66691,10.036854,29.129213,7.9202085C30.591471,5.8098946,32.345421,4.0569305,34.386246,2.661499C36.427116,1.2720944,38.6464,0.38097224,41.035072,0.000061828578L41.035072,9.5088644C38.105728,10.75758,36.102554,12.604053,35.025742,15.05473C33.944199,17.505411,33.408363,20.506786,33.408363,24.059343L41.035118,24.059343L41.035118,46.248596L24.624819,46.248901L24.624819,46.248901Z" fill="#DDDDDD" />
            </svg>
            <p style={styles.testimonialText}>
              礼企AI设计智能体让我们的市场团队拥有了更强的内容生产能力。很多日常推广物料无需再排期设计制作，营销活动响应速度更快，同时节省了大量设计和沟通成本，实现了降本增效。
            </p>
            <div style={styles.testimonialAuthor}>
              <span style={styles.authorName}>李总</span>
              <span style={styles.authorTitle}>礼品公司创始人</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section style={styles.ctaSection}>
        <p style={styles.ctaDesc}>
          礼企汇升级AI.Agent生态核心礼业设计生产力底座，重构礼业AI.设计出图<br />
          垂直礼业深度训练，比通用AI更懂礼业设计逻辑
        </p>
        <div style={styles.qrWrapper}>
          <p style={styles.qrLabel}>扫码联系专属客服</p>
          <div style={styles.qrBox}>
            <img
              src="https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/image/qrcode01.avif"
              alt="扫码联系专属客服"
              style={styles.qrImage}
            />
          </div>
          <p style={styles.qrTip}>请使用 微信 扫一扫</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLeft}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/site/logo-64.png" alt="logo" style={{ height: 24, display: 'block' }} />
              <span style={styles.footerLogo}>Ligent</span>
              <span style={{ fontSize: 11, color: '#fff', background: '#111', padding: '3px 10px', borderRadius: 999, display: 'inline-block' }}>礼企AI智能体</span>
            </div>
            <div style={styles.footerCopyright}>
              © 2026 杭州吾皇文化创意有限公司
            </div>
          </div>
              <div style={{ ...styles.footerRight, gap: 16 }}>
            <button key="douyin" style={styles.socialCircle}
              onMouseEnter={(e) => { e.target.style.background = '#e8e0ff' }}
              onMouseLeave={(e) => { e.target.style.background = '#f0f0f0' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z"/>
              </svg>
            </button>
            <button key="xiaohongshu" style={styles.socialCircle}
              onMouseEnter={(e) => { e.target.style.background = '#e8e0ff' }}
              onMouseLeave={(e) => { e.target.style.background = '#f0f0f0' }}>
              <svg viewBox="0 0 1614 1024" width="34" height="34" fill="currentColor">
                <path d="M1077.76 271.714v97.714h-64.59v312.635h80.738c16.147 0 20.204 7.877 24.3 23.512 4.057 78.179 4.057 78.179-68.647 78.179H746.81c20.244-35.21 32.295-66.481 52.5-93.814 4.096-3.939 16.147-7.877 28.2-7.877h80.698V369.428h-64.59v-97.674h234.141zM742.754 682.22c-20.243 35.21-32.295 62.543-48.443 93.775-4.056 3.939-12.051 11.697-16.147 11.697H524.76c20.243-39.148 40.448-74.2 52.5-101.69h165.493v-3.782z m585.256-445.715c-4.096 27.293 8.152 35.21 36.352 39.148 80.66 0 121.108 42.93 125.204 121.305v66.441c64.55-3.938 104.999 23.552 125.203 74.201v175.892c-32.295 62.503-64.59 78.139-133.199 70.42-44.307-7.878-68.608-31.272-76.603-82.078h80.7c16.147 0 24.3-3.939 24.3-23.552v-78.179c0-23.512-12.052-35.21-36.352-35.21h-145.25v218.86h-105V560.956H1118.01V459.264h100.903v-86.055h-68.647v-97.753c20.244 0 44.347-3.938 68.647-3.938v-35.21h109.096v0.197z m-1009.152 0V689.94c0 66.48-44.308 97.752-104.96 89.836-40.448-7.877-64.59-35.21-64.59-82.078h68.646V236.505h100.904zM141.39 377.147c-4.096 31.271-8.153 58.565-8.153 89.836v27.333c-4.096 82.078-12.052 164.234-68.647 242.334-20.205-35.21-40.448-70.42-60.456-105.433C0 627.28 0 623.301 0 615.582 8.153 584.31 16.148 549.1 20.204 513.89c4.096-42.929 8.192-89.836 12.091-136.9h109.056v0.157z m355.249-3.741c4.057 62.503 4.057 125.046 16.148 183.768 16.108 66.481-8.192 121.305-44.347 175.892-48.443-42.93-76.643-168.172-76.643-355.722H496.64v-3.938z m266.358-136.901c-24.3 50.806-52.5 97.713-72.704 144.62 44.308-3.939 80.7-3.939 125.204-7.877-24.3 46.868-44.347 86.016-68.648 128.945-4.056 3.939-4.056 11.697-8.152 15.636-24.3 42.93-24.3 42.93 28.2 42.93h20.204c-12.052 27.332-24.3 50.884-40.448 74.2-4.057 3.938-8.153 7.916-12.052 7.916h-44.308c-20.244 0-44.347 0-64.59-3.938-28.16-3.939-36.313-23.552-24.262-46.868 12.052-31.271 28.2-58.604 40.41-89.876 4.095-11.658 8.191-19.574 16.147-35.21h-48.443c-44.308 0-56.557-19.574-40.409-58.565 24.3-54.784 56.596-113.348 88.852-171.913h105z m564.972 132.923v74.2c0 3.939 12.092 15.636 16.148 15.636 12.052 0 36.352-3.938 36.352-7.877 4.096-23.552 4.096-46.907-4.056-70.459 0-7.522-24.3-7.522-48.444-11.5z m286.602-62.504v31.272c-24.3 39.148-60.455 39.148-100.903 35.21-12.052-50.846-4.057-82.117 24.3-93.815 28.2-15.793 48.246-3.938 76.603 27.333z"/>
              </svg>
            </button>
            <button key="wechat" style={styles.socialCircle}
              onMouseEnter={(e) => { e.target.style.background = '#e8e0ff' }}
              onMouseLeave={(e) => { e.target.style.background = '#f0f0f0' }}>
              <svg viewBox="0 0 1307 1024" width="34" height="34" fill="#666">
                <path d="M1208.849121 916.353531c61.28479-55.978748 98.493413-129.600087 98.493413-210.185606 0-140.278497-112.753402-259.332825-268.950027-301.449537-9.3519-224.777223-238.108655-404.585737-519.063602-404.585737C232.53731 0 0 187.568601 0 418.978377c0 106.120849 49.014567 203.221426 129.799063 277.108067 25.336353 23.081285-4.311159 86.22319-40.65755 138.554033a719.565682 719.565682 0 0 1 184.451301-27.989374 315.6432 315.6432 0 0 1 73.952966 7.760088 632.214958 632.214958 0 0 0 172.048427 23.479237c11.739619 0 23.280261-0.331628 34.820904-0.928557 61.815395 110.233032 199.374545 187.037996 359.219073 187.037996a479.201959 479.201959 0 0 0 129.931715-17.841567 240.894327 240.894327 0 0 1 56.111399-5.902973 543.869351 543.869351 0 0 1 139.880544 21.290496c-27.591421-39.795318-50.00945-87.616026-30.841372-105.192292zM519.594207 761.350766a554.415111 554.415111 0 0 1-150.956908-20.560914l-1.32651-0.397954-1.326511-0.331627a391.320631 391.320631 0 0 0-92.391464-9.749853c-19.566032 0-39.065738 1.061208-58.167491 2.918323 4.045857-44.836059-13.265106-74.417245-33.958671-93.452673a336.602068 336.602068 0 0 1-77.799848-103.1362 270.67449 270.67449 0 0 1-27.193467-117.661491c0-88.345607 43.907501-172.44638 123.697114-236.715819a462.089972 462.089972 0 0 1 141.737659-76.937615 561.379291 561.379291 0 0 1 354.907915 0 463.615459 463.615459 0 0 1 141.737659 76.937615c71.167294 57.238933 113.748285 130.528644 122.105302 208.394817q-23.280261-2.321394-47.290104-2.321393c-217.614066 0-393.774675 142.268263-393.774675 317.831943a257.939989 257.939989 0 0 0 5.969298 55.116516h-5.969298z m637.918954 98.559739a97.631181 97.631181 0 0 0-31.637279 64.601066c-8.555993-0.530604-17.178312-0.795906-25.800631-0.795906a315.444224 315.444224 0 0 0-74.284594 8.091715l-1.326511 0.331627-1.326511 0.397954a403.325552 403.325552 0 0 1-109.503451 14.923244 397.289928 397.289928 0 0 1-128.671529-20.892542 332.821513 332.821513 0 0 1-101.876015-55.249167c-56.111399-45.234012-86.952771-103.865781-86.952771-165.150571s30.841372-119.982885 86.952771-165.150572a330.03584 330.03584 0 0 1 101.809689-55.249167 406.442852 406.442852 0 0 1 257.276734 0 329.637887 329.637887 0 0 1 101.94234 55.249167c56.045073 45.167686 86.886445 103.865781 86.886445 165.150572a187.037996 187.037996 0 0 1-18.770125 81.3151 236.715819 236.715819 0 0 1-54.784888 72.42748zM291.434382 337.066347c0.397953-44.172803 28.055699-79.590637 62.080696-79.590637s62.080697 36.147414 62.080697 80.718171-27.790397 80.386543-61.815395 80.386543-61.682743-35.61681-62.080696-79.590637z m322.939008 0c0.464279-44.172803 28.055699-79.590637 62.080697-79.590637s62.014371 35.948438 62.014371 80.519194-27.724072 80.58552-62.014371 80.58552-61.616418-35.61681-62.080697-79.590637z m143.130495 310.00553c0.464279-33.892346 21.688449-61.218465 47.887033-61.218465s47.820708 27.856723 47.820708 62.213348-21.423146 62.213348-47.820708 62.213347-47.422754-27.326119-47.887033-61.218464z m230.547545 0c0.397953-33.892346 21.688449-61.218465 47.887033-61.218465s47.820708 27.856723 47.820707 62.213348-21.423146 62.213348-47.820707 62.213347-47.48908-27.326119-47.887033-61.218464z"/>
              </svg>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
