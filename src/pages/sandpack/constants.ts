import type { PreviewDevice, SandpackDependencyMap, SandpackFileTree } from './types';

export const MODEL_OPTIONS = [
  { value: 'doubao-seed-1-6-lite-251015', label: '豆包 1.6 Lite' },
  { value: 'doubao-seed-2-0-pro-260215', label: '豆包 2.0 Pro' },
  { value: 'doubao-seed-1-8-251228', label: '豆包 1.8' },
  { value: 'glm-4-7-251222', label: 'GLM-4.7' },
] as const;

export const EXAMPLE_PROMPTS = [
  '做一个招聘官网首页，强调大标题、统计数字、CTA 区块。',
  '做一个数据看板页面，包含 KPI 卡片、图表区域和筛选栏。',
  '做一个课程详情页，包含章节目录、讲师信息和购买按钮。',
  '做一个产品对比页面，支持三列功能对比与价格方案。',
];

export const PREVIEW_MAX_WIDTH: Record<PreviewDevice, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '420px',
};

export const DEFAULT_ACTIVE_FILE = '/App.tsx';
export const DEFAULT_VISIBLE_FILES = ['/App.tsx', '/styles.css'];
export const DEFAULT_EXTERNAL_RESOURCES = ['https://cdn.tailwindcss.com'];

export const HISTORY_PAGE_SIZE = 10;
export const MAX_SANDBOX_DEPENDENCIES = 12;
export const MAX_EXTERNAL_RESOURCES = 8;

export const BASE_SANDBOX_DEPENDENCIES: SandpackDependencyMap = {
  clsx: '2.1.1',
  'tailwind-merge': '3.4.0',
  'class-variance-authority': '0.7.1',
  'lucide-react': '0.554.0',
  '@radix-ui/react-slot': '1.2.4',
  dayjs: '1.11.19',
};

export const ALLOWED_EXTERNAL_RESOURCE_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'esm.sh',
  'cdn.jsdelivr.net',
  'unpkg.com',
]);

export const SANDBOX_FILES: SandpackFileTree = {
  '/App.tsx': {
    code: `import './styles.css';

export default function App() {
	return (
		<main className="page">
			<section className="hero-card">
				<p className="badge">Sandpack Ready</p>
				<h1>AI Generation Studio</h1>
				<p>
					This is a new sandbox workspace page. You can edit code in real time and
					preview the result on the right side.
				</p>
				<div className="actions">
					<button>Primary Action</button>
					<button className="ghost">Secondary</button>
				</div>
			</section>
		</main>
	);
}
`,
  },
  '/styles.css': {
    code: `:root {
	font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

* {
	box-sizing: border-box;
}

body {
	margin: 0;
	min-height: 100vh;
	background:
		radial-gradient(circle at 10% 0%, #d7f3ff 0%, transparent 38%),
		radial-gradient(circle at 95% 100%, #d3fae5 0%, transparent 36%),
		#f8fafc;
	color: #0f172a;
}

.page {
	min-height: 100vh;
	display: grid;
	place-items: center;
	padding: 28px;
}

.hero-card {
	width: min(720px, 94vw);
	border-radius: 20px;
	border: 1px solid #dbe4ee;
	padding: 30px;
	background: rgba(255, 255, 255, 0.86);
	box-shadow: 0 24px 80px rgba(15, 23, 42, 0.14);
	backdrop-filter: blur(4px);
}

.badge {
	display: inline-flex;
	margin: 0;
	border-radius: 999px;
	padding: 6px 10px;
	font-size: 12px;
	letter-spacing: 0.04em;
	color: #0f766e;
	background: #ccfbf1;
}

h1 {
	margin: 14px 0 10px;
	font-size: clamp(28px, 5vw, 44px);
	line-height: 1.1;
}

p {
	margin: 0;
	color: #334155;
	line-height: 1.6;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	margin-top: 20px;
}

button {
	border: 0;
	border-radius: 12px;
	padding: 10px 16px;
	font-weight: 600;
	cursor: pointer;
	background: #0f172a;
	color: #fff;
}

button.ghost {
	border: 1px solid #cbd5e1;
	background: #fff;
	color: #0f172a;
}
`,
  },
};
