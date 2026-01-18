from __future__ import annotations

import requests

from app.domain.errors import JobError


class InngestJobsClient:
    def __init__(self, api_base: str) -> None:
        self.api_base = api_base.rstrip("/")

    def get_latest_run(self, event_id: str) -> dict:
        try:
            url = f"{self.api_base}/events/{event_id}/runs"
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            runs = resp.json().get("data", [])
            if not runs:
                return {"status": "NotStarted", "output": None, "error": None, "run_id": None}
            run = runs[0]
            return {
                "status": run.get("status"),
                "output": run.get("output"),
                "error": run.get("error"),
                "run_id": run.get("id"),
            }
        except Exception as e:
            raise JobError(f"Failed to query Inngest runs: {e}") from e
