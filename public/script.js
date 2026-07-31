"use strict";

const STORAGE_KEY = "raqamli-avlod-tournament-v5";

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

const totalRoundCount = document.querySelector(
    "#totalRoundCount"
);

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


/* =========================
   ISHTIROKCHILARNI O‘QISH
========================= */

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
    const participants = parseParticipants(
        participantInput.value
    );

    participantCount.textContent = String(
        participants.length
    );
}


function showMessage(message) {
    messageBox.textContent = message;
    messageBox.className = "message-box error";

    window.setTimeout(() => {
        messageBox.className = "message-box";
    }, 5000);
}


/* =========================
   TAYMER
========================= */

function createTimer() {
    return {
        duration: 60,
        remaining: 60,
        running: false,
        finished: false,
    };
}


function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds);

    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0")
    );
}


function getTimerMatch(scope, roundIndex, matchIndex) {
    if (!tournament) {
        return null;
    }

    if (scope === "group") {
        return tournament.group.matches[matchIndex];
    }

    return tournament.rounds[roundIndex].matches[matchIndex];
}


function stopAllTimers() {
    if (!tournament) {
        return;
    }

    if (tournament.group) {
        tournament.group.matches.forEach((match) => {
            match.timer.running = false;
        });
    }

    tournament.rounds.forEach((round) => {
        round.matches.forEach((match) => {
            match.timer.running = false;
        });
    });
}


function startTimer(scope, roundIndex, matchIndex) {
    const match = getTimerMatch(
        scope,
        roundIndex,
        matchIndex
    );

    if (!match) {
        return;
    }

    stopAllTimers();

    if (match.timer.remaining <= 0) {
        match.timer.remaining = match.timer.duration;
        match.timer.finished = false;
    }

    match.timer.running = true;

    saveTournament();
    renderTournament();
}


function pauseTimer(scope, roundIndex, matchIndex) {
    const match = getTimerMatch(
        scope,
        roundIndex,
        matchIndex
    );

    if (!match) {
        return;
    }

    match.timer.running = false;

    saveTournament();
    renderTournament();
}


function resetTimer(scope, roundIndex, matchIndex) {
    const match = getTimerMatch(
        scope,
        roundIndex,
        matchIndex
    );

    if (!match) {
        return;
    }

    match.timer.running = false;
    match.timer.remaining = match.timer.duration;
    match.timer.finished = false;

    saveTournament();
    renderTournament();
}


function changeTimerDuration(
    scope,
    roundIndex,
    matchIndex,
    value
) {
    const match = getTimerMatch(
        scope,
        roundIndex,
        matchIndex
    );

    if (!match) {
        return;
    }

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

    let changed = false;

    const decreaseTimer = (match) => {
        if (!match.timer.running) {
            return;
        }

        changed = true;
        match.timer.remaining -= 1;

        if (match.timer.remaining <= 0) {
            match.timer.remaining = 0;
            match.timer.running = false;
            match.timer.finished = true;
        }
    };

    if (tournament.group) {
        tournament.group.matches.forEach(decreaseTimer);
    }

    tournament.rounds.forEach((round) => {
        round.matches.forEach(decreaseTimer);
    });

    if (changed) {
        saveTournament();
        updateTimerDisplays();
    }
}


function updateTimerDisplays() {
    document
        .querySelectorAll("[data-timer-display]")
        .forEach((element) => {
            const scope = element.dataset.scope;

            const roundIndex = Number(
                element.dataset.roundIndex
            );

            const matchIndex = Number(
                element.dataset.matchIndex
            );

            const match = getTimerMatch(
                scope,
                roundIndex,
                matchIndex
            );

            if (!match) {
                return;
            }

            element.textContent = formatTime(
                match.timer.remaining
            );

            element.classList.toggle(
                "finished",
                match.timer.finished
            );
        });
}


/* =========================
   MATCH YARATISH
========================= */

function createMatch(team1 = null, team2 = null) {
    return {
        team1,
        team2,
        winner: null,
        timer: createTimer(),
    };
}


function shuffleArray(items) {
    const shuffled = [...items];

    for (
        let index = shuffled.length - 1;
        index > 0;
        index -= 1
    ) {
        const randomIndex = Math.floor(
            Math.random() * (index + 1)
        );

        [
            shuffled[index],
            shuffled[randomIndex],
        ] = [
            shuffled[randomIndex],
            shuffled[index],
        ];
    }

    return shuffled;
}


