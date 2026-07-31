"use strict";

const STORAGE_KEY = "raqamli-avlod-football-bracket-v20";

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
    "Desktop dasturlash guruhi",
];

let tournament = null;


function parseParticipants(value) {
    const names = value
        .split(/[\n,;]+/)
        .map((name) => name.trim())
        .filter(Boolean);

    const result = [];
    const usedNames = new Set();

    names.forEach((name) => {
        const normalizedName =
            name.toLocaleLowerCase("uz-UZ");

        if (!usedNames.has(normalizedName)) {
            usedNames.add(normalizedName);
            result.push(name);
        }
    });

    return result;
}


function updateParticipantCounter() {
    const participants =
        parseParticipants(participantInput.value);

    participantCount.textContent =
        String(participants.length);
}


function showMessage(message) {
    messageBox.textContent = message;
    messageBox.className = "message-box error";

    window.setTimeout(() => {
        messageBox.className = "message-box";
    }, 5000);
}


function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds);

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


function getNextPowerOfTwo(number) {
    let power = 2;

    while (power < number) {
        power *= 2;
    }

    return power;
}


function createTeamTimer() {
    return {
        elapsed: 0,
        running: false,
        clickCount: 0,
    };
}


function createMatch(team1 = null, team2 = null) {
    return {
        team1,
        team2,
        winner: null,

        stopwatch: {
            team1: createTeamTimer(),
            team2: createTeamTimer(),
        },
    };
}


function getTeamTimer(match, slot) {
    return slot === 1
        ? match.stopwatch.team1
        : match.stopwatch.team2;
}


function arrangeParticipants(
    participants,
    bracketSize
) {
    const slots =
        new Array(bracketSize).fill(null);

    const byeCount =
        bracketSize - participants.length;

    let participantIndex = 0;

    for (
        let matchIndex = 0;
        matchIndex < byeCount;
        matchIndex += 1
    ) {
        slots[matchIndex * 2] =
            participants[participantIndex];

        participantIndex += 1;
    }

    for (
        let index = 0;
        index < slots.length;
        index += 1
    ) {
        if (
            slots[index] === null &&
            participantIndex < participants.length
        ) {
            slots[index] =
                participants[participantIndex];

            participantIndex += 1;
        }
    }

    return slots;
}


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
    };

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

    processAutomaticByes();

    return result;
}


function getMatch(roundIndex, matchIndex) {
    if (
        !tournament ||
        !tournament.rounds[roundIndex]
    ) {
        return null;
    }

    return tournament
        .rounds[roundIndex]
        .matches[matchIndex];
}


function handleTeamClick(
    roundIndex,
    matchIndex,
    slot
) {
    const match = getMatch(
        roundIndex,
        matchIndex
    );

    if (
        !match ||
        match.winner ||
        !match.team1 ||
        !match.team2
    ) {
        return;
    }

    const selectedTeam =
        slot === 1
            ? match.team1
            : match.team2;

    const timer =
        getTeamTimer(match, slot);

    if (timer.clickCount === 0) {
        timer.running = true;
        timer.clickCount = 1;

        saveTournament();
        renderTournament();

        return;
    }

    if (timer.clickCount === 1) {
        timer.running = false;
        timer.clickCount = 2;

        saveTournament();
        renderTournament();

        return;
    }

    match.stopwatch.team1.running = false;
    match.stopwatch.team2.running = false;

    match.winner = selectedTeam;

    moveWinnerForward(
        roundIndex,
        matchIndex,
        selectedTeam
    );

    processAutomaticByes();

    saveTournament();
    renderTournament();
}


function moveWinnerForward(
    roundIndex,
    matchIndex,
    winner
) {
    const isFinal =
        roundIndex ===
        tournament.rounds.length - 1;

    if (isFinal) {
        tournament.champion = winner;
        return;
    }

    const nextRoundIndex =
        roundIndex + 1;

    const nextMatchIndex =
        Math.floor(matchIndex / 2);

    const nextMatch =
        tournament
            .rounds[nextRoundIndex]
            .matches[nextMatchIndex];

    if (matchIndex % 2 === 0) {
        nextMatch.team1 = winner;
    } else {
        nextMatch.team2 = winner;
    }
}


function processAutomaticByes() {
    if (!tournament) {
        return;
    }

    let changed = true;

    while (changed) {
        changed = false;

        tournament.rounds.forEach(
            (round, roundIndex) => {
                round.matches.forEach(
                    (match, matchIndex) => {
                        if (match.winner) {
                            return;
                        }

                        const hasTeam1 =
                            Boolean(match.team1);

                        const hasTeam2 =
                            Boolean(match.team2);

                        if (hasTeam1 === hasTeam2) {
                            return;
                        }

                        const winner =
                            match.team1 || match.team2;

                        match.winner = winner;

                        moveWinnerForward(
                            roundIndex,
                            matchIndex,
                            winner
                        );

                        changed = true;
                    }
                );
            }
        );
    }
}


