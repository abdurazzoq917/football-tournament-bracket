"use strict";

/*
 * Ishga tushirish:  node --test tests/
 */

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const {
    createSandbox,
    makeNames,
} = require("./helpers/browser-sandbox");


let api;
let storage;

beforeEach(() => {
    ({ api, storage } = createSandbox());
});


describe("formatTime", () => {
    it("kasr soniyalarni pastga yaxlitlaydi", () => {
        assert.equal(api.formatTime(0), "00:00");
        assert.equal(api.formatTime(9.99), "00:09");
        assert.equal(api.formatTime(65.4), "01:05");
    });

    it("noto'g'ri qiymatlarni 00:00 ga aylantiradi", () => {
        assert.equal(api.formatTime(-5), "00:00");
        assert.equal(api.formatTime(NaN), "00:00");
        assert.equal(api.formatTime(undefined), "00:00");
    });

    it("soatni ko'rsatmaydi — daqiqa o'sib boraveradi", () => {
        assert.equal(api.formatTime(3600), "60:00");
    });
});


describe("sekundomer haqiqiy soat bo'yicha ishlaydi", () => {
    it("to'xtagan taymer saqlangan qiymatni qaytaradi", () => {
        const timer = api.createTimer();
        timer.elapsed = 12.5;

        assert.equal(api.getElapsedSeconds(timer), 12.5);
    });

    it("ishlayotgan taymer o'tgan vaqtni hisoblaydi", () => {
        const timer = api.createTimer();
        api.startTimer(timer, Date.now() - 5000);

        const value = api.getElapsedSeconds(timer);
        assert.ok(
            value >= 4.9 && value <= 5.2,
            `kutilgan ~5s, olingan ${value}`
        );
    });

    it("STOP vaqtni yozadi va startedAt ni tozalaydi", () => {
        const timer = api.createTimer();
        api.startTimer(timer, Date.now() - 3000);
        api.stopTimer(timer);

        assert.equal(timer.running, false);
        assert.equal(timer.startedAt, null);
        assert.ok(
            timer.elapsed >= 2.9 && timer.elapsed <= 3.2,
            `kutilgan ~3s, olingan ${timer.elapsed}`
        );
    });

    it("qayta START oldingi vaqt ustiga qo'shadi", () => {
        const timer = api.createTimer();

        api.startTimer(timer, Date.now() - 2000);
        api.stopTimer(timer);
        api.startTimer(timer, Date.now() - 2000);

        const value = api.getElapsedSeconds(timer);
        assert.ok(
            value >= 3.8 && value <= 4.3,
            `kutilgan ~4s, olingan ${value}`
        );
    });

    it("ikki marta START bosilsa vaqt qaytadan boshlanmaydi", () => {
        const timer = api.createTimer();
        const startedAt = Date.now() - 4000;

        api.startTimer(timer, startedAt);
        api.startTimer(timer, Date.now());

        assert.equal(timer.startedAt, startedAt);
    });

    it("startedAt siz eski taymer xatolik bermaydi", () => {
        const legacy = { elapsed: 7, running: true };

        assert.equal(api.getElapsedSeconds(legacy), 7);
    });
});


describe("setka tuzilishi", () => {
    for (let count = 2; count <= 32; count += 1) {
        it(`${count} ishtirokchi butun joylashadi`, () => {
            api.createTournament(makeNames(count));

            const state = api.getTournament();
            const size = api.getNextPowerOfTwo(count);

            assert.equal(
                state.rounds[0].matches.length,
                size / 2
            );
            assert.equal(
                state.rounds.length,
                Math.log2(size)
            );

            const placed = state.rounds[0].matches
                .flatMap((match) => [match.team1, match.team2])
                .filter(Boolean);

            assert.equal(
                placed.length,
                count,
                "hamma ishtirokchi joylashmadi"
            );
            assert.equal(
                new Set(placed).size,
                count,
                "takrorlangan ishtirokchi bor"
            );

            state.rounds[0].matches.forEach((match, index) => {
                assert.ok(
                    match.team1 || match.team2,
                    `${index}-uchrashuv butunlay bo'sh`
                );
            });
        });
    }

    it("BYE faqat birinchi bosqichda bo'ladi", () => {
        api.createTournament(makeNames(5));

        const state = api.getTournament();

        state.rounds.slice(1).forEach((round, index) => {
            round.matches.forEach((match) => {
                assert.equal(
                    match.automaticWinner,
                    false,
                    `${index + 2}-bosqichda BYE topildi`
                );
            });
        });
    });
});


