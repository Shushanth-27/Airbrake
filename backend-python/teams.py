"""
Teams webhook notifier.
Posts MessageCard format directly to webhook.office.com.
"""

import os
import json
import urllib.request
import urllib.error
from datetime import datetime
from typing import Optional


def send_teams_alert(
    rule_name: str,
    alert_type: str,
    project_name: str,
    error_msg: str,
    count: Optional[int] = None,
    error_detail: Optional[str] = None,
    label: Optional[str] = None,
) -> None:
    webhook_url = os.environ.get("TEAMS_WEBHOOK_URL", "").strip()
    if not webhook_url:
        print("[Teams] TEAMS_WEBHOOK_URL not set — skipping")
        return

    icon  = "🔥" if alert_type == "High Failure" else ("🔄" if alert_type == "Regression" else "🆕")
    color = "FF0000" if alert_type == "High Failure" else ("FFA500" if alert_type == "Regression" else "0078D4")
    title = (
        f"🧪 [TEST] {project_name} — {alert_type}"
        if label
        else f"{icon} {alert_type} Alert — {project_name}"
    )

    facts = [
        {"name": "Project",    "value": project_name},
        {"name": "Alert Type", "value": alert_type},
        {"name": "Rule",       "value": rule_name},
        {"name": "Error",      "value": error_msg},
    ]
    if count is not None:
        facts.append({"name": "Occurrences", "value": f"{count} in window"})
    facts.append({"name": "Time", "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S")})

    sections = [{"activityTitle": f"**{project_name}**", "activitySubtitle": alert_type, "facts": facts}]
    if error_detail:
        detail_safe = error_detail[:500].replace("<", "&lt;").replace(">", "&gt;")
        sections.append({"title": "📄 Stack Trace", "text": f"<pre>{detail_safe}</pre>"})

    payload = json.dumps({
        "@type":    "MessageCard",
        "@context": "http://schema.org/extensions",
        "summary":    title,
        "themeColor": color,
        "title":      title,
        "sections":   sections,
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            webhook_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            if status in (200, 202):
                print(f"[Teams] ✅ Alert sent → [{alert_type}] {project_name}: {error_msg}")
            else:
                print(f"[Teams] ❌ HTTP {status}")
    except Exception as e:
        print(f"[Teams] ❌ Error: {e}")


def test_teams_webhook() -> dict:
    webhook_url = os.environ.get("TEAMS_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return {"webhookUrl": "(not set)", "configured": False, "message": "TEAMS_WEBHOOK_URL is not set"}

    payload = json.dumps({
        "@type": "MessageCard", "@context": "http://schema.org/extensions",
        "summary": "🔔 Airbrake Portal — Webhook Test", "themeColor": "0078D4",
        "title": "🔔 Airbrake Portal — Webhook Test",
        "sections": [{"facts": [
            {"name": "Status", "value": "✅ Connection successful"},
            {"name": "Time", "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S")},
        ]}],
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            webhook_url, data=payload,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            ok = resp.status in (200, 202)
            return {
                "webhookUrl": webhook_url[:60] + "…",
                "configured": True, "status": resp.status, "ok": ok,
                "message": "✅ Test card sent" if ok else f"❌ HTTP {resp.status}",
            }
    except Exception as e:
        return {"webhookUrl": webhook_url[:60] + "…", "configured": True, "error": str(e),
                "message": f"❌ Network error: {e}"}