function resetMatchTimers(
    roundIndex,
    matchIndex
) {
    const match = getMatch(
        roundIndex,
        matchIndex
    );

    if (!match || match.winner) {
        return;
    }

    match.stopwatch.team1 =
        createTeamTimer();

    match.stopwatch.team2 =
        createTeamTimer();

    saveTournament();
    renderTournament();
}


function runStopwatchTick() {
    if (!tournament) {
        return;
    }

    let changed = false;

    tournament.rounds.forEach((round) => {
        round.matches.forEach((match) => {
            if (match.stopwatch.team1.running) {
                match.stopwatch.team1.elapsed += 1;
                changed = true;
            }

            if (match.stopwatch.team2.running) {
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

            const match = getMatch(
                roundIndex,
                matchIndex
            );

            if (!match) {
                return;
            }

            const timer =
                getTeamTimer(match, slot);

            element.textContent =
                formatTime(timer.elapsed);

            element.classList.toggle(
                "active",
                timer.running
            );
        });
}


function getRoundName(roundIndex) {
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


function createTeamButton({
    team,
    opponent,
    winner,
    roundIndex,
    matchIndex,
    slot,
}) {
    const match = getMatch(
        roundIndex,
        matchIndex
    );

    const timer = match
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

    if (winner === team && team) {
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
        team || "Bo‘sh yo‘llanma";

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

    if (winner === team && team) {
        action.textContent =
            "Keyingi bosqichga o‘tdi";
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
            "3-bosish: keyingi bosqich";
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

    if (winner === team && team) {
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
        match.stopwatch.team1.elapsed > 0 ||
        match.stopwatch.team2.elapsed > 0 ||
        match.stopwatch.team1.clickCount > 0 ||
        match.stopwatch.team2.clickCount > 0;

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
            roundIndex,
            matchIndex,
            slot: 1,
        });

    const team2Button =
        createTeamButton({
            team: match.team2,
            opponent: match.team1,
            winner: match.winner,
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


function renderTournament() {
    if (!tournament) {
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

    totalParticipantCount.textContent =
        String(
            tournament
                .originalParticipants
                .length
        );

    totalRoundCount.textContent =
        String(tournament.rounds.length);

    tournamentDescription.textContent =
        "Toq yoki juft jamoalar bitta futbol setkasiga joylanadi. " +
        "1-bosish boshlaydi, 2-bosish to‘xtatadi, " +
        "3-bosish keyingi bosqichga o‘tkazadi.";

    if (tournament.champion) {
        championPanel.classList.remove(
            "hidden"
        );

        championName.textContent =
            tournament.champion;

        tournamentStatus.textContent =
            "Yakunlandi";
    } else {
        championPanel.classList.add(
            "hidden"
        );

        championName.textContent =
            "G‘olib";

        tournamentStatus.textContent =
            "Davom etmoqda";
    }
}


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

        tournament.rounds.forEach(
            (round) => {
                round.matches.forEach(
                    (match) => {
                        match.stopwatch
                            .team1.running = false;

                        match.stopwatch
                            .team2.running = false;
                    }
                );
            }
        );

        setupSection.classList.add(
            "hidden"
        );

        tournamentSection.classList.remove(
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

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
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
        showMessage(error.message);
    } finally {
        drawButton.disabled = false;

        drawButton.textContent =
            "Qur’a tashlash";
    }
}


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
}


function clearEverything() {
    tournament = null;
    participantInput.value = "";

    localStorage.removeItem(
        STORAGE_KEY
    );

    updateParticipantCounter();

    tournamentSection.classList.add(
        "hidden"
    );

    setupSection.classList.remove(
        "hidden"
    );

    bracketElement.innerHTML = "";
}


async function toggleFullscreen() {
    if (!document.fullscreenElement) {
        await document
            .documentElement
            .requestFullscreen();

        fullscreenButton.textContent =
            "Ekrandan chiqish";
    } else {
        await document.exitFullscreen();

        fullscreenButton.textContent =
            "To‘liq ekran";
    }
}


participantInput.addEventListener(
    "input",
    updateParticipantCounter
);

exampleButton.addEventListener(
    "click",
    () => {
        participantInput.value =
            exampleParticipants.join("\n");

        updateParticipantCounter();
    }
);

drawButton.addEventListener(
    "click",
    startRandomDraw
);

newTournamentButton.addEventListener(
    "click",
    startNewTournament
);

restartButton.addEventListener(
    "click",
    startNewTournament
);

clearButton.addEventListener(
    "click",
    clearEverything
);

fullscreenButton.addEventListener(
    "click",
    toggleFullscreen
);

window.setInterval(
    runStopwatchTick,
    1000
);

updateParticipantCounter();
loadTournament();