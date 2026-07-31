"use strict";

const STORAGE_KEY = "raqamli-avlod-bracket-v3";

const participantInput = document.querySelector("#participantInput");
const participantCount = document.querySelector("#participantCount");
const drawButton = document.querySelector("#drawButton");
const exampleButton = document.querySelector("#exampleButton");
const clearButton = document.querySelector("#clearButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const newTournamentButton = document.querySelector(
    "#newTournamentButton"
);
const restartButton = document.querySelector("#restartButton");

const setupSection = document.querySelector("#setupSection");
const tournamentSection = document.querySelector(
    "#tournamentSection"
);
const bracketElement = document.querySelector("#bracket");
const messageBox = document.querySelector("#messageBox");

const totalParticipantCount = document.querySelector(
    "#totalParticipantCount"
);
const totalRoundCount = document.querySelector("#totalRoundCount");
const tournamentStatus = document.querySelector(
    "#tournamentStatus"
);
const tournamentDescription = document.querySelector(
    "#tournamentDescription"
);

const championPanel = document.querySelector("#championPanel");
const championName = document.querySelector("#championName");

const exampleParticipants = [
    "Robototexnika 1-guruh",
    "Frontend 2-guruh",
    "3D dizayn guruhi",
    "Videografiya guruhi",
    "AKT guruhi",
];

let tournament = null;
let timerInterval = null;


function parseParticipants(value) {
    const names = value
        .split(/[\n,;]+/)
        .map((name) => name.trim())
        .filter(Boolean);

    const uniqueParticipants = [];
    const usedNames = new Set();

    names.forEach((name) => {
        const normalizedName = name.toLocaleLowerCase("uz-UZ");

        if (!usedNames.has(normalizedName)) {
            usedNames.add(normalizedName);
            uniqueParticipants.push(name);
        }
    });

    return uniqueParticipants;
}


function updateParticipantCounter() {
    const participants = parseParticipants(participantInput.value);
    participantCount.textContent = String(participants.length);
}


function showMessage(message) {
    messageBox.textContent = message;
    messageBox.className = "message-box error";

    window.setTimeout(() => {
        messageBox.className = "message-box";
    }, 5000);
}


function createTimer() {
    return {
        duration: 60,
        remaining: 60,
        running: false,
        finished: false,
    };
}


function createMatch(team1 = null, team2 = null) {
    return {
        team1,
        team2,
        winner: null,
        timer: createTimer(),
    };
}


function getLowerPowerOfTwo(number) {
    let power = 1;

    while (power * 2 <= number) {
        power *= 2;
    }

    return power;
}


function getMainRoundName(teamCount) {
    if (teamCount === 2) {
        return "Final";
    }

    if (teamCount === 4) {
        return "1/4 final";
    }

    if (teamCount === 8) {
        return "1/8 final";
    }

    if (teamCount === 16) {
        return "1/16 final";
    }

    if (teamCount === 32) {
        return "1/32 final";
    }

    return `${teamCount} ishtirokchi`;
}


function getRoundName(roundIndex) {
    const round = tournament.rounds[roundIndex];

    if (round.type === "preliminary") {
        return "Saralash";
    }

    const teamsInRound = round.matches.length * 2;

    if (teamsInRound === 2) {
        return "Final";
    }

    if (teamsInRound === 4) {
        return "Yarim final";
    }

    if (teamsInRound === 8) {
        return "1/4 final";
    }

    if (teamsInRound === 16) {
        return "1/8 final";
    }

    if (teamsInRound === 32) {
        return "1/16 final";
    }

    return getMainRoundName(teamsInRound);
}


