import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './life-os.jsx';
import './style.css';

const rootElement = document.getElementById('root');

function RecoveryScreen({ error }) {
  return React.createElement(
    'main',
    { className: 'boot-recovery', role: 'alert' },
    React.createElement('section', { className: 'boot-recovery-card' },
      React.createElement('div', { className: 'boot-recovery-logo' }, '✦'),
      React.createElement('span', { className: 'boot-recovery-kicker' }, 'KORUAL BETA'),
      React.createElement('h1', null, '화면을 다시 연결하고 있습니다.'),
      React.createElement('p', null, '브라우저 보안 설정이나 공용 네트워크 환경에서도 사용할 수 있도록 안전 모드로 전환했습니다.'),
      React.createElement('button', { onClick: () => window.location.reload() }, '다시 불러오기'),
      error ? React.createElement('small', null, 'RUNTIME_RECOVERY') : null
    )
  );
}

class AppBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('KORUAL runtime error', error);
  }

  render() {
    return this.state.error
      ? React.createElement(RecoveryScreen, { error: this.state.error })
      : this.props.children;
  }
}

if (!rootElement) {
  document.body.innerHTML = '<main class="boot-recovery"><section class="boot-recovery-card"><h1>KORUAL</h1><p>앱을 초기화하지 못했습니다.</p></section></main>';
} else {
  window.addEventListener('error', event => {
    console.error('KORUAL window error', event.error || event.message);
  });

  createRoot(rootElement).render(
    React.createElement(
      AppBoundary,
      null,
      React.createElement(App)
    )
  );
}
