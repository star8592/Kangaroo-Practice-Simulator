#!/usr/bin/env python3
"""Read-only SOC THINK shared-host Nginx and HTTPS/WSS route audit.

This is not a deploy gate and never modifies services, firewall rules or site
configuration. Run after changes to the shared socthink.cn Nginx vhost.
"""
from __future__ import annotations

import argparse
import http.client
from pathlib import Path
import re
import socket
import ssl


# These are separate applications served on one hostname, not one codebase.
REQUIRED_INCLUDES = (
    "socthink-english-live.conf",
    "socthink-kids-formal.conf",
    "socthink-aelos-kids-preview.conf",
    "storyforge-studio.conf",
    "netitall.conf",
)
REQUIRED_NETITALL_LOCATIONS = (
    "location ^~ /NetItAll/ws",
    "location ^~ /NetItAll/",
)
PUBLIC_PATHS = (
    "/",
    "/login",
    "/NetItAll/",
    "/english/pronunciation/app/",
    "/english/vocabulary/app/",
    "/english/reading/app/",
    "/english/aelos/app/",
    "/english/reading/kids/",
)


class GatewayContractError(RuntimeError):
    pass


def verify_nginx_includes(site_config: str, snippets: dict[str, str]) -> None:
    # Split only at vhost declarations; ordinary location { } blocks remain
    # inside their original server block. The shared site has HTTP and HTTPS.
    servers = re.split(r"(?m)^\s*server\s*\{", site_config)
    https = [
        s for s in servers[1:]
        if re.search(r"(?m)^\s*listen\s+443\s+ssl\b", s)
        and re.search(r"(?m)^\s*server_name\s+socthink\.cn\b", s)
    ]
    if len(https) != 1:
        raise GatewayContractError("expected one HTTPS vhost for socthink.cn")
    site = https[0]
    for name in REQUIRED_INCLUDES:
        expected = "/etc/nginx/snippets/" + name
        pattern = r"(?m)^\s*include\s+" + re.escape(expected) + r"\s*;"
        if len(re.findall(pattern, site)) != 1:
            raise GatewayContractError("HTTPS vhost missing or duplicating " + name)
        if not snippets.get(name, "").strip():
            raise GatewayContractError("missing or empty installed snippet: " + name)
    ws = snippets["netitall.conf"]
    for line in REQUIRED_NETITALL_LOCATIONS:
        if line not in ws:
            raise GatewayContractError("NetItAll snippet lost location: " + line)
    if "proxy_pass http://127.0.0.1:3001;" not in ws:
        raise GatewayContractError("NetItAll websocket proxy target changed")
    print("GATEWAY_INCLUDE_CONTRACT=PASS modules=" + str(len(REQUIRED_INCLUDES)))


def verify_live(host: str = "socthink.cn", ip: str = "127.0.0.1", port: int = 443) -> None:
    ctx = ssl.create_default_context()
    # HTTPConnection expects SNI target from host; connect explicitly to
    # loopback while using the correct Host and TLS server_name through socket.
    for route in PUBLIC_PATHS:
        raw = socket.create_connection((ip, port), timeout=8)
        try:
            with ctx.wrap_socket(raw, server_hostname=host) as sock:
                sock.settimeout(8)
                req = ("GET " + route + " HTTP/1.1\r\nHost: " + host +
                       "\r\nUser-Agent: socthink-gateway-contract/1.0\r\nConnection: close\r\n\r\n")
                sock.sendall(req.encode("ascii"))
                line = _read_status_line(sock)
                if not line.startswith("HTTP/1.1 200 ") and not line.startswith("HTTP/2 200 "):
                    raise GatewayContractError(route + " returned " + line)
        except Exception:
            raw.close()
            raise
    print("GATEWAY_LIVE_HTTP=PASS paths=" + str(len(PUBLIC_PATHS)))
    with socket.create_connection((ip, port), timeout=8) as raw:
        with ctx.wrap_socket(raw, server_hostname=host) as sock:
            sock.settimeout(8)
            request = (
                "GET /NetItAll/ws HTTP/1.1\r\n"
                "Host: " + host + "\r\n"
                "Origin: https://" + host + "\r\n"
                "Upgrade: websocket\r\nConnection: Upgrade\r\n"
                "Sec-WebSocket-Version: 13\r\n"
                "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n"
            )
            sock.sendall(request.encode("ascii"))
            line = _read_status_line(sock)
            if not line.startswith("HTTP/1.1 101 "):
                raise GatewayContractError("NetItAll WSS did not upgrade: " + line)
    print("GATEWAY_LIVE_WSS=PASS route=/NetItAll/ws")


def _read_status_line(sock: ssl.SSLSocket) -> str:
    data = bytearray()
    while b"\r\n" not in data and len(data) < 512:
        chunk = sock.recv(1)
        if not chunk:
            break
        data.extend(chunk)
    return data.split(b"\r\n", 1)[0].decode("ascii", "replace")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default="/etc/nginx/sites-enabled/socthink.cn")
    ap.add_argument("--snippet-dir", default="/etc/nginx/snippets")
    ap.add_argument("--live", action="store_true")
    ap.add_argument("--host", default="socthink.cn")
    ap.add_argument("--connect", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=443)
    args = ap.parse_args()
    config = Path(args.site).read_text(encoding="utf-8")
    snippets = {
        name: (Path(args.snippet_dir) / name).read_text(encoding="utf-8")
        for name in REQUIRED_INCLUDES
    }
    verify_nginx_includes(config, snippets)
    if args.live:
        verify_live(args.host, args.connect, args.port)


if __name__ == "__main__":
    main()
