import { describe, expect, test } from "vitest";

import { createWeChatProvider } from "./wechat-provider";

describe("createWeChatProvider", () => {
  test("returns null when wechat credentials are absent", () => {
    expect(
      createWeChatProvider({
        NODE_ENV: "test",
      }),
    ).toBeNull();
  });

  test("uses the built-in auth.js provider semantics when credentials are present", () => {
    const provider = createWeChatProvider({
      NODE_ENV: "test",
      WECHAT_CLIENT_ID: "wechat-client-id",
      WECHAT_CLIENT_SECRET: "wechat-client-secret",
    });

    expect(provider).toBeTruthy();
    expect(provider?.authorization).toMatchObject({
      url: "https://open.weixin.qq.com/connect/qrconnect",
    });
    expect(
      provider?.profile({
        city: "Shenzhen",
        country: "CN",
        headimgurl: "https://example.com/avatar.png",
        nickname: "Test User",
        openid: "openid-value",
        privilege: [],
        province: "Guangdong",
        sex: 1,
        unionid: "unionid-value",
      }),
    ).toMatchObject({
      email: null,
      id: "unionid-value",
      image: "https://example.com/avatar.png",
      name: "Test User",
    });
  });
});
