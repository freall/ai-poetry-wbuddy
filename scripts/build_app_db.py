from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "data" / "processed" / "classics-library.json"
DB_PATH = ROOT / "data" / "processed" / "classics-app.db"
SCHEMA_PATH = ROOT / "packages" / "db" / "schema.sql"
DEMO_USER_ID = "demo-user"

ACHIEVEMENT_DEFINITIONS = [
    {
        "id": "achievement-first-scroll",
        "title": "初入诗境",
        "description": "完成第一篇作品浏览，点亮学习旅程。",
        "icon": "sparkles",
        "metric": "viewed_count",
        "threshold": 1,
        "theme": "gold",
    },
    {
        "id": "achievement-growing-reader",
        "title": "渐入佳境",
        "description": "累计浏览 7 篇作品，形成稳定的阅读节奏。",
        "icon": "book-open-check",
        "metric": "viewed_count",
        "threshold": 7,
        "theme": "jade",
    },
    {
        "id": "achievement-mastery-starter",
        "title": "会背也会懂",
        "description": "掌握 3 篇作品，拿到第一个学习徽章。",
        "icon": "medal",
        "metric": "mastered_count",
        "threshold": 3,
        "theme": "rose",
    },
    {
        "id": "achievement-quiz-runner",
        "title": "答题连击",
        "description": "累计答对 12 题，说明不仅在看，也在真正理解。",
        "icon": "target",
        "metric": "quiz_correct_count",
        "threshold": 12,
        "theme": "indigo",
    },
    {
        "id": "achievement-streak-keeper",
        "title": "七日有风",
        "description": "连续学习 5 天，开始建立自己的古典节奏。",
        "icon": "flame",
        "metric": "streak_days",
        "threshold": 5,
        "theme": "amber",
    },
]


def iso_now() -> str:
    return datetime.now(UTC).isoformat()



def load_dataset() -> dict:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"未找到扩充后的内容库：{DATASET_PATH}")
    return json.loads(DATASET_PATH.read_text(encoding="utf-8"))



def seed_content(connection: sqlite3.Connection, dataset: dict) -> None:
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



def seed_achievement_definitions(connection: sqlite3.Connection) -> None:
    for item in ACHIEVEMENT_DEFINITIONS:
        connection.execute(
            """
            INSERT INTO achievement_definitions (id, title, description, icon, metric, threshold, theme)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                item["title"],
                item["description"],
                item["icon"],
                item["metric"],
                item["threshold"],
                item["theme"],
            ),
        )



def metric_snapshot(connection: sqlite3.Connection, user_id: str) -> dict[str, int]:
    row = connection.execute(
        """
        SELECT
          SUM(CASE WHEN viewed = 1 THEN 1 ELSE 0 END) AS viewed_count,
          SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) AS mastered_count,
          COALESCE(SUM(quiz_score), 0) AS quiz_correct_count,
          COALESCE(MAX(streak), 0) AS streak_days
        FROM learning_progress
        WHERE user_local_id = ?
        """,
        (user_id,),
    ).fetchone()
    return {
        "viewed_count": int((row[0] if row else 0) or 0),
        "mastered_count": int((row[1] if row else 0) or 0),
        "quiz_correct_count": int((row[2] if row else 0) or 0),
        "streak_days": int((row[3] if row else 0) or 0),
    }



def sync_user_achievements(connection: sqlite3.Connection, user_id: str) -> None:
    metrics = metric_snapshot(connection, user_id)
    unlocked_at = iso_now()
    for definition in ACHIEVEMENT_DEFINITIONS:
        progress_value = metrics.get(definition["metric"], 0)
        if progress_value < int(definition["threshold"]):
            continue
        connection.execute(
            """
            INSERT INTO user_achievements (id, achievement_id, user_local_id, progress_value, unlocked_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_local_id, achievement_id) DO UPDATE SET
              progress_value = excluded.progress_value,
              unlocked_at = user_achievements.unlocked_at
            """,
            (
                f"user-achievement-{user_id}-{definition['id']}",
                definition["id"],
                user_id,
                progress_value,
                unlocked_at,
            ),
        )



def seed_demo_learning_state(connection: sqlite3.Connection, works: list[dict]) -> None:
    demo_works = works[:8]
    timestamp = iso_now()
    progress_rows = []
    for index, work in enumerate(demo_works, start=1):
        viewed = 1
        mastered = 1 if index <= 3 else 0
        streak = min(5, index)
        quiz_score = 3 if index <= 2 else (2 if index <= 4 else 1)
        reward_status = "gold" if mastered else ("silver" if quiz_score >= 2 else "bronze")
        progress_rows.append(
            (
                f"progress-{DEMO_USER_ID}-{work['id']}",
                DEMO_USER_ID,
                work["id"],
                viewed,
                mastered,
                streak,
                quiz_score,
                reward_status,
                timestamp,
            )
        )

    connection.executemany(
        """
        INSERT INTO learning_progress (
          id, user_local_id, work_id, viewed, mastered, streak, quiz_score, reward_status, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        progress_rows,
    )

    if len(works) >= 3:
        quiz_rows = connection.execute(
            "SELECT id, work_id, answer FROM quizzes WHERE work_id IN (?, ?) ORDER BY id LIMIT 2",
            (works[1]["id"], works[2]["id"]),
        ).fetchall()
        for idx, quiz_row in enumerate(quiz_rows, start=1):
            quiz_id, work_id, answer = quiz_row
            selected_answer = "未掌握" if idx == 1 else "继续学习"
            connection.execute(
                """
                INSERT INTO mistake_notebook (
                  id, user_local_id, work_id, quiz_id, selected_answer, correct_answer, resolved, attempts, last_seen_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"mistake-{DEMO_USER_ID}-{quiz_id}",
                    DEMO_USER_ID,
                    work_id,
                    quiz_id,
                    selected_answer,
                    answer,
                    0,
                    1 if idx == 1 else 2,
                    timestamp,
                ),
            )

    sync_user_achievements(connection, DEMO_USER_ID)



def main() -> None:
    dataset = load_dataset()
    schema = SCHEMA_PATH.read_text(encoding="utf-8")

    if DB_PATH.exists():
        DB_PATH.unlink()

    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(schema)

    seed_content(connection, dataset)
    seed_achievement_definitions(connection)
    seed_demo_learning_state(connection, dataset["works"])

    connection.commit()
    connection.close()

    print(f"应用数据库已生成：{DB_PATH}")
    print(
        f"作品数：{dataset['summary']['works']}，作者数：{dataset['summary']['authors']}，练习题数：{dataset['summary']['quizzes']}"
    )
    print(f"已写入成就定义：{len(ACHIEVEMENT_DEFINITIONS)}，默认演示用户：{DEMO_USER_ID}")


if __name__ == "__main__":
    main()
