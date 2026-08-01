"use strict";


/* =====================================================
   ASOSIY SOZLAMALAR
===================================================== */

const STORAGE_KEY =
    "raqamli-avlod-tournament-three-player-v1";


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
    "Mobil dasturlash guruhi",
    "Telegram bot guruhi",
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
   UCHRASHUV YARATISH
===================================================== */

function createMatch(teams) {
    return {
        teams: [...teams],
        winner: null,
        timers: teams.map(() => createTimer()),
    };
}


/* =====================================================
   2 YOKI 3 KISHILIK BAHLARGA AJRATISH
===================================================== */

function createRoundMatches(participants) {
    const matches = [];
    let startIndex = 0;

    /*
     * Ishtirokchilar soni toq bo‘lsa,
     * birinchi bahs 3 kishilik bo‘ladi.
     *
     * Hech kim avtomatik o‘tmaydi.
     */
    if (
        participants.length > 1 &&
        participants.length % 2 !== 0
    ) {
        matches.push(
            createMatch(
                participants.slice(0, 3)
            )
        );

        startIndex = 3;
    }

    /*
     * Qolganlar 2 kishilik bahslarga
     * joylashtiriladi.
     */
    for (
        let index = startIndex;
        index < participants.length;
        index += 2
    ) {
        const teams =
            participants.slice(index, index + 2);

        if (teams.length >= 2) {
            matches.push(createMatch(teams));
        }
    }

    return matches;
}


/* =====================================================
   TURNIR YARATISH
===================================================== */