/*
 * Har bir uchrashuvda 1-o'rindagi ishtirokchi
 * g'olib deb belgilanadi.
 */
function playThrough(count) {
    api.createTournament(makeNames(count));

    const state = api.getTournament();

    state.rounds.forEach((round, roundIndex) => {
        round.matches.forEach((_, matchIndex) => {
            const match = api.getMatch(roundIndex, matchIndex);

            if (match.winner) {
                return;
            }

            assert.ok(
                match.team1 && match.team2,
                `r${roundIndex}m${matchIndex} to'liq emas`
            );

            api.handleTeamClick(roundIndex, matchIndex, 1);
        });
    });

    return api.getTournament();
}


describe("to'liq turnir", () => {
    for (const count of [2, 3, 5, 7, 8, 11, 16, 17, 31, 32]) {
        it(`${count} ishtirokchi — chempion aniqlanadi`, () => {
            const state = playThrough(count);

            assert.ok(state.champion, "chempion aniqlanmadi");
            assert.ok(
                makeNames(count).includes(state.champion),
                "chempion ro'yxatda yo'q"
            );
        });
    }

    it("ikkala ishtirokchi aniqlanmaguncha bosib bo'lmaydi", () => {
        api.createTournament(makeNames(8));

        api.handleTeamClick(1, 0, 1);

        assert.equal(api.getMatch(1, 0).winner, null);
    });
});


describe("g'olibni bekor qilish", () => {
    it("keyingi bosqichdagi joyni tozalaydi", () => {
        api.createTournament(makeNames(8));

        api.handleTeamClick(0, 0, 1);
        api.handleTeamClick(0, 1, 1);

        assert.ok(api.getMatch(1, 0).team1);
        assert.ok(api.getMatch(1, 0).team2);

        api.revertMatchWinner(0, 0);

        assert.equal(api.getMatch(0, 0).winner, null);
        assert.equal(
            api.getMatch(1, 0).team1,
            null,
            "keyingi bosqich tozalanmadi"
        );
        assert.ok(
            api.getMatch(1, 0).team2,
            "yonidagi ishtirokchi noto'g'ri o'chdi"
        );
    });

    it("zanjir bo'ylab finalgacha tarqaladi", () => {
        const state = playThrough(8);
        assert.ok(state.champion);

        api.revertMatchWinner(0, 0);

        assert.equal(
            api.getTournament().champion,
            null,
            "chempion tozalanmadi"
        );
        assert.equal(api.getMatch(1, 0).winner, null);
        assert.equal(api.getMatch(2, 0).winner, null);
        assert.equal(api.getMatch(1, 0).team1, null);
    });

    it("qarama-qarshi tarmoqqa tegmaydi", () => {
        playThrough(8);

        api.revertMatchWinner(0, 0);

        assert.ok(
            api.getMatch(1, 1).winner,
            "boshqa tarmoq ham tozalanib ketdi"
        );
    });

    it("BYE g'olibini bekor qilib bo'lmaydi", () => {
        api.createTournament(makeNames(5));

        const bye = api.getMatch(0, 0);
        assert.equal(bye.automaticWinner, true);

        api.revertMatchWinner(0, 0);

        assert.equal(
            api.getMatch(0, 0).winner,
            bye.winner,
            "BYE g'olibi bekor qilindi"
        );
    });

    it("o'lchangan vaqtni saqlab qoladi", () => {
        api.createTournament(makeNames(4));
        api.startMatchTimers(0, 0);

        const match = api.getMatch(0, 0);
        match.timers.team1.startedAt = Date.now() - 4000;
        match.timers.team2.startedAt = Date.now() - 4000;

        api.handleTeamClick(0, 0, 1);

        const saved = api.getMatch(0, 0).timers.team1.elapsed;
        assert.ok(saved >= 3.9, `vaqt yozilmadi: ${saved}`);

        api.revertMatchWinner(0, 0);

        assert.equal(
            api.getMatch(0, 0).timers.team1.elapsed,
            saved,
            "bekor qilishda vaqt yo'qoldi"
        );
    });
});


