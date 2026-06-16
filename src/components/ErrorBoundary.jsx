import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Page Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: 200, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 40, color: '#999',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>页面出错了</div>
          <div style={{ fontSize: 12, color: '#bbb', marginBottom: 16 }}>
            {this.state.error?.message || '未知错误'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 24px', fontSize: 13, borderRadius: 8,
              background: '#f5f5f5', border: '1px solid #d9d9d9',
              cursor: 'pointer', color: '#666',
            }}
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
