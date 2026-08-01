from pathlib import Path
from random import SystemRandom

from flask import Flask, jsonify, render_template, request


BASE_DIR = Path(__file__).resolve().parent

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "public"),
    static_url_path="/static",
)

random_generator = SystemRandom()


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/health")
def health():
    return jsonify(
        {
            "success": True,
            "status": "ok",
            "message": "Raqamli Avlod musobaqa tizimi ishlayapti",
        }
    )


@app.post("/api/draw")
def draw():
    data = request.get_json(silent=True) or {}

    raw_participants = data.get("participants", [])

    if not isinstance(raw_participants, list):
        return jsonify(
            {
                "success": False,
                "message": "Ishtirokchilar noto‘g‘ri yuborildi.",
            }
        ), 400

    participants = []
    used_names = set()

    for value in raw_participants:
        participant = str(value).strip()

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
                "message": "Ko‘pi bilan 32 ta ishtirokchi kiriting.",
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