function createTournament(participants) {
    tournament = {
        originalParticipants: [...participants],
        rounds: [
            {
                matches:
                    createRoundMatches(participants),
            },
        ],
        champion: null,
        createdAt: new Date().toISOString(),
    };

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
   BOSQICH TUGAGANINI TEKSHIRISH
===================================================== */

function isRoundComplete(roundIndex) {
    const round =
        tournament.rounds[roundIndex];

    if (
        !round ||
        !Array.isArray(round.matches) ||
        round.matches.length === 0
    ) {
        return false;
    }

    return round.matches.every(
        (match) => Boolean(match.winner)
    );
}


/* =====================================================
   KEYINGI BOSQICHNI YARATISH
===================================================== */

function createNextRound(roundIndex) {
    if (!isRoundComplete(roundIndex)) {
        return;
    }

    const currentRound =
        tournament.rounds[roundIndex];

    const winners =
        currentRound.matches.map(
            (match) => match.winner
        );


    /*
     * Faqat bitta g‘olib qolgan bo‘lsa,
     * u turnir chempioni bo‘ladi.
     */
    if (winners.length === 1) {
        tournament.champion = winners[0];
        return;
    }


    /*
     * Keyingi bosqich oldin yaratilgan bo‘lsa,
     * qayta yaratmaymiz.
     */
    if (tournament.rounds[roundIndex + 1]) {
        return;
    }


    /*
     * G‘oliblar soni toq bo‘lsa,
     * keyingi bosqichda ham 3 kishilik bahs bo‘ladi.
     */
    tournament.rounds.push({
        matches: createRoundMatches(winners),
    });
}


/* =====================================================
   JAMOANI BOSISH
===================================================== */

function handleTeamClick(
    roundIndex,
    matchIndex,
    teamIndex
) {
    const match =
        getMatch(roundIndex, matchIndex);

    if (!match || match.winner) {
        return;
    }

    const selectedTeam =
        match.teams[teamIndex];

    const timer =
        match.timers[teamIndex];

    if (!selectedTeam || !timer) {
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
     * tanlangan ishtirokchi g‘olib bo‘ladi.
     */
    match.timers.forEach((matchTimer) => {
        matchTimer.running = false;
    });

    match.winner = selectedTeam;


    /*
     * Bosqichdagi barcha bahslar tugaganidan
     * keyingina keyingi bosqich yaratiladi.
     */
    createNextRound(roundIndex);

    saveTournament();
    renderTournament();
}


/* =====================================================
   UCHRASHUV SEKUNDOMERINI TOZALASH
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

    match.timers =
        match.teams.map(() => createTimer());

    saveTournament();
    renderTournament();
}


/* =====================================================
   SEKUNDOMER ISHLASHI
===================================================== */

function runStopwatchTick() {
    if (!tournament) {
        return;
    }

    let changed = false;

    tournament.rounds.forEach((round) => {
        round.matches.forEach((match) => {
            match.timers.forEach((timer) => {
                if (timer.running) {
                    timer.elapsed += 1;
                    changed = true;
                }
            });
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
                Number(element.dataset.roundIndex);

            const matchIndex =
                Number(element.dataset.matchIndex);

            const teamIndex =
                Number(element.dataset.teamIndex);

            const match =
                getMatch(roundIndex, matchIndex);

            if (
                !match ||
                !match.timers[teamIndex]
            ) {
                return;
            }

            const timer =
                match.timers[teamIndex];

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

function getRoundParticipantCount(roundIndex) {
    const round =
        tournament.rounds[roundIndex];

    if (!round) {
        return 0;
    }

    return round.matches.reduce(
        (total, match) => {
            return total + match.teams.length;
        },
        0
    );
}


function getRoundName(roundIndex) {
    const participantTotal =
        getRoundParticipantCount(roundIndex);

    const round =
        tournament.rounds[roundIndex];


    /*
     * Bitta bahs qolgan bo‘lsa:
     * 2 yoki 3 kishilik final bo‘ladi.
     */
    if (
        round &&
        round.matches.length === 1
    ) {
        return "Final";
    }

    if (participantTotal >= 17) {
        return "1/16 final";
    }

    if (participantTotal >= 9) {
        return "1/8 final";
    }

    if (participantTotal >= 5) {
        return "1/4 final";
    }

    if (participantTotal >= 4) {
        return "Yarim final";
    }

    return `${roundIndex + 1}-bosqich`;
}


/* =====================================================
   JAMOA TUGMASINI YARATISH
===================================================== */

function createTeamButton({
    team,
    winner,
    timer,
    roundIndex,
    matchIndex,
    teamIndex,
}) {
    const button =
        document.createElement("button");

    button.type = "button";
    button.className = "team-button";


    if (timer.running) {
        button.classList.add(
            "timer-running"
        );
    }


    if (winner === team) {
        button.classList.add("winner");
    }


    if (
        winner &&
        winner !== team
    ) {
        button.classList.add("loser");
    }


    const seed =
        document.createElement("span");

    seed.className = "team-seed";
    seed.textContent =
        String(teamIndex + 1);


    const information =
        document.createElement("span");

    information.className =
        "team-information";


    const name =
        document.createElement("span");

    name.className = "team-name";
    name.textContent = team;


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

    stopwatch.dataset.teamIndex =
        String(teamIndex);

    stopwatch.textContent =
        formatTime(timer.elapsed);


    if (timer.running) {
        stopwatch.classList.add("active");
    }


    const action =
        document.createElement("small");

    action.className =
        "participant-action";


    if (winner === team) {
        action.textContent =
            "Keyingi bosqichga o‘tdi";
    } else if (
        winner &&
        winner !== team
    ) {
        action.textContent =
            "Musobaqadan chiqdi";
    } else if (timer.clickCount === 0) {
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


    if (winner === team) {
        const check =
            document.createElement("span");

        check.className =
            "winner-check";

        check.textContent = "✓";

        button.append(check);
    }


    button.disabled =
        Boolean(winner);


    if (!button.disabled) {
        button.addEventListener(
            "click",
            () => {
                handleTeamClick(
                    roundIndex,
                    matchIndex,
                    teamIndex
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
        match.timers.some((timer) => {
            return (
                timer.elapsed > 0 ||
                timer.clickCount > 0
            );
        });


    button.disabled =
        Boolean(match.winner) ||
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


    if (match.teams.length === 3) {
        element.classList.add(
            "three-player-match"
        );
    }


    const matchNumber =
        document.createElement("span");

    matchNumber.className =
        "match-number";

    matchNumber.textContent =
        match.teams.length === 3
            ? `Uchrashuv ${matchIndex + 1} · 3 kishilik`
            : `Uchrashuv ${matchIndex + 1}`;


    element.append(matchNumber);


    match.teams.forEach(
        (team, teamIndex) => {
            const teamButton =
                createTeamButton({
                    team,
                    winner: match.winner,
                    timer:
                        match.timers[teamIndex],
                    roundIndex,
                    matchIndex,
                    teamIndex,
                });

            element.append(teamButton);
        }
    );


    const resetButton =
        createResetButton(
            roundIndex,
            matchIndex,
            match
        );

    element.append(resetButton);

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
            "Ishtirokchilar soni toq bo‘lsa, " +
            "bitta bahs 3 kishilik bo‘ladi. " +
            "Har bir bahsdan faqat bitta g‘olib chiqadi.";
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


function loadTournament() {
    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        return;
    }

    try {
        tournament = JSON.parse(saved);


        tournament.rounds.forEach((round) => {
            round.matches.forEach((match) => {
                match.timers.forEach((timer) => {
                    timer.running = false;
                });
            });
        });


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


    drawButton.disabled = true;
    drawButton.textContent =
        "Qur’a tashlanmoqda...";


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


        setupSection.classList.add(
            "hidden"
        );

        tournamentSection.classList.remove(
            "hidden"
        );


        renderTournament();


        tournamentSection.scrollIntoView({
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
        drawButton.disabled = false;
        drawButton.textContent =
            "Qur’a tashlash";
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

    tournamentSection.classList.add(
        "hidden"
    );

    setupSection.classList.remove(
        "hidden"
    );

    bracketElement.innerHTML = "";

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
   TOZALASH
===================================================== */

function clearEverything() {
    tournament = null;

    localStorage.removeItem(
        STORAGE_KEY
    );

    participantInput.value = "";

    bracketElement.innerHTML = "";

    tournamentSection.classList.add(
        "hidden"
    );

    setupSection.classList.remove(
        "hidden"
    );

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
   TUGMALAR
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