from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

from app.domain.errors import StorageError


@dataclass(frozen=True)
class StoredFile:
    path: str
    filename: str
    sha256: str
    size_bytes: int


class LocalStorage:
    def __init__(self, uploads_dir: str) -> None:
        self.base = Path(uploads_dir)
        self.base.mkdir(parents=True, exist_ok=True)

    def save_pdf(self, filename: str, file_bytes: bytes) -> StoredFile:
        try:
            sha = hashlib.sha256(file_bytes).hexdigest()
            safe_name = filename.replace("/", "_").replace("\\", "_")
            ext = Path(safe_name).suffix.lower() or ".pdf"
            path = self.base / f"{sha}{ext}"
            path.write_bytes(file_bytes)
            return StoredFile(
                path=str(path.resolve()),
                filename=safe_name,
                sha256=sha,
                size_bytes=len(file_bytes),
            )
        except Exception as e:
            raise StorageError(f"Failed to save PDF: {e}") from e

    def delete(self, path: str) -> None:
        try:
            Path(path).unlink(missing_ok=True)
        except Exception as e:
            raise StorageError(f"Failed to delete file: {e}") from e
