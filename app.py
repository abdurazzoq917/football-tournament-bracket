from pathlib import Path
from random import SystemRandom

from flask import (
    Flask,
    jsonify,
    render_template,
    request,
    send_from_directory,
)


BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
PUBLIC_DIR = BASE_DIR / "public"

app = Flask(
    __name__,
    template_folder=str(TEMPLATES_DIR),
)

random_generator = SystemRandom()


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/style.css")
def serve_style():
    return send_from_directory(
        PUBLIC_DIR,
        "style.css",
        mimetype="text/css",
    )


@app.get("/script.js")
def serve_script():
    return send_from_directory(
        PUBLIC_DIR,
        "script.js",
        mimetype="application/javascript",
    )


@app.get("/api/health")
def health_check():
    return jsonify(
        {
            "success": True,
            "status": "ok",
            "project": "Raqamli Avlod musobaqa setkasi",
        }
    )


@app.post("/api/draw")
def random_draw():
    data = request.get_json(silent=True) or {}

    raw_participants = data.get("participants", [])

    if not isinstance(raw_participants, list):
        return jsonify(
            {
                "success": False,
                "message": (
                    "Ishtirokchilar ro‘yxat ko‘rinishida "
                    "yuborilishi kerak."
                ),
            }
        ), 400

    participants = []
    used_names = set()

    for raw_participant in raw_participants:
        participant = str(raw_participant).strip()

        if not participant:
            continue

        normalized_name = participant.casefold()

        if normalized_name in used_names:
            continue

        used_names.add(normalized_name)
        participants.append(participant)

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

    return jsonify(
        {
            "success": True,
            "participants": participants,
            "participant_count": len(participants),
        }
    )


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )