"use client";

import { useEffect, useId, useState } from "react";
import styles from "./AuthExperience.module.css";

type WxLoginOptions = {
  self_redirect: boolean;
  id: string;
  appid: string;
  scope: "snsapi_login";
  redirect_uri: string;
  state: string;
  style: "white";
  onCleanup?: () => void;
};

declare global {
  interface Window {
    WxLogin?: (options: WxLoginOptions) => void;
  }
}

const WX_SCRIPT = "https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js";

function verifiedQrOptions(authorizeUrl: string, id: string): WxLoginOptions {
  const url = new URL(authorizeUrl);
  if (url.origin !== "https://open.weixin.qq.com" || url.pathname !== "/connect/qrconnect") {
    throw new Error("微信网站登录地址异常");
  }
  const appid = url.searchParams.get("appid") || "";
  const redirect = url.searchParams.get("redirect_uri") || "";
  const state = url.searchParams.get("state") || "";
  if (!/^wx[0-9a-f]{16}$/.test(appid) ||
      !/^wqs_[0-9a-f]{48}$/.test(state) ||
      url.searchParams.get("scope") !== "snsapi_login" ||
      new URL(redirect).origin !== "https://socthink.cn" ||
      new URL(redirect).pathname !== "/api/auth/parent/wechat/callback") {
    throw new Error("微信网站应用授权参数异常");
  }
  return {
    self_redirect: true,
    id,
    appid,
    scope: "snsapi_login",
    redirect_uri: encodeURIComponent(redirect),
    state,
    style: "white",
  };
}

export default function WechatWebsiteQr({ authorizeUrl }: { authorizeUrl: string }) {
  const id = "wechat-official-login-" + useId().replace(/[^\w-]/g, "");
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    let script: HTMLScriptElement | undefined;

    function render() {
      if (!active) return;
      try {
        const options = verifiedQrOptions(authorizeUrl, id);
        if (!window.WxLogin) throw new Error("微信官方二维码组件不可用");
        window.WxLogin(options);
        cleanup = options.onCleanup;
        setLoadError("");
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "微信二维码暂时无法加载");
      }
    }

    try {
      verifiedQrOptions(authorizeUrl, id);
      if (window.WxLogin) {
        render();
      } else {
        script = document.createElement("script");
        script.src = WX_SCRIPT;
        script.async = true;
        script.onload = render;
        script.onerror = () => {
          if (active) setLoadError("无法加载微信官方扫码组件，可通过下方链接打开微信扫码登录。");
        };
        document.head.appendChild(script);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "微信二维码暂时无法加载";
      queueMicrotask(() => { if (active) setLoadError(message); });
    }

    return () => {
      active = false;
      cleanup?.();
      script?.remove();
      document.getElementById(id)?.replaceChildren();
    };
  }, [authorizeUrl, id]);

  return <>
    <div id={id} className={styles.unifiedOfficialQr} role="group" aria-label="使用手机微信扫描此二维码登录或注册" />
    {loadError && <p role="alert">{loadError}</p>}
    {loadError && <a className="secondary-button" target="_blank" rel="noopener noreferrer" href={authorizeUrl}>
      在微信官方页面打开扫码登录
    </a>}
  </>;
}
