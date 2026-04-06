import CodeRouteLegacy from './CodeRouteLegacy';
import CodeRouteSandpack from './CodeRouteSandpack';

const ENGINE_KEY = 'code-sandbox-engine';

function shouldUseLegacyEngine(): boolean {
  const envEngine = import.meta.env.VITE_CODE_SANDBOX_ENGINE;
  if (envEngine === 'legacy') {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(ENGINE_KEY) === 'legacy';
}

export default function CodeRoute() {
  if (shouldUseLegacyEngine()) {
    return <CodeRouteLegacy />;
  }

  return <CodeRouteSandpack />;
}
