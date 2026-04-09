from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "data" / "processed" / "initial-library.json"
DB_PATH = ROOT / "data" / "processed" / "classics-prototype.db"
SCHEMA_PATH = ROOT / "packages" / "db" / "schema.sql"


def main() -> None:
    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    schema = SCHEMA_PATH.read_text(encoding="utf-8")

    if DB_PATH.exists():
        DB_PATH.unlink()

    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(schema)

    for author in dataset["authors"]:
        connection.execute(
            """
            INSERT INTO authors (id, name, dynasty, bio, achievements, avatar_asset_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                author["id"],
                author["name"],
                author["dynasty"],
                author["bio"],
                author.get("achievements"),
                author.get("avatar_asset_id"),
            ),
        )

    asset_lookup = {asset["work_id"]: asset["local_path"] for asset in dataset["assets"]}
    for work in dataset["works"]:
        connection.execute(
            """
            INSERT INTO works (
              id, slug, title, author_id, dynasty, genre, collection,
              textbook_stage, difficulty_level, theme_label, tags_json,
              original_text, translation_text, background_text,
              appreciation_text, author_summary, source_name,
              source_collection, source_url, cover_asset_path
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                work["id"],
                work["slug"],
                work["title"],
                work["author_id"],
                work["dynasty"],
                work["genre"],
                work["collection"],
                work["textbook_stage"],
                work["difficulty_level"],
                work["theme_label"],
                json.dumps(work["tags"], ensure_ascii=False),
                work["original_text"],
                work["translation_text"],
                work["background_text"],
                work["appreciation_text"],
                work["author_summary"],
                work["source_name"],
                work["source_collection"],
                work["source_url"],
                asset_lookup.get(work["id"]),
            ),
        )

    for asset in dataset["assets"]:
        connection.execute(
            """
            INSERT INTO assets (id, work_id, asset_type, local_path, source_url, license, credit, prompt, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                asset["id"],
                asset["work_id"],
                asset["asset_type"],
                asset["local_path"],
                asset.get("source_url"),
                asset.get("license"),
                asset.get("credit"),
                asset.get("prompt"),
                asset["status"],
            ),
        )

    for quiz in dataset["quizzes"]:
        connection.execute(
            """
            INSERT INTO quizzes (id, work_id, question_type, stem, options_json, answer, explanation, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                quiz["id"],
                quiz["work_id"],
                quiz["question_type"],
                quiz["stem"],
                json.dumps(quiz["options"], ensure_ascii=False),
                quiz["answer"],
                quiz["explanation"],
                quiz["difficulty"],
            ),
        )

    for relation in dataset["relations"]:
        connection.execute(
            """
            INSERT INTO relations (id, from_work_id, to_work_id, relation_type, score)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                relation["id"],
                relation["from_work_id"],
                relation["to_work_id"],
                relation["relation_type"],
                relation["score"],
            ),
        )

    connection.commit()
    connection.close()
    print(f"数据库已生成：{DB_PATH}")


if __name__ == "__main__":
    main()
