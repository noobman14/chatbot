/**
 * 隐藏消息管理工具
 * 
 * 用于管理用户在前端隐藏（删除）的消息
 * 消息仍然保留在后端数据库中，仅在前端界面隐藏
 */

const HIDDEN_MESSAGES_KEY = 'hidden_messages';

interface HiddenMessagesData {
    [sessionId: string]: string[];
}

/**
 * 获取所有隐藏的消息 ID
 */
export function getHiddenMessages(): HiddenMessagesData {
    try {
        const data = localStorage.getItem(HIDDEN_MESSAGES_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

/**
 * 获取指定会话的隐藏消息 ID 列表
 */
export function getHiddenMessagesForSession(sessionId: string): string[] {
    const data = getHiddenMessages();
    return data[sessionId] || [];
}

/**
 * 隐藏单条消息
 */
export function hideMessage(sessionId: string, messageId: string): void {
    const data = getHiddenMessages();
    if (!data[sessionId]) {
        data[sessionId] = [];
    }
    if (!data[sessionId].includes(messageId)) {
        data[sessionId].push(messageId);
    }
    localStorage.setItem(HIDDEN_MESSAGES_KEY, JSON.stringify(data));
}

/**
 * 批量隐藏消息
 */
export function hideMessages(sessionId: string, messageIds: string[]): void {
    const data = getHiddenMessages();
    if (!data[sessionId]) {
        data[sessionId] = [];
    }
    messageIds.forEach(id => {
        if (!data[sessionId].includes(id)) {
            data[sessionId].push(id);
        }
    });
    localStorage.setItem(HIDDEN_MESSAGES_KEY, JSON.stringify(data));
}

/**
 * 取消隐藏消息（恢复显示）
 */
export function unhideMessage(sessionId: string, messageId: string): void {
    const data = getHiddenMessages();
    if (data[sessionId]) {
        data[sessionId] = data[sessionId].filter(id => id !== messageId);
        localStorage.setItem(HIDDEN_MESSAGES_KEY, JSON.stringify(data));
    }
}

/**
 * 清除指定会话的所有隐藏消息记录
 */
export function clearHiddenMessagesForSession(sessionId: string): void {
    const data = getHiddenMessages();
    delete data[sessionId];
    localStorage.setItem(HIDDEN_MESSAGES_KEY, JSON.stringify(data));
}

/**
 * 过滤掉隐藏的消息
 */
export function filterHiddenMessages<T extends { id: string | number }>(
    sessionId: string,
    messages: T[]
): T[] {
    const hiddenIds = getHiddenMessagesForSession(sessionId);
    return messages.filter(msg => !hiddenIds.includes(msg.id.toString()));
}