function createTournament(participants) {
    const participantTotal = participants.length;
    const mainBracketSize = getLowerPowerOfTwo(participantTotal);

    /*
     * Masalan:
     * 5 - 4 = 1 ta saralash uchrashuvi.
     * 6 - 4 = 2 ta saralash uchrashuvi.
     * 7 - 4 = 3 ta saralash uchrashuvi.
     */
    const preliminaryMatchCount =
        participantTotal - mainBracketSize;

    const preliminaryParticipantCount =
        preliminaryMatchCount * 2;

    const preliminaryParticipants = participants.slice(
        0,
        preliminaryParticipantCount
    );

    const directParticipants = participants.slice(
        preliminaryParticipantCount
    );

    const rounds = [];

    if (preliminaryMatchCount > 0) {
        const preliminaryMatches = [];

        for (
            let index = 0;
            index < preliminaryParticipants.length;
            index += 2
        ) {
            preliminaryMatches.push(
                createMatch(
                    preliminaryParticipants[index],
                    preliminaryParticipants[index + 1]
                )
            );
        }

        rounds.push({
            type: "preliminary",
            matches: preliminaryMatches,
        });
    }

    const firstMainMatches = [];
    const firstMainParticipantSlots =
        new Array(mainBracketSize).fill(null);

    /*
     * To‘g‘ridan-to‘g‘ri o‘tgan ishtirokchilarni
     * asosiy setkaga joylashtiramiz.
     */
    directParticipants.forEach((participant, index) => {
        firstMainParticipantSlots[index] = participant;
    });

    for (
        let index = 0;
        index < mainBracketSize;
        index += 2
    ) {
        firstMainMatches.push(
            createMatch(
                firstMainParticipantSlots[index],
                firstMainParticipantSlots[index + 1]
            )
        );
    }

    rounds.push({
        type: "main",
        matches: firstMainMatches,
    });

    let matchCount = firstMainMatches.length / 2;

    while (matchCount >= 1) {
        const matches = [];

        for (let index = 0; index < matchCount; index += 1) {
            matches.push(createMatch());
        }

        rounds.push({
            type: "main",
            matches,
        });

        matchCount /= 2;
    }

    return {
        originalParticipants: participants,
        mainBracketSize,
        preliminaryMatchCount,
        rounds,
        champion: null,
    };
}


function getFirstMainRoundIndex() {
    return tournament.rounds[0].type === "preliminary"
        ? 1
        : 0;
}


function fillPreliminaryWinners() {
    if (
        !tournament ||
        tournament.rounds[0].type !== "preliminary"
    ) {
        return;
    }

    const preliminaryRound = tournament.rounds[0];
    const firstMainRound = tournament.rounds[1];

    const directParticipantCount =
        tournament.mainBracketSize -
        tournament.preliminaryMatchCount;

    preliminaryRound.matches.forEach((match, index) => {
        const slotIndex = directParticipantCount + index;

        const targetMatchIndex = Math.floor(slotIndex / 2);
        const targetPosition = slotIndex % 2;

        const targetMatch =
            firstMainRound.matches[targetMatchIndex];

        if (targetPosition === 0) {
            targetMatch.team1 = match.winner;
        } else {
            targetMatch.team2 = match.winner;
        }
    });
}


function clearNextRounds(roundIndex, matchIndex, previousWinner) {
    const nextRoundIndex = roundIndex + 1;

    if (nextRoundIndex >= tournament.rounds.length) {
        tournament.champion = null;
        return;
    }

    const currentRound = tournament.rounds[roundIndex];
    const nextRound = tournament.rounds[nextRoundIndex];

    /*
     * Saralashdan keyin g‘oliblar birinchi asosiy
     * setkadagi maxsus bo‘sh joylarga tushadi.
     */
    if (currentRound.type === "preliminary") {
        fillPreliminaryWinners();
        clearAllMainRoundResults();
        return;
    }

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextRound.matches[nextMatchIndex];

    if (nextMatch.winner) {
        const nextPreviousWinner = nextMatch.winner;
        nextMatch.winner = null;

        clearNextRounds(
            nextRoundIndex,
            nextMatchIndex,
            nextPreviousWinner
        );
    }

    if (
        matchIndex % 2 === 0 &&
        nextMatch.team1 === previousWinner
    ) {
        nextMatch.team1 = null;
    }

    if (
        matchIndex % 2 === 1 &&
        nextMatch.team2 === previousWinner
    ) {
        nextMatch.team2 = null;
    }

    tournament.champion = null;
}


function clearAllMainRoundResults() {
    const firstMainRoundIndex = getFirstMainRoundIndex();

    for (
        let roundIndex = firstMainRoundIndex;
        roundIndex < tournament.rounds.length;
        roundIndex += 1
    ) {
        const round = tournament.rounds[roundIndex];

        round.matches.forEach((match) => {
            match.winner = null;
        });

        if (roundIndex > firstMainRoundIndex) {
            round.matches.forEach((match) => {
                match.team1 = null;
                match.team2 = null;
            });
        }
    }

    tournament.champion = null;
}


