from pathlib import Path
from random import SystemRandom

from flask import Flask, jsonify, render_template, request


BASE_DIR = Path(__file__).resolve().parent

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "public"),
    static_url_path="",
)

random_generator = SystemRandom()


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/health")
def health_check():
    return jsonify(
        {
            "status": "ok",
            "project": "Raqamli Avlod Musobaqa Setkasi",
            "message": "Server muvaffaqiyatli ishlayapti",
        }
    )


@app.post("/api/draw")
def random_draw():
    data = request.get_json(silent=True) or {}
    raw_participants = data.get("teams", [])

    if not isinstance(raw_participants, list):
        return jsonify(
            {
                "success": False,
                "message": (
                    "Ishtirokchilar ro‘yxat shaklida "
                    "yuborilishi kerak."
                ),
            }
        ), 400

    participants = []
    used_names = set()

    for participant in raw_participants:
        participant_name = str(participant).strip()

        if not participant_name:
            continue

        normalized_name = participant_name.casefold()

        if normalized_name in used_names:
            continue

        used_names.add(normalized_name)
        participants.append(participant_name)

    if len(participants) < 2:
        return jsonify(
            {
                "success": False,
                "message": "Kamida 2 ta ishtirokchi kiriting.",
            }
        ), 400

    if len(participants) > 32:
        return jsonify(
            {
                "success": False,
                "message": (
                    "Eng ko‘pi bilan 32 ta ishtirokchi "
                    "kiritish mumkin."
                ),
            }
        ), 400

    random_generator.shuffle(participants)

    bracket_size = 2

    while bracket_size < len(participants):
        bracket_size *= 2

    return jsonify(
        {
            "success": True,
            "teams": participants,
            "participant_count": len(participants),
            "bracket_size": bracket_size,
        }
    )


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )