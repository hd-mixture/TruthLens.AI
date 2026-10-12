import sqlite3
import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)


def init_db():
    """
    Initializes SQLite database and tables.
    """
    conn = sqlite3.connect(settings.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis_history (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            input_type TEXT NOT NULL,
            title TEXT NOT NULL,
            snippet TEXT NOT NULL,
            prediction TEXT NOT NULL,
            confidence REAL NOT NULL,
            credibility_score INTEGER NOT NULL,
            risk_level TEXT NOT NULL,
            warning_signs TEXT,
            full_result TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {settings.DB_PATH}")


# Auto-initialize on import
init_db()


def save_analysis(result: Dict[str, Any]) -> str:
    """
    Saves an analysis record to the SQLite database.
    """
    record_id = result.get("id") or str(uuid.uuid4())
    created_at = result.get("timestamp") or datetime.utcnow().isoformat()
    input_type = result.get("input_type", "text")

    raw_text = result.get("input_text", "")
    title = result.get("title") or (raw_text[:60] + "..." if len(raw_text) > 60 else (raw_text or "Analysis Record"))
    snippet = raw_text[:180] + "..." if len(raw_text) > 180 else raw_text

    prediction = result.get("prediction", "Unknown")
    confidence = float(result.get("confidence", 0.0))
    credibility_score = int(result.get("credibility_score", 50))
    risk_level = result.get("risk_level", "Unknown")

    warning_signs = json.dumps(result.get("warning_signs", []))
    full_result = json.dumps(result)

    conn = sqlite3.connect(settings.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO analysis_history 
        (id, created_at, input_type, title, snippet, prediction, confidence, credibility_score, risk_level, warning_signs, full_result)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record_id, created_at, input_type, title, snippet,
        prediction, confidence, credibility_score, risk_level,
        warning_signs, full_result
    ))
    conn.commit()
    conn.close()

    return record_id


def get_history(limit: int = 50, offset: int = 0, search: Optional[str] = None, filter_prediction: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetches paginated analysis history with optional search and filter.
    """
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = "SELECT id, created_at, input_type, title, snippet, prediction, confidence, credibility_score, risk_level, warning_signs FROM analysis_history WHERE 1=1"
    params = []

    if filter_prediction and filter_prediction != "ALL":
        query += " AND prediction = ?"
        params.append(filter_prediction)

    if search and search.strip():
        query += " AND (title LIKE ? OR snippet LIKE ?)"
        term = f"%{search.strip()}%"
        params.extend([term, term])

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()

    history_items = []
    for r in rows:
        history_items.append({
            "id": r["id"],
            "created_at": r["created_at"],
            "input_type": r["input_type"],
            "title": r["title"],
            "snippet": r["snippet"],
            "prediction": r["prediction"],
            "confidence": r["confidence"],
            "credibility_score": r["credibility_score"],
            "risk_level": r["risk_level"],
            "warning_signs": json.loads(r["warning_signs"]) if r["warning_signs"] else []
        })

    conn.close()
    return history_items


def get_analysis_by_id(record_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves full stored analysis payload by ID.
    """
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT full_result FROM analysis_history WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    conn.close()

    if row and row["full_result"]:
        return json.loads(row["full_result"])
    return None


def delete_analysis(record_id: str) -> bool:
    """
    Deletes an analysis record.
    """
    conn = sqlite3.connect(settings.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analysis_history WHERE id = ?", (record_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def clear_all_history() -> int:
    """
    Purges all analysis records.
    """
    conn = sqlite3.connect(settings.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analysis_history")
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count


def get_history_stats() -> Dict[str, Any]:
    """
    Aggregates overall statistics across analysis history.
    """
    conn = sqlite3.connect(settings.DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*), AVG(credibility_score) FROM analysis_history")
    total_count, avg_cred = cursor.fetchone()
    total_count = total_count or 0
    avg_cred = round(float(avg_cred or 0), 1)

    cursor.execute("SELECT COUNT(*) FROM analysis_history WHERE prediction = 'Likely Real'")
    real_count = cursor.fetchone()[0] or 0

    cursor.execute("SELECT COUNT(*) FROM analysis_history WHERE prediction = 'Potentially Fake'")
    fake_count = cursor.fetchone()[0] or 0

    conn.close()

    return {
        "total_analyzed": total_count,
        "likely_real_count": real_count,
        "potentially_fake_count": fake_count,
        "average_credibility": avg_cred
    }