function moveWinnerForward(
    roundIndex,
    matchIndex,
    winner
) {
    const currentRound = tournament.rounds[roundIndex];

    if (currentRound.type === "preliminary") {
        fillPreliminaryWinners();
        return;
    }

    const isLastRound =
        roundIndex === tournament.rounds.length - 1;

    if (isLastRound) {
        tournament.champion = winner;
        return;
    }

    const nextRound = tournament.rounds[roundIndex + 1];
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextRound.matches[nextMatchIndex];

    if (matchIndex % 2 === 0) {
        nextMatch.team1 = winner;
    } else {
        nextMatch.team2 = winner;
    }
}


function selectWinner(roundIndex, matchIndex, selectedTeam) {
    const round = tournament.rounds[roundIndex];
    const match = round.matches[matchIndex];

    if (!match.team1 || !match.team2) {
        return;
    }

    if (
        selectedTeam !== match.team1 &&
        selectedTeam !== match.team2
    ) {
        return;
    }

    if (match.winner === selectedTeam) {
        return;
    }

    const previousWinner = match.winner;

    if (previousWinner) {
        clearNextRounds(
            roundIndex,
            matchIndex,
            previousWinner
        );
    }

    match.winner = selectedTeam;

    moveWinnerForward(
        roundIndex,
        matchIndex,
        selectedTeam
    );

    saveTournament();
    renderTournament();
}


function formatTime(seconds) {
    const safeSeconds = Math.max(0, seconds);

    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}


function stopAllTimersExcept(
    activeRoundIndex,
    activeMatchIndex
) {
    tournament.rounds.forEach((round, roundIndex) => {
        round.matches.forEach((match, matchIndex) => {
            if (
                roundIndex !== activeRoundIndex ||
                matchIndex !== activeMatchIndex
            ) {
                match.timer.running = false;
            }
        });
    });
}


function startTimer(roundIndex, matchIndex) {
    const match =
        tournament.rounds[roundIndex].matches[matchIndex];

    if (match.timer.remaining <= 0) {
        match.timer.remaining = match.timer.duration;
        match.timer.finished = false;
    }

    stopAllTimersExcept(roundIndex, matchIndex);

    match.timer.running = true;
    saveTournament();
    renderTournament();
}


function pauseTimer(roundIndex, matchIndex) {
    const match =
        tournament.rounds[roundIndex].matches[matchIndex];

    match.timer.running = false;

    saveTournament();
    renderTournament();
}


function resetTimer(roundIndex, matchIndex) {
    const match =
        tournament.rounds[roundIndex].matches[matchIndex];

    match.timer.running = false;
    match.timer.remaining = match.timer.duration;
    match.timer.finished = false;

    saveTournament();
    renderTournament();
}


function changeTimerDuration(
    roundIndex,
    matchIndex,
    value
) {
    const match =
        tournament.rounds[roundIndex].matches[matchIndex];

    let duration = Number.parseInt(value, 10);

    if (Number.isNaN(duration)) {
        duration = 60;
    }

    duration = Math.max(5, Math.min(duration, 3600));

    match.timer.duration = duration;
    match.timer.remaining = duration;
    match.timer.running = false;
    match.timer.finished = false;

    saveTournament();
    renderTournament();
}


function runTimerTick() {
    if (!tournament) {
        return;
    }

    let hasRunningTimer = false;

    tournament.rounds.forEach((round) => {
        round.matches.forEach((match) => {
            if (!match.timer.running) {
                return;
            }

            hasRunningTimer = true;
            match.timer.remaining -= 1;

            if (match.timer.remaining <= 0) {
                match.timer.remaining = 0;
                match.timer.running = false;
                match.timer.finished = true;
            }
        });
    });

    if (hasRunningTimer) {
        saveTournament();
        updateTimerDisplays();
    }
}


function updateTimerDisplays() {
    document
        .querySelectorAll("[data-timer-display]")
        .forEach((element) => {
            const roundIndex = Number(
                element.dataset.roundIndex
            );

            const matchIndex = Number(
                element.dataset.matchIndex
            );

            const match =
                tournament.rounds[roundIndex]
                    .matches[matchIndex];

            element.textContent =
                formatTime(match.timer.remaining);

            element.classList.toggle(
                "finished",
                match.timer.finished
            );
        });
}