function getNextPowerOfTwo(number) {
    let power = 2;

    while (power < number) {
        power *= 2;
    }

    return power;
}


/* =========================
   TURNIR YARATISH
========================= */

function createTournament(participants) {
    const shuffledParticipants = shuffleArray(participants);

    const result = {
        originalParticipants: participants,
        directParticipants: [],
        group: null,
        rounds: [],
        bracketSize: 0,
        champion: null,
    };

    /*
     * Toq son bo‘lsa, tasodifiy 3 ta jamoa
     * saralash guruhiga tushadi.
     */
    if (
        shuffledParticipants.length >= 3 &&
        shuffledParticipants.length % 2 !== 0
    ) {
        const groupTeams = shuffledParticipants.slice(0, 3);

        result.directParticipants =
            shuffledParticipants.slice(3);

        result.group = {
            teams: groupTeams,

            matches: [
                createMatch(groupTeams[0], groupTeams[1]),
                createMatch(groupTeams[0], groupTeams[2]),
                createMatch(groupTeams[1], groupTeams[2]),
            ],

            qualified: [],
            manualSelection: [],
            needsManualSelection: false,
            completed: false,
        };
    } else {
        result.directParticipants = shuffledParticipants;

        initializeMainBracket(
            result,
            shuffledParticipants
        );
    }

    return result;
}


/* =========================
   SARALASH GURUHI
========================= */

function selectGroupWinner(matchIndex, selectedTeam) {
    if (!tournament || !tournament.group) {
        return;
    }

    const match = tournament.group.matches[matchIndex];

    if (
        selectedTeam !== match.team1 &&
        selectedTeam !== match.team2
    ) {
        return;
    }

    if (match.winner === selectedTeam) {
        return;
    }

    /*
     * Guruh natijasi o‘zgarsa,
     * asosiy setka qayta yaratiladi.
     */
    match.winner = selectedTeam;

    tournament.group.qualified = [];
    tournament.group.manualSelection = [];
    tournament.group.needsManualSelection = false;
    tournament.group.completed = false;

    tournament.rounds = [];
    tournament.bracketSize = 0;
    tournament.champion = null;

    calculateGroupResult();

    saveTournament();
    renderTournament();
}


function calculateGroupResult() {
    const group = tournament.group;

    if (!group) {
        return;
    }

    const allMatchesFinished = group.matches.every(
        (match) => Boolean(match.winner)
    );

    if (!allMatchesFinished) {
        return;
    }

    const scores = {};

    group.teams.forEach((team) => {
        scores[team] = 0;
    });

    group.matches.forEach((match) => {
        if (match.winner) {
            scores[match.winner] += 1;
        }
    });

    const sortedTeams = [...group.teams].sort(
        (teamA, teamB) => {
            return scores[teamB] - scores[teamA];
        }
    );

    const secondScore = scores[sortedTeams[1]];
    const thirdScore = scores[sortedTeams[2]];

    /*
     * Ikkinchi va uchinchi o‘rin ochkolari
     * har xil bo‘lsa, top-2 avtomatik chiqadi.
     */
    if (secondScore > thirdScore) {
        finalizeGroupQualification([
            sortedTeams[0],
            sortedTeams[1],
        ]);

        return;
    }

    /*
     * Teng natija bo‘lsa,
     * foydalanuvchi 2 ta jamoani tanlaydi.
     */
    group.needsManualSelection = true;
    group.manualSelection = [];
}


function toggleManualQualifier(team) {
    const group = tournament.group;

    if (!group || !group.needsManualSelection) {
        return;
    }

    const selectedIndex =
        group.manualSelection.indexOf(team);

    if (selectedIndex >= 0) {
        group.manualSelection.splice(selectedIndex, 1);
    } else {
        if (group.manualSelection.length >= 2) {
            return;
        }

        group.manualSelection.push(team);
    }

    if (group.manualSelection.length === 2) {
        finalizeGroupQualification(
            group.manualSelection
        );
    }

    saveTournament();
    renderTournament();
}


function finalizeGroupQualification(qualifiedTeams) {
    const group = tournament.group;

    group.qualified = [...qualifiedTeams];
    group.manualSelection = [];
    group.needsManualSelection = false;
    group.completed = true;

    const mainParticipants = [
        ...tournament.directParticipants,
        ...group.qualified,
    ];

    initializeMainBracket(
        tournament,
        shuffleArray(mainParticipants)
    );
}


/* =========================
   ASOSIY SETKA
========================= */

