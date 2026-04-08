import type { PreviewDevice, SandpackDependencyMap, SandpackFileTree } from './types';
import { SANDBOX_PRESET_FILES, SANDBOX_PRESET_STYLES_CSS } from './preset-files';

export const MODEL_OPTIONS = [
  { value: 'doubao-seed-1-6-lite-251015', label: '豆包 1.6 Lite' },
  { value: 'doubao-seed-2-0-pro-260215', label: '豆包 2.0 Pro' },
  { value: 'doubao-seed-1-8-251228', label: '豆包 1.8' },
  { value: 'glm-4-7-251222', label: 'GLM-4.7' },
] as const;

export const PREVIEW_MAX_WIDTH: Record<PreviewDevice, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '420px',
};

// 默认展示的文件（预置组件文件隐藏但可用）
export const DEFAULT_ACTIVE_FILE = '/App.tsx';
export const DEFAULT_VISIBLE_FILES = ['/App.tsx', '/styles.css'];
export const DEFAULT_EXTERNAL_RESOURCES = ['https://cdn.tailwindcss.com'];

export const HISTORY_PAGE_SIZE = 10;
export const MAX_SANDBOX_DEPENDENCIES = 20; // 增大上限以容纳 Radix 包
export const MAX_EXTERNAL_RESOURCES = 8;

/**
 * Sandpack 基础预装依赖
 * 包含 shadcn 组件所需的所有运行时依赖（Radix UI 原语、CVA、工具库等）
 */
export const BASE_SANDBOX_DEPENDENCIES: SandpackDependencyMap = {
  // shadcn 核心工具
  clsx: '2.1.1',
  'tailwind-merge': '3.4.0',
  'class-variance-authority': '0.7.1',

  // 图标库
  'lucide-react': '0.554.0',

  // Radix UI 原语 —— shadcn 组件的底层依赖
  '@radix-ui/react-slot': '1.2.4',         // Button asChild
  '@radix-ui/react-label': '2.1.8',        // Label
  '@radix-ui/react-separator': '1.1.8',    // Separator
  '@radix-ui/react-tabs': '1.1.13',        // Tabs
  '@radix-ui/react-avatar': '1.1.11',      // Avatar

  // 工具库
  dayjs: '1.11.19',
};

export const ALLOWED_EXTERNAL_RESOURCE_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'esm.sh',
  'cdn.jsdelivr.net',
  'unpkg.com',
]);

/**
 * Sandpack 默认文件树
 * 合并预置组件文件 + 默认 App.tsx + styles.css
 * AI 生成代码后会覆盖 /App.tsx 和 /styles.css，但预置组件文件会保留
 */
export const SANDBOX_FILES: SandpackFileTree = {
  // 预置的 shadcn 组件、工具函数、入口文件
  ...SANDBOX_PRESET_FILES,

  // shadcn 主题 CSS 变量
  '/styles.css': {
    code: SANDBOX_PRESET_STYLES_CSS,
  },

  // 默认 App.tsx —— 演示预置 shadcn 组件
  '/App.tsx': {
    code: `import "./styles.css";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Input } from "./components/ui/input";

/**
 * 默认首页 —— 展示 Sandpack 预置的 shadcn 组件
 * AI 生成新代码时会完整替换此文件
 */
export default function App() {
  return (
    <main className="min-h-screen bg-background p-8 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl">AI Generation Studio</CardTitle>
            <Badge>Ready</Badge>
          </div>
          <CardDescription>
            Sandpack 沙箱已就绪，预置了 shadcn/ui 组件和 TailwindCSS 主题。
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            在左侧输入你的需求描述，AI 将自动生成使用 shadcn 组件和
            Tailwind CSS 的 React 代码。
          </p>
          <Separator />
          <div className="flex gap-2">
            <Input placeholder="搜索组件..." className="flex-1" />
            <Button>搜索</Button>
          </div>
        </CardContent>

        <CardFooter className="gap-2">
          <Button variant="default">开始使用</Button>
          <Button variant="outline">查看文档</Button>
          <Button variant="ghost">重置</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
`,
  },
};