describe("uchrashuv sekundomerlari", () => {
    it("g'olib tanlanganda ikkalasi to'xtaydi", () => {
        api.createTournament(makeNames(4));
        api.startMatchTimers(0, 0);

        const match = api.getMatch(0, 0);
        match.timers.team1.startedAt = Date.now() - 2000;
        match.timers.team2.startedAt = Date.now() - 2000;

        api.handleTeamClick(0, 0, 1);

        const after = api.getMatch(0, 0);
        assert.equal(after.timers.team1.running, false);
        assert.equal(after.timers.team2.running, false);
        assert.ok(after.timers.team1.elapsed >= 1.9);
        assert.ok(after.timers.team2.elapsed >= 1.9);
    });

    it("bitta ishtirokchini alohida to'xtatadi", () => {
        api.createTournament(makeNames(4));
        api.startMatchTimers(0, 0);

        api.stopParticipantTimer(0, 0, 1);

        const match = api.getMatch(0, 0);
        assert.equal(match.timers.team1.running, false);
        assert.equal(
            match.timers.team2.running,
            true,
            "ikkinchi sekundomer ham to'xtab qoldi"
        );
    });

    it("qayta boshlash vaqtni nolga qaytaradi", () => {
        api.createTournament(makeNames(4));
        api.startMatchTimers(0, 0);

        api.getMatch(0, 0).timers.team1.startedAt =
            Date.now() - 5000;

        api.resetMatchTimers(0, 0);

        const match = api.getMatch(0, 0);
        assert.equal(api.getElapsedSeconds(match.timers.team1), 0);
        assert.equal(api.getElapsedSeconds(match.timers.team2), 0);
        assert.equal(match.timers.team1.running, false);
    });
});


describe("saqlash va qayta yuklash", () => {
    it("qayta yuklaganda ishlagan vaqt yo'qolmaydi", () => {
        api.createTournament(makeNames(4));
        api.startMatchTimers(0, 0);

        const live = api.getTournament();
        live.rounds[0].matches[0].timers.team1.startedAt =
            Date.now() - 6000;

        storage.set(
            api.STORAGE_KEY,
            JSON.stringify(live)
        );

        api.setTournament(null);
        api.loadTournament();

        const timer = api.getMatch(0, 0).timers.team1;

        assert.equal(
            timer.running,
            false,
            "yuklashda sekundomer to'xtamadi"
        );
        assert.ok(
            timer.elapsed >= 5.9,
            `vaqt yo'qoldi: ${timer.elapsed}`
        );
    });

    it("ikki marta yuklaganda vaqt o'sib ketmaydi", () => {
        api.createTournament(makeNames(4));
        api.startMatchTimers(0, 0);

        const live = api.getTournament();
        live.rounds[0].matches[0].timers.team1.startedAt =
            Date.now() - 6000;

        storage.set(
            api.STORAGE_KEY,
            JSON.stringify(live)
        );

        api.setTournament(null);
        api.loadTournament();
        const first = api.getMatch(0, 0).timers.team1.elapsed;

        api.setTournament(null);
        api.loadTournament();
        const second = api.getMatch(0, 0).timers.team1.elapsed;

        assert.ok(first >= 5.9, `birinchi yuklash: ${first}`);
        assert.equal(
            second,
            first,
            `ikkinchi yuklashda vaqt o'sdi: ${first} -> ${second}`
        );
    });

    it("eski format (match.timer) ko'chiriladi", () => {
        api.createTournament(makeNames(4));

        const legacy = JSON.parse(
            JSON.stringify(api.getTournament())
        );

        legacy.rounds.forEach((round) => {
            round.matches.forEach((match) => {
                delete match.timers;
                match.timer = { elapsed: 42, running: true };
            });
        });

        api.setTournament(legacy);

        assert.equal(api.normalizeLoadedTournament(), true);

        const match = api.getMatch(0, 0);
        assert.equal(match.timers.team1.elapsed, 42);
        assert.equal(match.timers.team1.running, false);
        assert.equal(
            match.timer,
            undefined,
            "eski maydon o'chirilmadi"
        );
    });

    it("buzilgan ma'lumot tozalanadi", () => {
        storage.set(api.STORAGE_KEY, "{buzilgan json");

        api.loadTournament();

        assert.equal(api.getTournament(), null);
        assert.equal(storage.has(api.STORAGE_KEY), false);
    });
});
