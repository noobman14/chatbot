/**
 * 封禁对话框组件
 */

import { Button } from '@/components/ui/button';

interface BanDialogProps {
    isOpen: boolean;
    banDays: string;
    onBanDaysChange: (days: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export function BanDialog({
    isOpen,
    banDays,
    onBanDaysChange,
    onConfirm,
    onCancel,
}: BanDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 w-96 space-y-4">
                <h3 className="text-lg font-semibold text-white">封禁用户</h3>
                <p className="text-sm text-zinc-400">请选择封禁时长</p>

                <div className="grid grid-cols-4 gap-2">
                    {[1, 3, 7, 30].map(d => (
                        <button
                            key={d}
                            onClick={() => onBanDaysChange(String(d))}
                            className={`py-2 rounded-lg text-sm font-medium transition-colors ${banDays === String(d)
                                ? 'bg-amber-500 text-white'
                                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                        >
                            {d}天
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onBanDaysChange('0')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${banDays === '0'
                            ? 'bg-red-500 text-white'
                            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                            }`}
                    >
                        永久封禁
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">自定义:</span>
                    <input
                        type="number"
                        min="1"
                        value={banDays === '0' ? '' : banDays}
                        onChange={(e) => onBanDaysChange(e.target.value || '0')}
                        placeholder="输入天数"
                        className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm"
                    />
                    <span className="text-sm text-zinc-400">天</span>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        variant="ghost"
                        className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        onClick={onCancel}
                    >
                        取消
                    </Button>
                    <Button
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                        onClick={onConfirm}
                    >
                        {parseInt(banDays) > 0 ? `封禁 ${banDays} 天` : '永久封禁'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
