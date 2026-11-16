#!/usr/bin/env python3
"""Open only a public Xiaohongshu search on an explicitly selected authorized Android device."""
import argparse
import subprocess
import urllib.parse

def uri(query: str) -> str:
    query=query.strip()
    if not query or len(query)>140:
        raise ValueError("Search query must be between 1 and 140 characters")
    return "xhsdiscover://search/result?keyword="+urllib.parse.quote(query, safe="")

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--serial",required=False,help="Authorized USB-connected Android serial; required except --dry-run")
    parser.add_argument("--query",required=True)
    parser.add_argument("--dry-run",action="store_true",help="Show public search URI only, without touching the phone")
    a=parser.parse_args()
    link=uri(a.query)
    if a.dry_run:
        print(link)
        return
    if not a.serial:
        parser.error("--serial is required unless --dry-run is specified")
    devices=subprocess.run(["adb","devices"],capture_output=True,text=True,check=True).stdout
    if not any(line.split()[:2]==[a.serial,"device"] for line in devices.splitlines()):
        parser.error("Selected device is not authorized and ready on ADB")
    result=subprocess.run(["adb","-s",a.serial,"shell","am","start","-a",
                           "android.intent.action.VIEW","-d",link],
                          capture_output=True,text=True,timeout=15)
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    print("PUBLIC_XHS_SEARCH_OPENED=YES")
    print("SEARCH_QUERY="+a.query)
    print("CONTENT_DOWNLOADED=NO; OCR_PERFORMED=NO")
if __name__=="__main__":
    main()
