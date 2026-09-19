import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './life-os.jsx';
import './style.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('KORUAL root element was not found.');
}

createRoot(rootElement).render(React.createElement(App));
