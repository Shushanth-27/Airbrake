"""
AWS Lambda entry point.

Uses Mangum to wrap the Flask WSGI app for Lambda Function URL
(HTTP API v2 payload format).

Lambda environment variables required:
  DSQL_ENDPOINT  = ezt2bkam5s4kjre73r25easkcu.dsql.us-east-1.on.aws
  DSQL_REGION    = us-east-1

Handler setting in Lambda console:
  lambda_function.lambda_handler       ← main HTTP handler
  lambda_function.alert_handler        ← EventBridge scheduled rule (every 1 min)
"""

from mangum import Mangum
from app import app

# ── Main HTTP handler ─────────────────────────────────────────────────────────
# Mangum wraps the Flask WSGI app to handle Lambda Function URL events.
_mangum = Mangum(app, lifespan="off")


def lambda_handler(event, context):
    """Handle all incoming HTTP requests via Lambda Function URL."""
    return _mangum(event, context)


# ── Alert engine handler ──────────────────────────────────────────────────────
# Wire an EventBridge scheduled rule (rate: 1 minute) to this handler.
def alert_handler(event, context):
    """Run one pass of the alert engine. Called by EventBridge scheduled rule."""
    from alert_engine import run_alert_check_once
    run_alert_check_once()
    return {"status": "ok"}
