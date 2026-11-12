#!/usr/bin/env python3
"""SOC THINK education-only HTTPS gateway and retired-game regression tests."""
import unittest

from check_cohost_gateway import (
    GatewayContractError,
    REQUIRED_INCLUDES,
    RETIRED_GAME_ROUTES,
    verify_nginx_includes,
)


def fixture():
    http = """server {
    listen 80;
    server_name socthink.cn www.socthink.cn;
    location / { return 301 https://$host$request_uri; }
}
"""
    https = [
        "server {",
        "    listen 443 ssl http2;",
        "    server_name socthink.cn www.socthink.cn;",
        *("    include /etc/nginx/snippets/" + name + ";" for name in REQUIRED_INCLUDES),
        "    location = /NetItAll { return 410; }",
        "    location ^~ /NetItAll/ { return 410; }",
        "    location / { proxy_pass http://127.0.0.1:3000; }",
        "}",
    ]
    snippets = {name: "location ^~ /example/ { return 200; }" for name in REQUIRED_INCLUDES}
    return http + "\n".join(https), snippets


class GatewayTests(unittest.TestCase):
    def test_education_only_vhost_passes(self):
        site, snippets = fixture()
        verify_nginx_includes(site, snippets)
        self.assertIn("/NetItAll/ws", RETIRED_GAME_ROUTES)

    def test_education_include_missing_fails(self):
        site, snippets = fixture()
        site = site.replace("    include /etc/nginx/snippets/socthink-english-live.conf;\n", "")
        with self.assertRaisesRegex(GatewayContractError, "socthink-english-live"):
            verify_nginx_includes(site, snippets)

    def test_include_only_in_http_fails(self):
        site, snippets = fixture()
        include = "    include /etc/nginx/snippets/socthink-kids-formal.conf;"
        site = site.replace(include, "")
        site = site.replace("    listen 80;", "    listen 80;\n" + include)
        with self.assertRaisesRegex(GatewayContractError, "socthink-kids-formal"):
            verify_nginx_includes(site, snippets)

    def test_duplicate_include_fails(self):
        site, snippets = fixture()
        include = "    include /etc/nginx/snippets/storyforge-studio.conf;"
        site = site.replace(include, include + "\n" + include)
        with self.assertRaisesRegex(GatewayContractError, "storyforge-studio"):
            verify_nginx_includes(site, snippets)

    def test_missing_snippet_fails(self):
        site, snippets = fixture()
        snippets["socthink-aelos-kids-preview.conf"] = ""
        with self.assertRaisesRegex(GatewayContractError, "socthink-aelos-kids-preview"):
            verify_nginx_includes(site, snippets)

    def test_retired_game_include_is_forbidden(self):
        site, snippets = fixture()
        site = site.replace(
            "    location / {",
            "    include /etc/nginx/snippets/netitall.conf;\n    location / {",
        )
        with self.assertRaisesRegex(GatewayContractError, "retired NetItAll include"):
            verify_nginx_includes(site, snippets)

    def test_retired_game_include_in_http_also_forbidden(self):
        site, snippets = fixture()
        site = site.replace(
            "    listen 80;",
            "    listen 80;\n    include /etc/nginx/snippets/netitall.conf;",
        )
        with self.assertRaisesRegex(GatewayContractError, "retired NetItAll include"):
            verify_nginx_includes(site, snippets)

    def test_retired_game_root_tombstone_required(self):
        site, snippets = fixture()
        site = site.replace("    location = /NetItAll { return 410; }\n", "")
        with self.assertRaisesRegex(GatewayContractError, "410 tombstone"):
            verify_nginx_includes(site, snippets)

    def test_retired_game_subpaths_tombstone_required(self):
        site, snippets = fixture()
        site = site.replace("    location ^~ /NetItAll/ { return 410; }\n", "")
        with self.assertRaisesRegex(GatewayContractError, "410 tombstone"):
            verify_nginx_includes(site, snippets)


if __name__ == "__main__":
    unittest.main()
