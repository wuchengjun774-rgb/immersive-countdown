import WeChat from "next-auth/providers/wechat";

function readEnv(name: "WECHAT_CLIENT_ID" | "WECHAT_CLIENT_SECRET", env: NodeJS.ProcessEnv) {
  const value = env[name]?.trim();

  return value && value.length > 0 ? value : null;
}

export function createWeChatProvider(env: NodeJS.ProcessEnv = process.env) {
  const clientId = readEnv("WECHAT_CLIENT_ID", env);
  const clientSecret = readEnv("WECHAT_CLIENT_SECRET", env);

  if (!clientId || !clientSecret) {
    return null;
  }

  return WeChat({
    clientId,
    clientSecret,
    platformType: "WebsiteApp",
  });
}

export const wechatProvider = createWeChatProvider();
