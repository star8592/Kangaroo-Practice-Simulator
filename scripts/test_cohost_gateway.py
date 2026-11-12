#!/usr/bin/env python3
"""Fail-closed regression tests for shared-host Nginx include/WS routing."""
import unittest

from check_cohost_gateway import (
    GatewayContractError,
    REQUIRED_INCLUDES,
    verify_nginx_includes,
)


def fixture():
    before = """server {
    listen 80;
    server_name socthink.cn www.socthink.cn;
    location / { return 301 https://$host$request_uri; }
}
"""
    https = [
        "server {",
        "    listen 443 ssl http2;",
        "    server_name socthink.cn www.socthink.cn;",
        *("    include /etc/nginx/snippets/" + x + ";" for x in REQUIRED_INCLUDES),
        "    location / { proxy_pass http://127.0.0.1:3000; }",
        "}",
    ]
    snippets = {x: "location ^~ /example/ { return 200; }" for x in REQUIRED_INCLUDES}
    snippets["netitall.conf"] = """
    location ^~ /NetItAll/ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Upgrade $http_upgrade;
    }
    location ^~ /NetItAll/ { alias /opt/netitall/current/frontend/; }
    """
    return before + "\n".join(https), snippets


class GatewayTests(unittest.TestCase):
    def test_valid_vhost_passes(self):
        site, snippets = fixture()
        verify_nginx_includes(site, snippets)

    def test_include_missing_from_https_fails(self):
        site, snippets = fixture()
        site = site.replace("    include /etc/nginx/snippets/netitall.conf;\n", "")
        with self.assertRaisesRegex(GatewayContractError, "netitall.conf"):
            verify_nginx_includes(site, snippets)

    def test_include_only_in_http_fails(self):
        site, snippets = fixture()
        include = "    include /etc/nginx/snippets/netitall.conf;"
        site = site.replace(include, "")
        site = site.replace("    listen 80;", "    listen 80;\n" + include)
        with self.assertRaisesRegex(GatewayContractError, "netitall.conf"):
            verify_nginx_includes(site, snippets)

    def test_duplicate_include_fails(self):
        site, snippets = fixture()
        include = "    include /etc/nginx/snippets/netitall.conf;"
        site = site.replace(include, include + "\n" + include)
        with self.assertRaisesRegex(GatewayContractError, "netitall.conf"):
            verify_nginx_includes(site, snippets)

    def test_missing_snippet_fails(self):
        site, snippets = fixture()
        snippets["storyforge-studio.conf"] = ""
        with self.assertRaisesRegex(GatewayContractError, "storyforge-studio.conf"):
            verify_nginx_includes(site, snippets)

    def test_netitall_ws_location_missing_fails(self):
        site, snippets = fixture()
        snippets["netitall.conf"] = snippets["netitall.conf"].replace(
            "location ^~ /NetItAll/ws", "location ^~ /NetItAll/oldws"
        )
        with self.assertRaisesRegex(GatewayContractError, "NetItAll snippet"):
            verify_nginx_includes(site, snippets)

    def test_incorrect_ws_upstream_fails(self):
        site, snippets = fixture()
        snippets["netitall.conf"] = snippets["netitall.conf"].replace(
            "127.0.0.1:3001", "127.0.0.1:3999"
        )
        with self.assertRaisesRegex(GatewayContractError, "proxy target"):
            verify_nginx_includes(site, snippets)


if __name__ == "__main__":
    unittest.main()