function createTeamButton(
    team,
    opponent,
    winner,
    roundIndex,
    matchIndex,
    position
) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "team-button";

    if (!team) {
        button.classList.add("empty-team");
        button.disabled = true;
    }

    if (winner === team && team) {
        button.classList.add("winner");
    }

    if (winner && team && winner !== team) {
        button.classList.add("loser");
    }

    const seed = document.createElement("span");
    seed.className = "team-seed";
    seed.textContent = team ? String(position) : "—";

    const name = document.createElement("span");
    name.className = "team-name";
    name.textContent = team || "Kutilmoqda";

    button.append(seed, name);

    if (winner === team && team) {
        const check = document.createElement("span");
        check.className = "winner-check";
        check.textContent = "✓";
        button.append(check);
    }

    button.disabled = !team || !opponent;

    if (!button.disabled) {
        button.addEventListener("click", () => {
            selectWinner(
                roundIndex,
                matchIndex,
                team
            );
        });
    }

    return button;
}


function createTimerPanel(roundIndex, matchIndex, match) {
    const timerPanel = document.createElement("div");
    timerPanel.className = "match-timer";

    const display = document.createElement("div");
    display.className = "timer-display";
    display.dataset.timerDisplay = "true";
    display.dataset.roundIndex = String(roundIndex);
    display.dataset.matchIndex = String(matchIndex);
    display.textContent = formatTime(match.timer.remaining);

    if (match.timer.finished) {
        display.classList.add("finished");
    }

    const settings = document.createElement("div");
    settings.className = "timer-settings";

    const input = document.createElement("input");
    input.type = "number";
    input.className = "timer-input";
    input.min = "5";
    input.max = "3600";
    input.value = String(match.timer.duration);
    input.title = "Sekund";

    input.addEventListener("change", () => {
        changeTimerDuration(
            roundIndex,
            matchIndex,
            input.value
        );
    });

    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className = "timer-button start";
    startButton.textContent = "Start";

    startButton.addEventListener("click", () => {
        startTimer(roundIndex, matchIndex);
    });

    const pauseButton = document.createElement("button");
    pauseButton.type = "button";
    pauseButton.className = "timer-button pause";
    pauseButton.textContent = "Pauza";

    pauseButton.addEventListener("click", () => {
        pauseTimer(roundIndex, matchIndex);
    });

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "timer-button reset";
    resetButton.textContent = "Qayta";

    resetButton.addEventListener("click", () => {
        resetTimer(roundIndex, matchIndex);
    });

    settings.append(
        input,
        startButton,
        pauseButton,
        resetButton
    );

    timerPanel.append(display, settings);

    return timerPanel;
}


function renderTournament() {
    if (!tournament) {
        return;
    }

    bracketElement.innerHTML = "";

    tournament.rounds.forEach((round, roundIndex) => {
        const roundElement = document.createElement("section");
        roundElement.className = "round";

        const title = document.createElement("div");
        title.className = "round-title";

        const stageNumber = document.createElement("span");
        stageNumber.textContent = `${roundIndex + 1}-bosqich`;

        const stageName = document.createElement("h3");
        stageName.textContent = getRoundName(roundIndex);

        title.append(stageNumber, stageName);

        const matches = document.createElement("div");
        matches.className = "round-matches";

        round.matches.forEach((match, matchIndex) => {
            const matchElement =
                document.createElement("article");

            matchElement.className = "match";

            const matchNumber =
                document.createElement("span");

            matchNumber.className = "match-number";
            matchNumber.textContent =
                `Uchrashuv ${matchIndex + 1}`;

            const team1Button = createTeamButton(
                match.team1,
                match.team2,
                match.winner,
                roundIndex,
                matchIndex,
                matchIndex * 2 + 1
            );

            const team2Button = createTeamButton(
                match.team2,
                match.team1,
                match.winner,
                roundIndex,
                matchIndex,
                matchIndex * 2 + 2
            );

            const timerPanel = createTimerPanel(
                roundIndex,
                matchIndex,
                match
            );

            matchElement.append(
                matchNumber,
                team1Button,
                team2Button,
                timerPanel
            );

            matches.append(matchElement);
        });

        roundElement.append(title, matches);
        bracketElement.append(roundElement);
    });

    totalParticipantCount.textContent = String(
        tournament.originalParticipants.length
    );

    totalRoundCount.textContent = String(
        tournament.rounds.length
    );

    if (tournament.preliminaryMatchCount > 0) {
        tournamentDescription.textContent =
            `${tournament.originalParticipants.length} ta ishtirokchi. ` +
            `${tournament.preliminaryMatchCount} ta saralash uchrashuvi mavjud.`;
    } else {
        tournamentDescription.textContent =
            `${tournament.originalParticipants.length} ta ishtirokchi. ` +
            "Musobaqa to‘g‘ridan-to‘g‘ri asosiy setkadan boshlanadi.";
    }

    if (tournament.champion) {
        championPanel.classList.remove("hidden");
        championName.textContent = tournament.champion;
        tournamentStatus.textContent = "Yakunlandi";
    } else {
        championPanel.classList.add("hidden");
        championName.textContent = "G‘olib";
        tournamentStatus.textContent = "Davom etmoqda";
    }
}


