import type { OAuthConfig } from "next-auth/providers";

export type WeChatProfile = {
  openid: string;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
};

const WECHAT_QRCONNECT_URL = "https://open.weixin.qq.com/connect/qrconnect";
const WECHAT_TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token";
const WECHAT_USERINFO_URL = "https://api.weixin.qq.com/sns/userinfo";

function readEnv(name: "WECHAT_CLIENT_ID" | "WECHAT_CLIENT_SECRET", env: NodeJS.ProcessEnv) {
  const value = env[name]?.trim();

  return value && value.length > 0 ? value : null;
}

export function createWeChatProvider(env: NodeJS.ProcessEnv = process.env): OAuthConfig<WeChatProfile> {
  const clientId = readEnv("WECHAT_CLIENT_ID", env) ?? "wechat-client-id-placeholder";
  const clientSecret = readEnv("WECHAT_CLIENT_SECRET", env) ?? "wechat-client-secret-placeholder";

  return {
    id: "wechat",
    name: "WeChat",
    type: "oauth",
    authorization: `${WECHAT_QRCONNECT_URL}?scope=snsapi_login&response_type=code`,
    token: WECHAT_TOKEN_URL,
    userinfo: `${WECHAT_USERINFO_URL}?lang=zh_CN`,
    checks: ["state"],
    clientId,
    clientSecret,
    profile(profile) {
      const stableIdentifier = profile.unionid ?? profile.openid;

      return {
        id: profile.openid,
        name: profile.nickname ?? "WeChat user",
        email: `${stableIdentifier}@wechat.local`,
        image: profile.headimgurl ?? null,
      };
    },
  };
}

export const wechatProvider = createWeChatProvider();
