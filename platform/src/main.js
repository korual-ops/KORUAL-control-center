import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './life-os.jsx';
import './style.css';

const BUILD_ID = '2026.09.19-R6.2';
const rootElement = document.getElementById('root');

function reportBoot(stage) {
  try {
    window.__KORUAL_BOOT_STAGE__ = stage;
    fetch('/__boot?stage=' + encodeURIComponent(stage) + '&build=' + encodeURIComponent(BUILD_ID), {
      method: 'GET',
      cache: 'no-store',
      keepalive: true,
      credentials: 'omit'
    }).catch(() => {});
  } catch {}
}

reportBoot('main');

function RecoveryScreen({ error }) {
  return React.createElement(
    'main',
    { className: 'boot-recovery', role: 'alert' },
    React.createElement('section', { className: 'boot-recovery-card' },
      React.createElement('div', { className: 'boot-recovery-logo' }, '✦'),
      React.createElement('span', { className: 'boot-recovery-kicker' }, 'KORUAL BETA · ' + BUILD_ID),
      React.createElement('h1', null, '화면 연결을 복구했습니다.'),
      React.createElement('p', null, '공용 네트워크나 브라우저 캐시로 앱 초기화가 지연될 때 사용할 수 있는 안전 모드입니다.'),
      React.createElement('button', { onClick: () => window.location.reload() }, '최신 화면 다시 불러오기'),
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
    reportBoot('react-error');
    console.error('KORUAL runtime error', error);
  }

  render() {
    return this.state.error
      ? React.createElement(RecoveryScreen, { error: this.state.error })
      : this.props.children;
  }
}

if (!rootElement) {
  reportBoot('root-missing');
  document.body.innerHTML = '<main class="boot-recovery"><section class="boot-recovery-card"><h1>KORUAL</h1><p>앱을 초기화하지 못했습니다.</p></section></main>';
} else {
  window.addEventListener('error', event => {
    reportBoot('window-error');
    console.error('KORUAL window error', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', event => {
    reportBoot('promise-error');
    console.error('KORUAL promise error', event.reason);
  });

  rootElement.replaceChildren();
  reportBoot('root-cleared');

  const root = createRoot(rootElement);
  root.render(
    React.createElement(
      AppBoundary,
      null,
      React.createElement(App)
    )
  );

  requestAnimationFrame(() => reportBoot('render-scheduled'));
}