function saveTournament() {
    if (!tournament) {
        localStorage.removeItem(STORAGE_KEY);
        return;
    }

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tournament)
    );
}


function loadTournament() {
    const storedTournament = localStorage.getItem(STORAGE_KEY);

    if (!storedTournament) {
        return;
    }

    try {
        tournament = JSON.parse(storedTournament);

        tournament.rounds.forEach((round) => {
            round.matches.forEach((match) => {
                match.timer.running = false;
            });
        });

        setupSection.classList.add("hidden");
        tournamentSection.classList.remove("hidden");

        renderTournament();
    } catch (error) {
        console.error(error);
        localStorage.removeItem(STORAGE_KEY);
        tournament = null;
    }
}


async function startRandomDraw() {
    const participants = parseParticipants(
        participantInput.value
    );

    if (participants.length < 2) {
        showMessage("Kamida 2 ta ishtirokchi kiriting.");
        return;
    }

    if (participants.length > 32) {
        showMessage(
            "Eng ko‘pi bilan 32 ta ishtirokchi kiritish mumkin."
        );
        return;
    }

    drawButton.disabled = true;
    drawButton.textContent = "Qur’a tashlanmoqda...";

    try {
        const response = await fetch("/api/draw", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                participants,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Qur’a tashlashda xatolik."
            );
        }

        tournament = createTournament(data.participants);

        saveTournament();

        setupSection.classList.add("hidden");
        tournamentSection.classList.remove("hidden");

        renderTournament();

        tournamentSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    } catch (error) {
        console.error(error);
        showMessage(error.message);
    } finally {
        drawButton.disabled = false;
        drawButton.textContent = "Qur’a tashlash";
    }
}


function startNewTournament() {
    tournament = null;
    saveTournament();

    tournamentSection.classList.add("hidden");
    setupSection.classList.remove("hidden");
    bracketElement.innerHTML = "";

    window.scrollTo({
        top: setupSection.offsetTop - 90,
        behavior: "smooth",
    });
}


function clearEverything() {
    const hasData =
        participantInput.value.trim() ||
        tournament;

    if (
        hasData &&
        !window.confirm(
            "Barcha ishtirokchilar va natijalar o‘chirilsinmi?"
        )
    ) {
        return;
    }

    tournament = null;
    participantInput.value = "";

    localStorage.removeItem(STORAGE_KEY);

    updateParticipantCounter();

    tournamentSection.classList.add("hidden");
    setupSection.classList.remove("hidden");
    bracketElement.innerHTML = "";

    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });
}


async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
            fullscreenButton.textContent = "Ekrandan chiqish";
        } else {
            await document.exitFullscreen();
            fullscreenButton.textContent = "To‘liq ekran";
        }
    } catch (error) {
        console.error(error);
    }
}


participantInput.addEventListener(
    "input",
    updateParticipantCounter
);

exampleButton.addEventListener("click", () => {
    participantInput.value =
        exampleParticipants.join("\n");

    updateParticipantCounter();
});

drawButton.addEventListener("click", startRandomDraw);
newTournamentButton.addEventListener(
    "click",
    startNewTournament
);
restartButton.addEventListener(
    "click",
    startNewTournament
);
clearButton.addEventListener("click", clearEverything);
fullscreenButton.addEventListener(
    "click",
    toggleFullscreen
);

document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
        fullscreenButton.textContent = "To‘liq ekran";
    }
});

timerInterval = window.setInterval(runTimerTick, 1000);

updateParticipantCounter();
loadTournament();