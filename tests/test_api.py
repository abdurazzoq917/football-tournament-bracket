"""Server tomondagi tekshiruvlar.

Ishga tushirish:  python -m unittest discover -s tests -t .

Qo'shimcha kutubxona kerak emas — Flask ning o'z test klienti
va standart "unittest" moduli ishlatiladi.
"""

import unittest

from app import (
    MAXIMUM_PARTICIPANTS,
    MINIMUM_PARTICIPANTS,
    app,
)


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()

    def draw(self, participants):
        return self.client.post(
            "/api/draw",
            json={"participants": participants},
        )


class HealthTests(ApiTestCase):
    def test_health_ok(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])
        self.assertEqual(response.get_json()["status"], "ok")


class StaticFileTests(ApiTestCase):
    def get_file(self, path):
        """Statik javobni oladi va fayl deskriptorini yopadi."""
        response = self.client.get(path)
        self.addCleanup(response.close)

        return response

    def test_home_serves_index(self):
        response = self.get_file("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.headers["Content-Type"])
        self.assertIn(b"participantInput", response.data)

    def test_style_has_css_mimetype(self):
        response = self.get_file("/style.css")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/css", response.headers["Content-Type"])

    def test_scripts_have_javascript_mimetype(self):
        for path in ("/script.js", "/grainient.js"):
            with self.subTest(path=path):
                response = self.get_file(path)

                self.assertEqual(response.status_code, 200)
                self.assertIn(
                    "javascript",
                    response.headers["Content-Type"],
                )

    def test_unknown_path_returns_json_404(self):
        response = self.client.get("/mavjud-emas")

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.get_json()["success"])


class DrawTests(ApiTestCase):
    def test_returns_same_participants(self):
        names = ["Alfa", "Beta", "Gamma", "Delta", "Epsilon"]

        response = self.draw(names)
        data = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data["success"])
        self.assertEqual(data["participant_count"], len(names))
        self.assertCountEqual(data["participants"], names)

    def test_shuffles_at_least_sometimes(self):
        names = [f"Jamoa {index}" for index in range(1, 21)]

        orders = {
            tuple(self.draw(names).get_json()["participants"])
            for _ in range(10)
        }

        self.assertGreater(
            len(orders),
            1,
            "qur'a hech qachon tartibni o'zgartirmadi",
        )

    def test_removes_duplicates_ignoring_case(self):
        response = self.draw(["Alfa", "ALFA", "  alfa  ", "Beta"])
        data = response.get_json()

        self.assertEqual(data["participant_count"], 2)
        self.assertCountEqual(data["participants"], ["Alfa", "Beta"])

    def test_trims_and_drops_empty_names(self):
        response = self.draw(["  Alfa  ", "", "   ", "Beta"])
        data = response.get_json()

        self.assertEqual(data["participant_count"], 2)
        self.assertCountEqual(data["participants"], ["Alfa", "Beta"])

    def test_accepts_exact_bounds(self):
        for count in (MINIMUM_PARTICIPANTS, MAXIMUM_PARTICIPANTS):
            with self.subTest(count=count):
                names = [f"Jamoa {index}" for index in range(count)]
                response = self.draw(names)

                self.assertEqual(response.status_code, 200)
                self.assertEqual(
                    response.get_json()["participant_count"],
                    count,
                )

    def test_rejects_too_few(self):
        names = [
            f"Jamoa {index}"
            for index in range(MINIMUM_PARTICIPANTS - 1)
        ]
        response = self.draw(names)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.get_json()["success"])

    def test_rejects_too_many(self):
        names = [
            f"Jamoa {index}"
            for index in range(MAXIMUM_PARTICIPANTS + 1)
        ]
        response = self.draw(names)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.get_json()["success"])

    def test_duplicates_count_after_removal(self):
        """Takrorlar olib tashlangach chegara qayta tekshiriladi."""
        response = self.draw(["Alfa", "alfa", "ALFA"])

        self.assertEqual(response.status_code, 400)

    def test_rejects_non_list_participants(self):
        response = self.client.post(
            "/api/draw",
            json={"participants": "Alfa, Beta"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.get_json()["success"])

    def test_rejects_missing_body(self):
        response = self.client.post(
            "/api/draw",
            data="",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.get_json()["success"])

    def test_error_messages_follow_constants(self):
        response = self.draw(["Alfa"])

        self.assertIn(
            str(MINIMUM_PARTICIPANTS),
            response.get_json()["message"],
        )


if __name__ == "__main__":
    unittest.main()
