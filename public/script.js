"use strict";


/* =====================================================
   ASOSIY SOZLAMALAR
===================================================== */

const STORAGE_KEY =
    "raqamli-avlod-standard-bye-bracket-v50";


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
    "Aziz",
    "Abdulrazzoq",
    "Bilo",
    "Ali",
    "AKT guruhi",
];


let tournament = null;


/* =====================================================
   ISHTIROKCHILARNI O‘QISH
===================================================== */

function parseParticipants(value) {
    const rawNames = value
        .split(/[\n,;]+/)
        .map((name) => name.trim())
        .filter(Boolean);

    const participants = [];
    const usedNames = new Set();

    rawNames.forEach((name) => {
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
   XABAR
===================================================== */

function showMessage(message) {
    if (!messageBox) {
        alert(message);
        return;
    }

    messageBox.textContent = message;
    messageBox.className =
        "message-box error";

    window.setTimeout(() => {
        messageBox.textContent = "";
        messageBox.className = "message-box";
    }, 5000);
}


/* =====================================================
   SEKUNDOMER
===================================================== */

function createTimer() {
    return {
        elapsed: 0,
        running: false,
        clickCount: 0,
    };
}


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


/* =====================================================
   UCHRASHUV
===================================================== */

function createMatch(team1 = null, team2 = null) {
    return {
        team1,
        team2,
        winner: null,
        automaticWinner: false,

        timers: {
            team1: createTimer(),
            team2: createTimer(),
        },
    };
}


function getTimer(match, slot) {
    if (!match || !match.timers) {
        return null;
    }

    return slot === 1
        ? match.timers.team1
        : match.timers.team2;
}


/* =====================================================
   SETKA O‘LCHAMI
===================================================== */

function getNextPowerOfTwo(number) {
    let size = 2;

    while (size < number) {
        size *= 2;
    }

    return size;
}


/* =====================================================
   BYE BILAN JOYLASHTIRISH
===================================================== */

function createFirstRoundParticipants(
    participants,
    bracketSize
) {
    const slots =
        new Array(bracketSize).fill(null);

    const matchCount =
        bracketSize / 2;

    const byeCount =
        bracketSize - participants.length;

    let participantIndex = 0;


    /*
     * Avval BYE uchrashuvlari yaratiladi.
     *
     * Masalan, 5 kishi va 8 kishilik setka:
     *
     * 1: Frontend 2-guruh  - BYE
     * 2: 3D dizayn  - BYE
     * 3: Videografiya   - BYE
     * 4: AKT guruhi"    - BYE
     */
    for (
        let matchIndex = 0;
        matchIndex < byeCount;
        matchIndex += 1
    ) {
        const firstSlot =
            matchIndex * 2;

        slots[firstSlot] =
            participants[participantIndex];

        slots[firstSlot + 1] = null;

        participantIndex += 1;
    }


    /*
     * Qolgan ishtirokchilar oddiy
     * 2 kishilik uchrashuvlarga joylashadi.
     */
    for (
        let matchIndex = byeCount;
        matchIndex < matchCount;
        matchIndex += 1
    ) {
        const firstSlot =
            matchIndex * 2;

        slots[firstSlot] =
            participants[participantIndex] || null;

        participantIndex += 1;

        slots[firstSlot + 1] =
            participants[participantIndex] || null;

        participantIndex += 1;
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
        createFirstRoundParticipants(
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
     * Keyingi bosqichlar.
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
     * BYE faqat birinchi bosqichda
     * avtomatik keyingi bosqichga o‘tadi.
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
        !Array.isArray(tournament.rounds) ||
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
    if (!tournament || !winner) {
        return;
    }


    const isFinal =
        roundIndex ===
        tournament.rounds.length - 1;


    /*
     * Final g‘olibi chempion bo‘ladi.
     */
    if (isFinal) {
        tournament.champion = winner;
        return;
    }


    const nextRoundIndex =
        roundIndex + 1;

    const nextMatchIndex =
        Math.floor(matchIndex / 2);

    const nextMatch =
        getMatch(
            nextRoundIndex,
            nextMatchIndex
        );


    if (!nextMatch) {
        return;
    }


    /*
     * 0 va 1-o‘yin g‘oliblari
     * keyingi bosqichdagi 0-o‘yinga tushadi.
     *
     * 2 va 3-o‘yin g‘oliblari
     * keyingi bosqichdagi 1-o‘yinga tushadi.
     */
    if (matchIndex % 2 === 0) {
        nextMatch.team1 = winner;
    } else {
        nextMatch.team2 = winner;
    }


    nextMatch.winner = null;
    nextMatch.automaticWinner = false;

    nextMatch.timers = {
        team1: createTimer(),
        team2: createTimer(),
    };
}


/* =====================================================
   BIRINCHI BOSQICHDAGI BYE
===================================================== */

function processFirstRoundByes() {
    if (
        !tournament ||
        !tournament.rounds[0]
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
             * Faqat bittasi bor bo‘lsa,
             * BYE orqali keyingi bosqichga o‘tadi.
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


    if (!match || match.winner) {
        return;
    }


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
        getTimer(match, slot);


    if (!timer) {
        return;
    }


    /*
     * 1-bosish: sekundomer boshlanadi.
     */
    if (timer.clickCount === 0) {
        timer.running = true;
        timer.clickCount = 1;

        saveTournament();
        renderTournament();

        return;
    }


    /*
     * 2-bosish: sekundomer to‘xtaydi.
     */
    if (timer.clickCount === 1) {
        timer.running = false;
        timer.clickCount = 2;

        saveTournament();
        renderTournament();

        return;
    }


    /*
     * 3-bosish: shu jamoa g‘olib bo‘ladi.
     */
    match.timers.team1.running = false;
    match.timers.team2.running = false;

    match.winner = selectedTeam;
    match.automaticWinner = false;


    moveWinnerForward(
        roundIndex,
        matchIndex,
        selectedTeam
    );


    saveTournament();
    renderTournament();
}


/* =====================================================
   SEKUNDOMERNI TOZALASH
===================================================== */

function resetMatchTimers(
    roundIndex,
    matchIndex
) {
    const match =
        getMatch(roundIndex, matchIndex);


    if (!match || match.winner) {
        return;
    }


    match.timers = {
        team1: createTimer(),
        team2: createTimer(),
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
                match.timers.team1.running
            ) {
                match.timers.team1.elapsed += 1;
                changed = true;
            }


            if (
                match.timers.team2.running
            ) {
                match.timers.team2.elapsed += 1;
                changed = true;
            }
        });
    });


    if (changed) {
        saveTournament();
        updateStopwatchDisplays();
    }
}


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
                getTimer(match, slot);


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
    const round =
        tournament.rounds[roundIndex];


    if (!round) {
        return "Bosqich";
    }


    const participantCapacity =
        round.matches.length * 2;


    if (participantCapacity === 32) {
        return "1/16 final";
    }


    if (participantCapacity === 16) {
        return "1/8 final";
    }


    if (participantCapacity === 8) {
        return "1/4 final";
    }


    if (participantCapacity === 4) {
        return "Yarim final";
    }


    if (participantCapacity === 2) {
        return "Final";
    }


    return `${roundIndex + 1}-bosqich`;
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
            ? getTimer(match, slot)
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
        team &&
        winner === team
    ) {
        button.classList.add("winner");
    }


    if (
        team &&
        winner &&
        winner !== team
    ) {
        button.classList.add("loser");
    }


    const seed =
        document.createElement("span");


    seed.className = "team-seed";


    if (!team) {
        seed.textContent = "—";
    } else {
        seed.textContent =
            String(slot);
    }


    const information =
        document.createElement("span");


    information.className =
        "team-information";


    const name =
        document.createElement("span");


    name.className = "team-name";


    /*
     * Birinchi bosqichdagi bo‘sh joy BYE.
     * Keyingi bosqichdagi bo‘sh joy esa
     * g‘olib kutilmoqda.
     */
    if (!team && roundIndex === 0) {
        name.textContent = "BYE";
    } else if (!team) {
        name.textContent =
            "G‘olib kutilmoqda";
    } else {
        name.textContent = team;
    }


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


    if (!team && roundIndex === 0) {
        action.textContent =
            "Bo‘sh yo‘llanma";
    } else if (!team) {
        action.textContent =
            "Oldingi bahs g‘olibi kutilmoqda";
    } else if (
        winner === team &&
        automaticWinner
    ) {
        action.textContent =
            "BYE orqali keyingi bosqichga o‘tdi";
    } else if (winner === team) {
        action.textContent =
            "Keyingi bosqichga o‘tdi";
    } else if (
        winner &&
        winner !== team
    ) {
        action.textContent =
            "Musobaqadan chiqdi";
    } else if (!opponent) {
        action.textContent =
            "Raqib kutilmoqda";
    } else if (
        !timer ||
        timer.clickCount === 0
    ) {
        action.textContent =
            "1-bosish: boshlash";
    } else if (
        timer.clickCount === 1
    ) {
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
        team &&
        winner === team
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
   RESET TUGMASI
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


    const hasProgress =
        match.timers.team1.elapsed > 0 ||
        match.timers.team2.elapsed > 0 ||
        match.timers.team1.clickCount > 0 ||
        match.timers.team2.clickCount > 0;


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
    if (!tournament || !bracketElement) {
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


                pair.className =
                    "match-pair";


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
            "Ishtirokchilar soni setkaga to‘g‘ri kelmasa, " +
            "ayrim ishtirokchilar BYE orqali faqat keyingi bosqichga o‘tadi. " +
            "Barcha haqiqiy uchrashuvlar 2 kishilik bo‘ladi.";
    }


    if (tournament.champion) {
        championPanel?.classList.remove(
            "hidden"
        );


        if (championName) {
            championName.textContent =
                tournament.champion;
        }


        if (tournamentStatus) {
            tournamentStatus.textContent =
                "Yakunlandi";
        }
    } else {
        championPanel?.classList.add(
            "hidden"
        );


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
   SAQLASH
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
        round.matches.forEach((match) => {
            if (!match.timers) {
                match.timers = {
                    team1: createTimer(),
                    team2: createTimer(),
                };
            }


            if (!match.timers.team1) {
                match.timers.team1 =
                    createTimer();
            }


            if (!match.timers.team2) {
                match.timers.team2 =
                    createTimer();
            }


            match.timers.team1.running =
                false;

            match.timers.team2.running =
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


        if (!normalizeLoadedTournament()) {
            throw new Error(
                "Saqlangan turnir noto‘g‘ri."
            );
        }


        setupSection?.classList.add(
            "hidden"
        );


        tournamentSection?.classList.remove(
            "hidden"
        );


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
            const errorData =
                await response.json();


            throw new Error(
                errorData.message ||
                "Serverda xatolik yuz berdi."
            );
        }


        const data =
            await response.json();


        if (
            !data.success ||
            !Array.isArray(data.participants)
        ) {
            throw new Error(
                data.message ||
                "Qur’a tashlashda xatolik."
            );
        }


        createTournament(
            data.participants
        );


        saveTournament();


        setupSection?.classList.add(
            "hidden"
        );


        tournamentSection?.classList.remove(
            "hidden"
        );


        /*
         * Qur’a tashlanganda avtomatik
         * to‘liq ekran rejimiga o‘tadi.
         */
        try {
            if (!document.fullscreenElement) {
                await document
                    .documentElement
                    .requestFullscreen();
            }
        } catch (fullscreenError) {
            console.warn(
                "To‘liq ekran ochilmadi:",
                fullscreenError
            );
        }


        renderTournament();


        tournamentSection?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    } catch (error) {
        console.error(error);


        showMessage(
            error.message ||
            "Qur’a tashlashda xatolik."
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


    tournamentSection?.classList.add(
        "hidden"
    );


    setupSection?.classList.remove(
        "hidden"
    );


    if (bracketElement) {
        bracketElement.innerHTML = "";
    }


    championPanel?.classList.add(
        "hidden"
    );


    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });
}


/* =====================================================
   TOZALASH
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


    tournamentSection?.classList.add(
        "hidden"
    );


    setupSection?.classList.remove(
        "hidden"
    );


    championPanel?.classList.add(
        "hidden"
    );


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
        } else {
            await document.exitFullscreen();
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

participantInput?.addEventListener(
    "input",
    updateParticipantCounter
);


exampleButton?.addEventListener(
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


drawButton?.addEventListener(
    "click",
    startRandomDraw
);


newTournamentButton?.addEventListener(
    "click",
    startNewTournament
);


restartButton?.addEventListener(
    "click",
    startNewTournament
);


clearButton?.addEventListener(
    "click",
    clearEverything
);


fullscreenButton?.addEventListener(
    "click",
    toggleFullscreen
);


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