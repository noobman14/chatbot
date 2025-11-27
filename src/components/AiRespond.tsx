export async function GetAiRespond(message: any, mode: string) {
  const TIMEOUT_MS = 30000; // 设置请求超时时间为 30 秒

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort, TIMEOUT_MS);
  try {
    // 发起 API 请求
    const res = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer e53df5f0-bc91-4279-a6ff-843130506fa6"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "doubao-seed-1-6-lite-251015",
        messages: [
          // 系统提示词，设定 AI 的角色和行为
          { "role": "system", "content": "你是一个智能助手，名为AI助手。你的任务是帮助用户解决问题、提供信息、给出建议，并保持友好和礼貌。你应遵守以下原则：1. 积极、耐心、乐于助人，尽量用清晰、易理解的语言回答用户问题。2. 优先提供准确、有条理的信息，必要时解释背景或给出步骤。3. 避免发表歧视、攻击或不当内容，不生成敏感或违法信息。4. 当用户提出技术、学习或计算问题时，展示详细步骤和思考过程。5. 适度使用例子、列表或表格辅助说明，让回答更直观易懂。6. 根据用户需求调整语气和风格，可以适当幽默或轻松，但保持专业。7. 当信息不确定时，要明确说明，并建议用户查证。你应随时记住这些原则，始终帮助用户完成任务、回答问题或提供建议。" },
          ...message,
        ],
        thinking: {
          type: `${mode}`
        },
      })
    });

    clearTimeout(timeoutId); // 请求成功，清除超时定时器

    if (!res.ok) {
      const errorData = await res.json();
      console.error('API Error:', errorData);
      throw new Error(`API request failed with status ${res.status}`);
    }

    const data = await res.json();
    console.log(data);
    // 返回 AI 的回复内容
    return (data?.choices?.[0]?.message) ? data?.choices?.[0]?.message : { content: "error", role: "assistant" };

  } catch (error) {
    clearTimeout(timeoutId); // 发生错误，清除超时定时器

    if (error instanceof Error) {
      // 处理超时错误
      if (error.name === 'AbortError') {
        console.error(`Error in GetAiRespond: Request timed out after ${TIMEOUT_MS}ms.`);
        return "抱歉，请求已超时，请稍后重试。";
      }
    }

    console.error('Error in GetAiRespond:', error);
    return "Sorry, I encountered an error while processing your request.";
  }
}

