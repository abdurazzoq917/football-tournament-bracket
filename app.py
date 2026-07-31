from pathlib import Path
from random import SystemRandom

from flask import Flask, jsonify, render_template, request, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
)

random_generator = SystemRandom()


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/style.css")
def serve_style():
    return send_from_directory(PUBLIC_DIR, "style.css")


@app.get("/script.js")
def serve_script():
    return send_from_directory(PUBLIC_DIR, "script.js")


@app.get("/api/health")
def health_check():
    return jsonify(
        {
            "status": "ok",
            "message": "Football Tournament Bracket API ishlayapti",
        }
    )


@app.post("/api/draw")
def random_draw():
    data = request.get_json(silent=True) or {}
    raw_teams = data.get("teams", [])

    if not isinstance(raw_teams, list):
        return jsonify(
            {
                "success": False,
                "message": "Jamoalar ro‘yxat ko‘rinishida yuborilishi kerak.",
            }
        ), 400

    teams = []
    used_names = set()

    for team in raw_teams:
        team_name = str(team).strip()

        if not team_name:
            continue

        normalized_name = team_name.casefold()

        if normalized_name in used_names:
            continue

        used_names.add(normalized_name)
        teams.append(team_name)

    if len(teams) < 2:
        return jsonify(
            {
                "success": False,
                "message": "Kamida 2 ta turli jamoa kiriting.",
            }
        ), 400

    if len(teams) > 32:
        return jsonify(
            {
                "success": False,
                "message": "Eng ko‘pi bilan 32 ta jamoa kiritish mumkin.",
            }
        ), 400

    random_generator.shuffle(teams)

    bracket_size = 2

    while bracket_size < len(teams):
        bracket_size *= 2

    return jsonify(
        {
            "success": True,
            "teams": teams,
            "team_count": len(teams),
            "bracket_size": bracket_size,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)