function initializeMainBracket(
    tournamentData,
    participants
) {
    tournamentData.rounds = [];
    tournamentData.champion = null;

    const bracketSize = getNextPowerOfTwo(
        participants.length
    );

    tournamentData.bracketSize = bracketSize;

    const arrangedParticipants =
        arrangeParticipantsWithByes(
            participants,
            bracketSize
        );

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

    tournamentData.rounds.push({
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

        tournamentData.rounds.push({
            matches,
        });

        nextMatchCount /= 2;
    }

    processAutomaticByes();
}


function arrangeParticipantsWithByes(
    participants,
    bracketSize
) {
    const arranged = new Array(bracketSize).fill(null);

    const byeCount = bracketSize - participants.length;

    let participantIndex = 0;

    /*
     * Bo‘sh yo‘llanmalar turli uchrashuvlarga
     * tarqatiladi.
     */
    for (
        let matchIndex = 0;
        matchIndex < byeCount;
        matchIndex += 1
    ) {
        const position = matchIndex * 2;

        arranged[position] =
            participants[participantIndex];

        participantIndex += 1;
    }

    for (
        let position = 0;
        position < arranged.length;
        position += 1
    ) {
        if (
            arranged[position] === null &&
            participantIndex < participants.length
        ) {
            arranged[position] =
                participants[participantIndex];

            participantIndex += 1;
        }
    }

    return arranged;
}


function selectMainWinner(
    roundIndex,
    matchIndex,
    selectedTeam
) {
    const match =
        tournament.rounds[roundIndex].matches[matchIndex];

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
        clearNextRoundResults(
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
        roundIndex === tournament.rounds.length - 1;

    if (isFinal) {
        tournament.champion = winner;
        return;
    }

    const nextRoundIndex = roundIndex + 1;
    const nextMatchIndex = Math.floor(matchIndex / 2);

    const nextMatch =
        tournament.rounds[nextRoundIndex]
            .matches[nextMatchIndex];

    if (matchIndex % 2 === 0) {
        nextMatch.team1 = winner;
    } else {
        nextMatch.team2 = winner;
    }
}


function clearNextRoundResults(
    roundIndex,
    matchIndex,
    previousWinner
) {
    if (roundIndex >= tournament.rounds.length - 1) {
        tournament.champion = null;
        return;
    }

    const nextRoundIndex = roundIndex + 1;
    const nextMatchIndex = Math.floor(matchIndex / 2);

    const nextMatch =
        tournament.rounds[nextRoundIndex]
            .matches[nextMatchIndex];

    const nextPreviousWinner = nextMatch.winner;

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

    nextMatch.winner = null;
    tournament.champion = null;

    if (nextPreviousWinner) {
        clearNextRoundResults(
            nextRoundIndex,
            nextMatchIndex,
            nextPreviousWinner
        );
    }
}


function processAutomaticByes() {
    if (!tournament || tournament.rounds.length === 0) {
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

                        const hasTeam1 = Boolean(match.team1);
                        const hasTeam2 = Boolean(match.team2);

                        if (hasTeam1 === hasTeam2) {
                            return;
                        }

                        const automaticWinner =
                            match.team1 || match.team2;

                        match.winner = automaticWinner;

                        moveWinnerForward(
                            roundIndex,
                            matchIndex,
                            automaticWinner
                        );

                        changed = true;
                    }
                );
            }
        );
    }
}


/* =========================
   BOSQICH NOMLARI
========================= */

function getRoundName(roundIndex) {
    const round = tournament.rounds[roundIndex];
    const participantCountInRound =
        round.matches.length * 2;

    if (participantCountInRound === 2) {
        return "Final";
    }

    if (participantCountInRound === 4) {
        return "Yarim final";
    }

    if (participantCountInRound === 8) {
        return "1/4 final";
    }

    if (participantCountInRound === 16) {
        return "1/8 final";
    }

    if (participantCountInRound === 32) {
        return "1/16 final";
    }

    return `${participantCountInRound} jamoalik bosqich`;
}


/* =========================
   HTML ELEMENTLAR
========================= */

function createTeamButton(
    team,
    opponent,
    winner,
    onClick,
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
    name.textContent = team || "Bo‘sh yo‘llanma";

    button.append(seed, name);

    if (winner === team && team) {
        const check = document.createElement("span");
        check.className = "winner-check";
        check.textContent = "✓";

        button.append(check);
    }

    button.disabled = !team || !opponent;

    if (!button.disabled) {
        button.addEventListener("click", onClick);
    }

    return button;
}


