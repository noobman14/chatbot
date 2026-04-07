import { History, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { formatHistoryTime } from '../helpers';
import type { SandpackHistoryRecord } from '../types';

type SandpackHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  records: SandpackHistoryRecord[];
  deletingId: string | null;
  hasMore: boolean;
  onApply: (record: SandpackHistoryRecord) => void;
  onDelete: (recordId: string) => void;
  onLoadMore: () => void;
};

export function SandpackHistorySheet(props: SandpackHistorySheetProps) {
  const {
    open,
    onOpenChange,
    loading,
    loadingMore,
    error,
    records,
    deletingId,
    hasMore,
    onApply,
    onDelete,
    onLoadMore,
  } = props;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <History className="size-4" />
          <span>历史记录</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>历史记录</SheetTitle>
          <SheetDescription>最近的 Sandpack 生成记录，可点击回放。</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-4">
          {loading && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              历史加载中...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && records.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              暂无历史数据
            </div>
          )}

          {!loading && !error && records.map((record) => (
            <div key={record.id} className="rounded-lg border border-border bg-card p-3">
              <button
                type="button"
                className="w-full text-left transition-colors hover:text-primary"
                onClick={() => onApply(record)}
              >
                <p className="truncate text-sm font-medium">{record.title || '未命名页面'}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{record.prompt}</p>
              </button>

              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{record.model || '-'}</span>
                  <span>{formatHistoryTime(record.createdAt)}</span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  disabled={deletingId === record.id}
                  onClick={() => onDelete(record.id)}
                >
                  {deletingId === record.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                  删除
                </Button>
              </div>
            </div>
          ))}

          {!loading && !error && hasMore && (
            <Button
              type="button"
              variant="outline"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  加载中...
                </>
              ) : '加载更多'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
