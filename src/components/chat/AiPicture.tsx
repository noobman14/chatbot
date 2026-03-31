export type messages = message[]

export interface message {
  role: string
  content: string
}

export async function GetAiPicture(messages: messages, mode: string) {
  if (mode != 'picture') { return; }
  const prompt = messages[messages.length - 1].content;
  console.log(prompt);
  const TIMEOUT_MS = 200000; // 设置请求超时时间为 200 秒

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort, TIMEOUT_MS);
  try {
    // 发起 API 请求
    const res = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer e53df5f0-bc91-4279-a6ff-843130506fa6"
      },
      signal: controller.signal,
      body: JSON.stringify({
        response_format: "url",
        size: "2K",
        watermark: false,
        model: "doubao-seedream-4-0-250828",
        prompt: prompt
      })
    });

    clearTimeout(timeoutId); // 请求成功，清除超时定时器

    if (!res.ok) {
      const errorData = await res.json();
      console.error('API Error:', errorData);
      throw new Error(`API request failed with status ${res.status}`);
    }

    const data = await res.json();
    const imageUrl = data.data?.[0]?.url;
    console.log(imageUrl);
    console.log(data);
    // 返回 AI 的回复内容
    const returnMsg = imageUrl ? imageUrl : 'error: 无法获取图片 URL';;

    return returnMsg && { content: returnMsg, role: 'assistant' };

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

