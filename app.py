from pathlib import Path
from random import SystemRandom

from flask import Flask, jsonify, request, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"

# Bu chegaralar "public/script.js" dagi qiymatlar bilan bir xil bo'lishi kerak.
MINIMUM_PARTICIPANTS = 2
MAXIMUM_PARTICIPANTS = 32

app = Flask(__name__)

random_generator = SystemRandom()


@app.get("/")
def home():
    return send_from_directory(
        directory=PUBLIC_DIR,
        path="index.html",
    )


@app.get("/style.css")
def style():
    return send_from_directory(
        directory=PUBLIC_DIR,
        path="style.css",
        mimetype="text/css",
    )


@app.get("/script.js")
def script():
    return send_from_directory(
        directory=PUBLIC_DIR,
        path="script.js",
        mimetype="application/javascript",
    )


@app.get("/grainient.js")
def grainient_script():
    return send_from_directory(
        directory=PUBLIC_DIR,
        path="grainient.js",
        mimetype="application/javascript",
    )


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
    data = request.get_json(silent=True)

    if data is None:
        return jsonify(
            {
                "success": False,
                "message": "JSON ma’lumot yuborilmadi.",
            }
        ), 400

    raw_participants = data.get("participants")

    if not isinstance(raw_participants, list):
        return jsonify(
            {
                "success": False,
                "message": "Ishtirokchilar ro‘yxati noto‘g‘ri.",
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

    if len(participants) < MINIMUM_PARTICIPANTS:
        return jsonify(
            {
                "success": False,
                "message": (
                    f"Kamida {MINIMUM_PARTICIPANTS} ta "
                    "ishtirokchi kiriting."
                ),
            }
        ), 400

    if len(participants) > MAXIMUM_PARTICIPANTS:
        return jsonify(
            {
                "success": False,
                "message": (
                    f"Ko‘pi bilan {MAXIMUM_PARTICIPANTS} ta "
                    "ishtirokchi kiriting."
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


@app.errorhandler(404)
def not_found(error):
    return jsonify(
        {
            "success": False,
            "message": "So‘ralgan manzil topilmadi.",
        }
    ), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify(
        {
            "success": False,
            "message": "Serverda ichki xatolik yuz berdi.",
        }
    ), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )