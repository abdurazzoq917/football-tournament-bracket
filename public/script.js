"use strict";


/* =====================================================
   ASOSIY SOZLAMALAR
===================================================== */

const STORAGE_KEY =
    "raqamli-avlod-football-bracket-v30";


const participantInput =
    document.querySelector("#participantInput");

const participantCount =
    document.querySelector("#participantCount");

const drawButton =
    document.querySelector("#drawButton");

const exampleButton =
    document.querySelector("#exampleButton");

const clearButton =
    document.querySelector("#clearButton");

const fullscreenButton =
    document.querySelector("#fullscreenButton");

const newTournamentButton =
    document.querySelector("#newTournamentButton");

const restartButton =
    document.querySelector("#restartButton");

const setupSection =
    document.querySelector("#setupSection");

const tournamentSection =
    document.querySelector("#tournamentSection");

const bracketElement =
    document.querySelector("#bracket");

const messageBox =
    document.querySelector("#messageBox");

const totalParticipantCount =
    document.querySelector("#totalParticipantCount");

const totalRoundCount =
    document.querySelector("#totalRoundCount");

const tournamentStatus =
    document.querySelector("#tournamentStatus");

const tournamentDescription =
    document.querySelector("#tournamentDescription");

const championPanel =
    document.querySelector("#championPanel");

const championName =
    document.querySelector("#championName");


const exampleParticipants = [
    "Robototexnika 1-guruh",
    "Frontend 2-guruh",
    "3D dizayn guruhi",
    "Videografiya guruhi",
    "AKT guruhi",
];


let tournament = null;


/* =====================================================
   ISHTIROKCHILARNI O‘QISH
===================================================== */

function parseParticipants(value) {
    const names = value
        .split(/[\n,;]+/)
        .map((name) => name.trim())
        .filter(Boolean);

    const participants = [];
    const usedNames = new Set();

    names.forEach((name) => {
        const normalizedName =
            name.toLocaleLowerCase("uz-UZ");

        if (!usedNames.has(normalizedName)) {
            usedNames.add(normalizedName);
            participants.push(name);
        }
    });

    return participants;
}


function updateParticipantCounter() {
    if (!participantInput || !participantCount) {
        return;
    }

    const participants =
        parseParticipants(participantInput.value);

    participantCount.textContent =
        String(participants.length);
}


/* =====================================================
   XABARLAR
===================================================== */

function showMessage(message, type = "error") {
    if (!messageBox) {
        alert(message);
        return;
    }

    messageBox.textContent = message;
    messageBox.className =
        `message-box ${type}`;

    window.setTimeout(() => {
        messageBox.textContent = "";
        messageBox.className = "message-box";
    }, 5000);
}


/* =====================================================
   SEKUNDOMER
===================================================== */

function formatTime(totalSeconds) {
    const safeSeconds =
        Math.max(0, Number(totalSeconds) || 0);

    const minutes =
        Math.floor(safeSeconds / 60);

    const seconds =
        safeSeconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0")
    );
}


function createTeamTimer() {
    return {
        elapsed: 0,
        running: false,
        clickCount: 0,
    };
}


function getTeamTimer(match, slot) {
    if (!match || !match.stopwatch) {
        return null;
    }

    return slot === 1
        ? match.stopwatch.team1
        : match.stopwatch.team2;
}


/* =====================================================
   TURNIR O‘LCHAMI
===================================================== */

function getNextPowerOfTwo(number) {
    let power = 2;

    while (power < number) {
        power *= 2;
    }

    return power;
}


/* =====================================================
   UCHRASHUV YARATISH
===================================================== */

function createMatch(team1 = null, team2 = null) {
    return {
        team1,
        team2,
        winner: null,
        automaticWinner: false,

        stopwatch: {
            team1: createTeamTimer(),
            team2: createTeamTimer(),
        },
    };
}


/* =====================================================
   ISHTIROKCHILARNI SETKAGA JOYLASHTIRISH
===================================================== */

function arrangeParticipants(
    participants,
    bracketSize
) {
    const slots =
        new Array(bracketSize).fill(null);

    const byeCount =
        bracketSize - participants.length;

    let participantIndex = 0;

    /*
     * Toq yoki to‘liq bo‘lmagan setkada
     * ayrim jamoalar birinchi bosqichda
     * avtomatik yo‘llanma oladi.
     */
    for (
        let byeIndex = 0;
        byeIndex < byeCount;
        byeIndex += 1
    ) {
        const slotIndex =
            byeIndex * 2;

        slots[slotIndex] =
            participants[participantIndex];

        participantIndex += 1;
    }

    /*
     * Qolgan jamoalarni bo‘sh joylarga
     * ketma-ket joylashtiramiz.
     */
    for (
        let slotIndex = 0;
        slotIndex < slots.length;
        slotIndex += 1
    ) {
        if (
            slots[slotIndex] === null &&
            participantIndex < participants.length
        ) {
            slots[slotIndex] =
                participants[participantIndex];

            participantIndex += 1;
        }
    }

    return slots;
}


/* =====================================================
   TURNIR YARATISH
===================================================== */

function createTournament(participants) {
    const bracketSize =
        getNextPowerOfTwo(participants.length);

    const arrangedParticipants =
        arrangeParticipants(
            participants,
            bracketSize
        );

    const result = {
        originalParticipants: [...participants],
        bracketSize,
        rounds: [],
        champion: null,
        createdAt: new Date().toISOString(),
    };


    /*
     * Birinchi bosqich.
     */
    const firstRoundMatches = [];

    for (
        let index = 0;
        index < arrangedParticipants.length;
        index += 2
    ) {
        firstRoundMatches.push(
            createMatch(
                arrangedParticipants[index],
                arrangedParticipants[index + 1]
            )
        );
    }

    result.rounds.push({
        matches: firstRoundMatches,
    });


    /*
     * Keyingi bosqichlarni yaratish.
     */
    let nextMatchCount =
        firstRoundMatches.length / 2;

    while (nextMatchCount >= 1) {
        const matches = [];

        for (
            let index = 0;
            index < nextMatchCount;
            index += 1
        ) {
            matches.push(createMatch());
        }

        result.rounds.push({
            matches,
        });

        nextMatchCount /= 2;
    }


    tournament = result;

    /*
     * Avtomatik yo‘llanma faqat
     * birinchi bosqichda ishlaydi.
     */
    processFirstRoundByes();

    return tournament;
}


/* =====================================================
   UCHRASHUVNI TOPISH
===================================================== */

function getMatch(roundIndex, matchIndex) {
    if (
        !tournament ||
        !tournament.rounds ||
        !tournament.rounds[roundIndex]
    ) {
        return null;
    }

    return (
        tournament
            .rounds[roundIndex]
            .matches[matchIndex] || null
    );
}


/* =====================================================
   G‘OLIBNI KEYINGI BOSQICHGA O‘TKAZISH
===================================================== */

function moveWinnerForward(
    roundIndex,
    matchIndex,
    winner
) {
    if (
        !tournament ||
        !winner
    ) {
        return;
    }

    const currentRound =
        tournament.rounds[roundIndex];

    if (!currentRound) {
        return;
    }


    /*
     * Agar hozirgi bosqich final bo‘lsa,
     * g‘olib chempion bo‘ladi.
     */
    const isFinal =
        roundIndex ===
        tournament.rounds.length - 1;

    if (isFinal) {
        tournament.champion = winner;
        return;
    }


    const nextRoundIndex =
        roundIndex + 1;

    const nextRound =
        tournament.rounds[nextRoundIndex];

    if (!nextRound) {
        return;
    }


    /*
     * Har ikkita uchrashuv g‘olibi
     * keyingi bosqichdagi bitta uchrashuvga tushadi.
     *
     * 0 va 1-o‘yin g‘olibi -> keyingi 0-o‘yin
     * 2 va 3-o‘yin g‘olibi -> keyingi 1-o‘yin
     */
    const nextMatchIndex =
        Math.floor(matchIndex / 2);

    const nextMatch =
        nextRound.matches[nextMatchIndex];

    if (!nextMatch) {
        return;
    }


    /*
     * Juft indeksdagi o‘yin g‘olibi
     * yuqoridagi joyga tushadi.
     */
    if (matchIndex % 2 === 0) {
        nextMatch.team1 = winner;
    } else {
        /*
         * Toq indeksdagi o‘yin g‘olibi
         * pastdagi joyga tushadi.
         */
        nextMatch.team2 = winner;
    }


    /*
     * Keyingi uchrashuv hali boshlanmagan bo‘lsa,
     * uning taymerlarini yangilaymiz.
     */
    if (!nextMatch.winner) {
        nextMatch.stopwatch = {
            team1: createTeamTimer(),
            team2: createTeamTimer(),
        };

        nextMatch.automaticWinner = false;
    }
}


/* =====================================================
   FAQAT BIRINCHI BOSQICHDAGI BYE
===================================================== */

function processFirstRoundByes() {
    if (
        !tournament ||
        !tournament.rounds ||
        tournament.rounds.length === 0
    ) {
        return;
    }

    const firstRound =
        tournament.rounds[0];

    firstRound.matches.forEach(
        (match, matchIndex) => {
            if (match.winner) {
                return;
            }

            const hasTeam1 =
                Boolean(match.team1);

            const hasTeam2 =
                Boolean(match.team2);

            /*
             * Ikkalasi ham bor yoki
             * ikkalasi ham bo‘sh bo‘lsa,
             * hech kim avtomatik o‘tmaydi.
             */
            if (hasTeam1 === hasTeam2) {
                return;
            }

            const automaticWinner =
                match.team1 || match.team2;

            match.winner =
                automaticWinner;

            match.automaticWinner = true;

            moveWinnerForward(
                0,
                matchIndex,
                automaticWinner
            );
        }
    );
}


/* =====================================================
   JAMOA USTIGA BOSISH
===================================================== */

function handleTeamClick(
    roundIndex,
    matchIndex,
    slot
) {
    const match =
        getMatch(roundIndex, matchIndex);

    if (!match) {
        return;
    }


    /*
     * Uchrashuv tugagan bo‘lsa,
     * qayta natija tanlab bo‘lmaydi.
     */
    if (match.winner) {
        return;
    }


    /*
     * Ikkala jamoa ham hali kelmagan bo‘lsa,
     * uchrashuv boshlanmaydi.
     */
    if (!match.team1 || !match.team2) {
        showMessage(
            "Bu uchrashuvning ikkala ishtirokchisi hali aniqlanmagan."
        );

        return;
    }


    const selectedTeam =
        slot === 1
            ? match.team1
            : match.team2;

    const timer =
        getTeamTimer(match, slot);

    if (!timer) {
        return;
    }


    /*
     * 1-bosish:
     * sekundomer boshlanadi.
     */
    if (timer.clickCount === 0) {
        timer.running = true;
        timer.clickCount = 1;

        saveTournament();
        renderTournament();

        return;
    }


    /*
     * 2-bosish:
     * sekundomer to‘xtaydi.
     */
    if (timer.clickCount === 1) {
        timer.running = false;
        timer.clickCount = 2;

        saveTournament();
        renderTournament();

        return;
    }


    /*
     * 3-bosish:
     * tanlangan jamoa g‘olib bo‘ladi.
     */
    match.stopwatch.team1.running = false;
    match.stopwatch.team2.running = false;

    match.winner = selectedTeam;
    match.automaticWinner = false;


    /*
     * G‘olib faqat bitta keyingi bosqichga o‘tadi.
     */
    moveWinnerForward(
        roundIndex,
        matchIndex,
        selectedTeam
    );


    saveTournament();
    renderTournament();
}


/* =====================================================
   SEKUNDOMERNI QAYTA BOSHLASH
===================================================== */

function resetMatchTimers(
    roundIndex,
    matchIndex
) {
    const match =
        getMatch(roundIndex, matchIndex);

    if (
        !match ||
        match.winner
    ) {
        return;
    }

    match.stopwatch = {
        team1: createTeamTimer(),
        team2: createTeamTimer(),
    };

    saveTournament();
    renderTournament();
}


/* =====================================================
   SEKUNDOMER TIK
===================================================== */

function runStopwatchTick() {
    if (!tournament) {
        return;
    }

    let changed = false;

    tournament.rounds.forEach((round) => {
        round.matches.forEach((match) => {
            if (
                match.stopwatch &&
                match.stopwatch.team1.running
            ) {
                match.stopwatch.team1.elapsed += 1;
                changed = true;
            }

            if (
                match.stopwatch &&
                match.stopwatch.team2.running
            ) {
                match.stopwatch.team2.elapsed += 1;
                changed = true;
            }
        });
    });

    if (changed) {
        saveTournament();
        updateStopwatchDisplays();
    }
}


/* =====================================================
   SEKUNDOMER KO‘RINISHINI YANGILASH
===================================================== */

function updateStopwatchDisplays() {
    document
        .querySelectorAll(
            "[data-stopwatch-display]"
        )
        .forEach((element) => {
            const roundIndex =
                Number(
                    element.dataset.roundIndex
                );

            const matchIndex =
                Number(
                    element.dataset.matchIndex
                );

            const slot =
                Number(element.dataset.slot);

            const match =
                getMatch(
                    roundIndex,
                    matchIndex
                );

            if (!match) {
                return;
            }

            const timer =
                getTeamTimer(match, slot);

            if (!timer) {
                return;
            }

            element.textContent =
                formatTime(timer.elapsed);

            element.classList.toggle(
                "active",
                timer.running
            );
        });
}


/* =====================================================
   BOSQICH NOMI
===================================================== */

function getRoundName(roundIndex) {
    if (
        !tournament ||
        !tournament.rounds[roundIndex]
    ) {
        return "Bosqich";
    }

    const teamsInRound =
        tournament
            .rounds[roundIndex]
            .matches.length * 2;

    if (teamsInRound === 32) {
        return "1/16 final";
    }

    if (teamsInRound === 16) {
        return "1/8 final";
    }

    if (teamsInRound === 8) {
        return "1/4 final";
    }

    if (teamsInRound === 4) {
        return "Yarim final";
    }

    if (teamsInRound === 2) {
        return "Final";
    }

    return `${teamsInRound} jamoalik bosqich`;
}


/* =====================================================
   JAMOA TUGMASI
===================================================== */

function createTeamButton({
    team,
    opponent,
    winner,
    automaticWinner,
    roundIndex,
    matchIndex,
    slot,
}) {
    const match =
        getMatch(roundIndex, matchIndex);

    const timer =
        match
            ? getTeamTimer(match, slot)
            : null;

    const button =
        document.createElement("button");

    button.type = "button";
    button.className = "team-button";


    if (!team) {
        button.classList.add("empty-team");
    }


    if (timer && timer.running) {
        button.classList.add(
            "timer-running"
        );
    }


    if (
        winner &&
        team &&
        winner === team
    ) {
        button.classList.add("winner");
    }


    if (
        winner &&
        team &&
        winner !== team
    ) {
        button.classList.add("loser");
    }


    const seed =
        document.createElement("span");

    seed.className = "team-seed";
    seed.textContent =
        team ? String(slot) : "—";


    const information =
        document.createElement("span");

    information.className =
        "team-information";


    const name =
        document.createElement("span");

    name.className = "team-name";
    name.textContent =
        team || "Ishtirokchi kutilmoqda";


    const stopwatch =
        document.createElement("span");

    stopwatch.className =
        "participant-stopwatch";

    stopwatch.dataset.stopwatchDisplay =
        "true";

    stopwatch.dataset.roundIndex =
        String(roundIndex);

    stopwatch.dataset.matchIndex =
        String(matchIndex);

    stopwatch.dataset.slot =
        String(slot);

    stopwatch.textContent =
        formatTime(
            timer ? timer.elapsed : 0
        );


    if (timer && timer.running) {
        stopwatch.classList.add("active");
    }


    const action =
        document.createElement("small");

    action.className =
        "participant-action";


    if (!team) {
        action.textContent =
            "G‘olib kutilmoqda";
    } else if (
        winner === team &&
        automaticWinner
    ) {
        action.textContent =
            "Avtomatik keyingi bosqichga o‘tdi";
    } else if (winner === team) {
        action.textContent =
            "Keyingi bosqichga o‘tdi";
    } else if (
        winner &&
        winner !== team
    ) {
        action.textContent =
            "Musobaqadan chiqdi";
    } else if (
        !opponent
    ) {
        action.textContent =
            "Raqib kutilmoqda";
    } else if (
        !timer ||
        timer.clickCount === 0
    ) {
        action.textContent =
            "1-bosish: boshlash";
    } else if (timer.clickCount === 1) {
        action.textContent =
            "2-bosish: to‘xtatish";
    } else {
        action.textContent =
            "3-bosish: g‘olib qilish";
    }


    information.append(
        name,
        stopwatch,
        action
    );

    button.append(
        seed,
        information
    );


    if (
        winner === team &&
        team
    ) {
        const check =
            document.createElement("span");

        check.className =
            "winner-check";

        check.textContent = "✓";

        button.append(check);
    }


    button.disabled =
        !team ||
        !opponent ||
        Boolean(winner);


    if (!button.disabled) {
        button.addEventListener(
            "click",
            () => {
                handleTeamClick(
                    roundIndex,
                    matchIndex,
                    slot
                );
            }
        );
    }

    return button;
}


/* =====================================================
   SEKUNDOMERNI TOZALASH TUGMASI
===================================================== */

function createResetButton(
    roundIndex,
    matchIndex,
    match
) {
    const button =
        document.createElement("button");

    button.type = "button";

    button.className =
        "match-reset-button";

    button.textContent =
        "Sekundlarni qayta boshlash";


    const team1Timer =
        match.stopwatch.team1;

    const team2Timer =
        match.stopwatch.team2;

    const hasProgress =
        team1Timer.elapsed > 0 ||
        team2Timer.elapsed > 0 ||
        team1Timer.clickCount > 0 ||
        team2Timer.clickCount > 0;


    button.disabled =
        Boolean(match.winner) ||
        !match.team1 ||
        !match.team2 ||
        !hasProgress;


    button.addEventListener(
        "click",
        () => {
            resetMatchTimers(
                roundIndex,
                matchIndex
            );
        }
    );

    return button;
}


/* =====================================================
   UCHRASHUV ELEMENTI
===================================================== */

function createMatchElement(
    match,
    roundIndex,
    matchIndex
) {
    const element =
        document.createElement("article");

    element.className = "match";


    const matchNumber =
        document.createElement("span");

    matchNumber.className =
        "match-number";

    matchNumber.textContent =
        `Uchrashuv ${matchIndex + 1}`;


    const team1Button =
        createTeamButton({
            team: match.team1,
            opponent: match.team2,
            winner: match.winner,
            automaticWinner:
                match.automaticWinner,
            roundIndex,
            matchIndex,
            slot: 1,
        });


    const team2Button =
        createTeamButton({
            team: match.team2,
            opponent: match.team1,
            winner: match.winner,
            automaticWinner:
                match.automaticWinner,
            roundIndex,
            matchIndex,
            slot: 2,
        });


    const resetButton =
        createResetButton(
            roundIndex,
            matchIndex,
            match
        );


    element.append(
        matchNumber,
        team1Button,
        team2Button,
        resetButton
    );

    return element;
}


/* =====================================================
   TURNIRNI CHIZISH
===================================================== */

function renderTournament() {
    if (
        !tournament ||
        !bracketElement
    ) {
        return;
    }

    bracketElement.innerHTML = "";


    tournament.rounds.forEach(
        (round, roundIndex) => {
            const roundElement =
                document.createElement("section");

            roundElement.className = "round";


            const title =
                document.createElement("div");

            title.className = "round-title";


            const label =
                document.createElement("span");

            label.textContent =
                `${roundIndex + 1}-bosqich`;


            const heading =
                document.createElement("h3");

            heading.textContent =
                getRoundName(roundIndex);


            title.append(label, heading);


            const matchesElement =
                document.createElement("div");

            matchesElement.className =
                "round-matches";


            for (
                let matchIndex = 0;
                matchIndex < round.matches.length;
                matchIndex += 2
            ) {
                const pair =
                    document.createElement("div");

                pair.className = "match-pair";


                const firstMatch =
                    round.matches[matchIndex];

                pair.append(
                    createMatchElement(
                        firstMatch,
                        roundIndex,
                        matchIndex
                    )
                );


                const secondMatch =
                    round.matches[matchIndex + 1];

                if (secondMatch) {
                    pair.append(
                        createMatchElement(
                            secondMatch,
                            roundIndex,
                            matchIndex + 1
                        )
                    );
                } else {
                    pair.classList.add(
                        "single-pair"
                    );
                }


                matchesElement.append(pair);
            }


            roundElement.append(
                title,
                matchesElement
            );

            bracketElement.append(
                roundElement
            );
        }
    );


    if (totalParticipantCount) {
        totalParticipantCount.textContent =
            String(
                tournament
                    .originalParticipants
                    .length
            );
    }


    if (totalRoundCount) {
        totalRoundCount.textContent =
            String(tournament.rounds.length);
    }


    if (tournamentDescription) {
        tournamentDescription.textContent =
            "Har ikkita uchrashuv g‘olibi keyingi bosqichda o‘zaro o‘ynaydi. " +
            "Yutqazgan jamoa turnirdan chiqadi.";
    }


    if (tournament.champion) {
        if (championPanel) {
            championPanel.classList.remove(
                "hidden"
            );
        }

        if (championName) {
            championName.textContent =
                tournament.champion;
        }

        if (tournamentStatus) {
            tournamentStatus.textContent =
                "Yakunlandi";
        }
    } else {
        if (championPanel) {
            championPanel.classList.add(
                "hidden"
            );
        }

        if (championName) {
            championName.textContent =
                "G‘olib";
        }

        if (tournamentStatus) {
            tournamentStatus.textContent =
                "Davom etmoqda";
        }
    }
}


/* =====================================================
   LOCAL STORAGE
===================================================== */

function saveTournament() {
    if (!tournament) {
        localStorage.removeItem(
            STORAGE_KEY
        );

        return;
    }

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tournament)
    );
}


function normalizeLoadedTournament() {
    if (
        !tournament ||
        !Array.isArray(tournament.rounds)
    ) {
        return false;
    }

    tournament.rounds.forEach((round) => {
        if (!Array.isArray(round.matches)) {
            round.matches = [];
        }

        round.matches.forEach((match) => {
            if (!match.stopwatch) {
                match.stopwatch = {
                    team1: createTeamTimer(),
                    team2: createTeamTimer(),
                };
            }

            if (!match.stopwatch.team1) {
                match.stopwatch.team1 =
                    createTeamTimer();
            }

            if (!match.stopwatch.team2) {
                match.stopwatch.team2 =
                    createTeamTimer();
            }

            match.stopwatch.team1.running =
                false;

            match.stopwatch.team2.running =
                false;

            if (
                typeof match.automaticWinner !==
                "boolean"
            ) {
                match.automaticWinner = false;
            }
        });
    });

    return true;
}


function loadTournament() {
    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        return;
    }

    try {
        tournament = JSON.parse(saved);

        const valid =
            normalizeLoadedTournament();

        if (!valid) {
            throw new Error(
                "Saqlangan turnir formati noto‘g‘ri."
            );
        }

        if (setupSection) {
            setupSection.classList.add(
                "hidden"
            );
        }

        if (tournamentSection) {
            tournamentSection.classList.remove(
                "hidden"
            );
        }

        renderTournament();
    } catch (error) {
        console.error(error);

        localStorage.removeItem(
            STORAGE_KEY
        );

        tournament = null;
    }
}


/* =====================================================
   QUR’A TASHLASH
===================================================== */

async function startRandomDraw() {
    if (!participantInput) {
        showMessage(
            "Ishtirokchilar maydoni topilmadi."
        );

        return;
    }

    const participants =
        parseParticipants(
            participantInput.value
        );


    if (participants.length < 2) {
        showMessage(
            "Kamida 2 ta ishtirokchi kiriting."
        );

        return;
    }


    if (participants.length > 32) {
        showMessage(
            "Ko‘pi bilan 32 ta ishtirokchi kiriting."
        );

        return;
    }


    if (drawButton) {
        drawButton.disabled = true;
        drawButton.textContent =
            "Qur’a tashlanmoqda...";
    }


    try {
        const response =
            await fetch("/api/draw", {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify({
                    participants,
                }),
            });


        if (!response.ok) {
            let errorMessage =
                "Server bilan bog‘lanishda xatolik.";

            try {
                const errorData =
                    await response.json();

                errorMessage =
                    errorData.message ||
                    errorMessage;
            } catch (error) {
                console.error(error);
            }

            throw new Error(errorMessage);
        }


        const data =
            await response.json();


        if (
            !data.success ||
            !Array.isArray(data.participants)
        ) {
            throw new Error(
                data.message ||
                "Qur’a tashlashda xatolik yuz berdi."
            );
        }


        createTournament(
            data.participants
        );

        saveTournament();


        if (setupSection) {
            setupSection.classList.add(
                "hidden"
            );
        }

        if (tournamentSection) {
            tournamentSection.classList.remove(
                "hidden"
            );
        }


        renderTournament();


        if (tournamentSection) {
            tournamentSection.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    } catch (error) {
        console.error(error);

        showMessage(
            error.message ||
            "Qur’a tashlashda xatolik yuz berdi."
        );
    } finally {
        if (drawButton) {
            drawButton.disabled = false;
            drawButton.textContent =
                "Qur’a tashlash";
        }
    }
}


/* =====================================================
   YANGI TURNIR
===================================================== */

function startNewTournament() {
    tournament = null;

    localStorage.removeItem(
        STORAGE_KEY
    );


    if (tournamentSection) {
        tournamentSection.classList.add(
            "hidden"
        );
    }


    if (setupSection) {
        setupSection.classList.remove(
            "hidden"
        );
    }


    if (bracketElement) {
        bracketElement.innerHTML = "";
    }


    if (championPanel) {
        championPanel.classList.add(
            "hidden"
        );
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });
}


/* =====================================================
   HAMMASINI TOZALASH
===================================================== */

function clearEverything() {
    tournament = null;

    localStorage.removeItem(
        STORAGE_KEY
    );


    if (participantInput) {
        participantInput.value = "";
    }


    if (bracketElement) {
        bracketElement.innerHTML = "";
    }


    if (tournamentSection) {
        tournamentSection.classList.add(
            "hidden"
        );
    }


    if (setupSection) {
        setupSection.classList.remove(
            "hidden"
        );
    }


    if (championPanel) {
        championPanel.classList.add(
            "hidden"
        );
    }


    updateParticipantCounter();


    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });
}


/* =====================================================
   TO‘LIQ EKRAN
===================================================== */

async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            await document
                .documentElement
                .requestFullscreen();

            if (fullscreenButton) {
                fullscreenButton.textContent =
                    "Ekrandan chiqish";
            }
        } else {
            await document.exitFullscreen();

            if (fullscreenButton) {
                fullscreenButton.textContent =
                    "To‘liq ekran";
            }
        }
    } catch (error) {
        console.error(error);

        showMessage(
            "To‘liq ekran rejimini ochib bo‘lmadi."
        );
    }
}


/* =====================================================
   EVENTLAR
===================================================== */

if (participantInput) {
    participantInput.addEventListener(
        "input",
        updateParticipantCounter
    );
}


if (exampleButton) {
    exampleButton.addEventListener(
        "click",
        () => {
            if (!participantInput) {
                return;
            }

            participantInput.value =
                exampleParticipants.join("\n");

            updateParticipantCounter();
        }
    );
}


if (drawButton) {
    drawButton.addEventListener(
        "click",
        startRandomDraw
    );
}


if (newTournamentButton) {
    newTournamentButton.addEventListener(
        "click",
        startNewTournament
    );
}


if (restartButton) {
    restartButton.addEventListener(
        "click",
        startNewTournament
    );
}


if (clearButton) {
    clearButton.addEventListener(
        "click",
        clearEverything
    );
}


if (fullscreenButton) {
    fullscreenButton.addEventListener(
        "click",
        toggleFullscreen
    );
}


document.addEventListener(
    "fullscreenchange",
    () => {
        if (!fullscreenButton) {
            return;
        }

        fullscreenButton.textContent =
            document.fullscreenElement
                ? "Ekrandan chiqish"
                : "To‘liq ekran";
    }
);


/* =====================================================
   ISHGA TUSHIRISH
===================================================== */

window.setInterval(
    runStopwatchTick,
    1000
);

updateParticipantCounter();
loadTournament();