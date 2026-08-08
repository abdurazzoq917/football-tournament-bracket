# Testlar

Qo'shimcha kutubxona kerak emas — Node ning o'z test runneri va
Python ning standart `unittest` moduli ishlatiladi.

Ikkala buyruq ham **loyiha ildizidan** ishga tushiriladi.

## Frontend mantiqi (64 ta tekshiruv)

```
node --test "tests/**/*.test.js"
```

Nimani qamrab oladi:

- **sekundomer** — vaqt `Date.now()` dan hisoblanishi, START/STOP,
  qayta START da vaqtning ustiga qo'shilishi, `formatTime` yaxlitlashi
- **setka** — 2 dan 32 gacha har bir ishtirokchi soni uchun BYE
  taqsimoti, hech bir uchrashuv bo'sh qolmasligi
- **turnir** — to'liq o'ynab chiqilganda chempion aniqlanishi
- **bekor qilish** — g'olib zanjirining tozalanishi, BYE g'olibiga
  tegilmasligi, o'lchangan vaqtning saqlanishi
- **saqlash** — qayta yuklashda vaqt yo'qolmasligi *va* o'sib ketmasligi,
  eski `match.timer` formatining ko'chirilishi

`public/script.js` — oddiy brauzer skripti (modul emas). Uni Node da
sinash uchun `helpers/browser-sandbox.js` minimal DOM taqlidini yaratadi
va ichki funksiyalarni tashqariga chiqaradi. Shu sababli asosiy kodga
test uchun hech qanday o'zgartirish kiritilmagan.

## Server (16 ta tekshiruv)

```
python -m unittest discover -s tests -t .
```

Nimani qamrab oladi:

- `/api/health` javobi
- statik fayllar va ularning MIME turlari, JSON ko'rinishidagi 404
- `/api/draw` — tartibning o'zgarishi, takror nomlarning olib tashlanishi
  (katta-kichik harf farqisiz), bo'sh nomlarning tushib qolishi
- chegaralar: `MINIMUM_PARTICIPANTS` / `MAXIMUM_PARTICIPANTS`, noto'g'ri
  yoki bo'sh so'rovlar

Avval Flask o'rnatilgan bo'lishi kerak:

```
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
```