function createTimerPanel(
    scope,
    roundIndex,
    matchIndex,
    match
) {
    const timerPanel = document.createElement("div");
    timerPanel.className = "match-timer";

    const display = document.createElement("div");
    display.className = "timer-display";

    display.dataset.timerDisplay = "true";
    display.dataset.scope = scope;
    display.dataset.roundIndex = String(roundIndex);
    display.dataset.matchIndex = String(matchIndex);

    display.textContent = formatTime(
        match.timer.remaining
    );

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
            scope,
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
        startTimer(
            scope,
            roundIndex,
            matchIndex
        );
    });

    const pauseButton = document.createElement("button");

    pauseButton.type = "button";
    pauseButton.className = "timer-button pause";
    pauseButton.textContent = "Pauza";

    pauseButton.addEventListener("click", () => {
        pauseTimer(
            scope,
            roundIndex,
            matchIndex
        );
    });

    const resetButton = document.createElement("button");

    resetButton.type = "button";
    resetButton.className = "timer-button reset";
    resetButton.textContent = "Qayta";

    resetButton.addEventListener("click", () => {
        resetTimer(
            scope,
            roundIndex,
            matchIndex
        );
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


/* =========================
   GURUHNI CHIZISH
========================= */

function renderGroupRound() {
    if (!tournament.group) {
        return;
    }

    const group = tournament.group;

    const roundElement = document.createElement("section");
    roundElement.className = "round group-round";

    const title = document.createElement("div");
    title.className = "round-title";

    const stageLabel = document.createElement("span");
    stageLabel.textContent = "Saralash";

    const stageName = document.createElement("h3");
    stageName.textContent = "3 jamoalik guruh";

    title.append(stageLabel, stageName);

    const matchesElement = document.createElement("div");
    matchesElement.className = "round-matches";

    group.matches.forEach((match, matchIndex) => {
        const matchElement = document.createElement("article");
        matchElement.className = "match";

        const matchNumber = document.createElement("span");
        matchNumber.className = "match-number";

        matchNumber.textContent =
            `Guruh uchrashuvi ${matchIndex + 1}`;

        const team1Button = createTeamButton(
            match.team1,
            match.team2,
            match.winner,
            () => {
                selectGroupWinner(
                    matchIndex,
                    match.team1
                );
            },
            1
        );

        const team2Button = createTeamButton(
            match.team2,
            match.team1,
            match.winner,
            () => {
                selectGroupWinner(
                    matchIndex,
                    match.team2
                );
            },
            2
        );

        const timerPanel = createTimerPanel(
            "group",
            -1,
            matchIndex,
            match
        );

        matchElement.append(
            matchNumber,
            team1Button,
            team2Button,
            timerPanel
        );

        matchesElement.append(matchElement);
    });

    if (group.needsManualSelection) {
        const selector = document.createElement("div");
        selector.className = "qualification-selector";

        const selectorTitle = document.createElement("p");

        selectorTitle.textContent =
            "Natijalar teng. Asosiy setkaga chiqadigan 2 ta jamoani tanlang:";

        selector.append(selectorTitle);

        group.teams.forEach((team) => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "qualifier-button";
            button.textContent = team;

            if (group.manualSelection.includes(team)) {
                button.classList.add("selected");
            }

            button.addEventListener("click", () => {
                toggleManualQualifier(team);
            });

            selector.append(button);
        });

        matchesElement.append(selector);
    }

    if (group.completed) {
        const qualifiedBox = document.createElement("div");
        qualifiedBox.className = "qualified-box";

        qualifiedBox.innerHTML = `
            <strong>Asosiy setkaga chiqdi:</strong>
            <span>${group.qualified.join(" va ")}</span>
        `;

        matchesElement.append(qualifiedBox);
    }

    roundElement.append(title, matchesElement);
    bracketElement.append(roundElement);
}


/* =========================
   ASOSIY SETKANI CHIZISH
========================= */

function renderMainRounds() {
    tournament.rounds.forEach((round, roundIndex) => {
        const roundElement = document.createElement("section");
        roundElement.className = "round";

        const title = document.createElement("div");
        title.className = "round-title";

        const stageLabel = document.createElement("span");
        stageLabel.textContent =
            `${roundIndex + 1}-asosiy bosqich`;

        const stageName = document.createElement("h3");
        stageName.textContent = getRoundName(roundIndex);

        title.append(stageLabel, stageName);

        const matchesElement = document.createElement("div");
        matchesElement.className = "round-matches";

        round.matches.forEach((match, matchIndex) => {
            const matchElement = document.createElement("article");
            matchElement.className = "match";

            const matchNumber = document.createElement("span");
            matchNumber.className = "match-number";

            matchNumber.textContent =
                `Uchrashuv ${matchIndex + 1}`;

            const team1Button = createTeamButton(
                match.team1,
                match.team2,
                match.winner,
                () => {
                    selectMainWinner(
                        roundIndex,
                        matchIndex,
                        match.team1
                    );
                },
                matchIndex * 2 + 1
            );

            const team2Button = createTeamButton(
                match.team2,
                match.team1,
                match.winner,
                () => {
                    selectMainWinner(
                        roundIndex,
                        matchIndex,
                        match.team2
                    );
                },
                matchIndex * 2 + 2
            );

            const timerPanel = createTimerPanel(
                "main",
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

            matchesElement.append(matchElement);
        });

        roundElement.append(title, matchesElement);
        bracketElement.append(roundElement);
    });
}


/* =========================
   TURNIRNI CHIZISH
========================= */

function renderTournament() {
    if (!tournament) {
        return;
    }

    bracketElement.innerHTML = "";

    renderGroupRound();
    renderMainRounds();

    totalParticipantCount.textContent = String(
        tournament.originalParticipants.length
    );

    const totalStages =
        tournament.rounds.length +
        (tournament.group ? 1 : 0);

    totalRoundCount.textContent = String(totalStages);

    if (tournament.group && !tournament.group.completed) {
        tournamentDescription.textContent =
            "3 ta jamoa saralash guruhida o‘ynaydi. " +
            "Guruhdan 2 ta jamoa asosiy setkaga chiqadi.";
    } else if (tournament.group) {
        tournamentDescription.textContent =
            "Saralash yakunlandi. Asosiy turnir setkasi davom etmoqda.";
    } else {
        tournamentDescription.textContent =
            "Jamoalar soni juft. Musobaqa asosiy setkadan boshlandi.";
    }

    if (tournament.champion) {
        championPanel.classList.remove("hidden");
        championName.textContent = tournament.champion;
        tournamentStatus.textContent = "Yakunlandi";
    } else {
        championPanel.classList.add("hidden");
        championName.textContent = "G‘olib";

        if (
            tournament.group &&
            !tournament.group.completed
        ) {
            tournamentStatus.textContent =
                "Saralash davom etmoqda";
        } else {
            tournamentStatus.textContent =
                "Davom etmoqda";
        }
    }
}


/* =========================
   SAQLASH
========================= */

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
    const savedTournament =
        localStorage.getItem(STORAGE_KEY);

    if (!savedTournament) {
        return;
    }

    try {
        tournament = JSON.parse(savedTournament);

        stopAllTimers();

        setupSection.classList.add("hidden");
        tournamentSection.classList.remove("hidden");

        renderTournament();
    } catch (error) {
        console.error(error);

        localStorage.removeItem(STORAGE_KEY);
        tournament = null;
    }
}


/* =========================
   QUR’A
========================= */

async function startRandomDraw() {
    const participants = parseParticipants(
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
                data.message ||
                "Qur’a tashlashda xatolik yuz berdi."
            );
        }

        tournament = createTournament(
            data.participants
        );

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


/* =========================
   TOZALASH
========================= */

function startNewTournament() {
    tournament = null;

    localStorage.removeItem(STORAGE_KEY);

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
            "Barcha jamoalar va natijalar o‘chirilsinmi?"
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


/* =========================
   TO‘LIQ EKRAN
========================= */

async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();

            fullscreenButton.textContent =
                "Ekrandan chiqish";
        } else {
            await document.exitFullscreen();

            fullscreenButton.textContent =
                "To‘liq ekran";
        }
    } catch (error) {
        console.error(error);
    }
}


/* =========================
   EVENTLAR
========================= */

participantInput.addEventListener(
    "input",
    updateParticipantCounter
);

exampleButton.addEventListener("click", () => {
    participantInput.value =
        exampleParticipants.join("\n");

    updateParticipantCounter();
});

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

document.addEventListener(
    "fullscreenchange",
    () => {
        if (!document.fullscreenElement) {
            fullscreenButton.textContent =
                "To‘liq ekran";
        }
    }
);

window.setInterval(runTimerTick, 1000);

updateParticipantCounter();
loadTournament();