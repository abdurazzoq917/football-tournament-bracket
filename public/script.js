"use strict";

const STORAGE_KEY = "raqamli-avlod-stopwatch-bracket-v7";

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


/* =====================================
   ISHTIROKCHILARNI O‘QISH
===================================== */

function parseParticipants(value) {
    const names = value
        .split(/[\n,;]+/)
        .map((name) => name.trim())
        .filter(Boolean);

    const uniqueParticipants = [];
    const usedNames = new Set();

    names.forEach((name) => {
        const normalizedName =
            name.toLocaleLowerCase("uz-UZ");

        if (!usedNames.has(normalizedName)) {
            usedNames.add(normalizedName);
            uniqueParticipants.push(name);
        }
    });

    return uniqueParticipants;
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


/* =====================================
   YORDAMCHI FUNKSIYALAR
===================================== */

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


/* =====================================
   UCHRASHUV YARATISH
===================================== */

function createStopwatch() {
    return {
        running: false,
        activeSlot: null,
        elapsed1: 0,
        elapsed2: 0,
    };
}


function createMatch(team1 = null, team2 = null) {
    return {
        team1,
        team2,
        winner: null,
        stopwatch: createStopwatch(),
    };
}


/* =====================================
   TURNIR YARATISH
===================================== */

function createTournament(participants) {
    const shuffled =
        shuffleArray(participants);

    const tournamentData = {
        originalParticipants: participants,
        directParticipants: [],
        group: null,
        rounds: [],
        bracketSize: 0,
        champion: null,
    };

    /*
     * Toq son bo‘lsa, 3 ta jamoa
     * saralash guruhiga tushadi.
     */
    if (
        shuffled.length >= 3 &&
        shuffled.length % 2 !== 0
    ) {
        const groupTeams =
            shuffled.slice(0, 3);

        tournamentData.directParticipants =
            shuffled.slice(3);

        tournamentData.group = {
            teams: groupTeams,

            matches: [
                createMatch(
                    groupTeams[0],
                    groupTeams[1]
                ),

                createMatch(
                    groupTeams[0],
                    groupTeams[2]
                ),

                createMatch(
                    groupTeams[1],
                    groupTeams[2]
                ),
            ],

            qualified: [],
            manualSelection: [],
            needsManualSelection: false,
            completed: false,
        };
    } else {
        tournamentData.directParticipants =
            shuffled;

        initializeMainBracket(
            tournamentData,
            shuffled
        );
    }

    return tournamentData;
}


/* =====================================
   ASOSIY SETKA YARATISH
===================================== */

function initializeMainBracket(
    tournamentData,
    participants
) {
    tournamentData.rounds = [];
    tournamentData.champion = null;

    const bracketSize =
        getNextPowerOfTwo(participants.length);

    tournamentData.bracketSize =
        bracketSize;

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
    const arranged =
        new Array(bracketSize).fill(null);

    const byeCount =
        bracketSize - participants.length;

    let participantIndex = 0;

    /*
     * Bo‘sh yo‘llanmalar alohida
     * uchrashuvlarga tarqatiladi.
     */
    for (
        let matchIndex = 0;
        matchIndex < byeCount;
        matchIndex += 1
    ) {
        const position =
            matchIndex * 2;

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


/* =====================================
   UCHRASHUVNI TOPISH
===================================== */

function getMatch(
    scope,
    roundIndex,
    matchIndex
) {
    if (!tournament) {
        return null;
    }

    if (scope === "group") {
        if (!tournament.group) {
            return null;
        }

        return tournament.group.matches[matchIndex];
    }

    if (!tournament.rounds[roundIndex]) {
        return null;
    }

    return tournament
        .rounds[roundIndex]
        .matches[matchIndex];
}


/* =====================================
   BARCHA TAYMERLARNI TO‘XTATISH
===================================== */

function stopAllStopwatches(
    exceptScope = null,
    exceptRoundIndex = null,
    exceptMatchIndex = null
) {
    if (!tournament) {
        return;
    }

    if (tournament.group) {
        tournament.group.matches.forEach(
            (match, matchIndex) => {
                const isExcept =
                    exceptScope === "group" &&
                    exceptMatchIndex === matchIndex;

                if (!isExcept) {
                    match.stopwatch.running = false;
                    match.stopwatch.activeSlot = null;
                }
            }
        );
    }

    tournament.rounds.forEach(
        (round, roundIndex) => {
            round.matches.forEach(
                (match, matchIndex) => {
                    const isExcept =
                        exceptScope === "main" &&
                        exceptRoundIndex === roundIndex &&
                        exceptMatchIndex === matchIndex;

                    if (!isExcept) {
                        match.stopwatch.running = false;
                        match.stopwatch.activeSlot = null;
                    }
                }
            );
        }
    );
}


/* =====================================
   O‘QUVCHINI BOSISH
===================================== */

function handleParticipantClick(
    scope,
    roundIndex,
    matchIndex,
    slot
) {
    const match = getMatch(
        scope,
        roundIndex,
        matchIndex
    );

    if (!match) {
        return;
    }

    if (match.winner) {
        return;
    }

    if (!match.team1 || !match.team2) {
        return;
    }

    const selectedTeam =
        slot === 1
            ? match.team1
            : match.team2;

    if (!selectedTeam) {
        return;
    }

    /*
     * Taymer hali ishlamayotgan bo‘lsa,
     * o‘quvchini bosish taymerni boshlaydi.
     */
    if (!match.stopwatch.running) {
        stopAllStopwatches(
            scope,
            roundIndex,
            matchIndex
        );

        match.stopwatch.running = true;
        match.stopwatch.activeSlot = slot;

        saveTournament();
        renderTournament();

        return;
    }

    /*
     * Boshqa o‘quvchi taymeri ishlayotgan bo‘lsa,
     * avval o‘sha taymer to‘xtatilishi kerak.
     */
    if (match.stopwatch.activeSlot !== slot) {
        showMessage(
            "Avval ishlayotgan o‘quvchini yana bosib taymerni to‘xtating."
        );

        return;
    }

    /*
     * Bir xil o‘quvchi yana bosilganda:
     * taymer to‘xtaydi va u g‘olib bo‘ladi.
     */
    match.stopwatch.running = false;
    match.stopwatch.activeSlot = null;
    match.winner = selectedTeam;

    if (scope === "group") {
        calculateGroupResult();
    } else {
        moveWinnerForward(
            roundIndex,
            matchIndex,
            selectedTeam
        );

        processAutomaticByes();
    }

    saveTournament();
    renderTournament();
}


/* =====================================
   TAYMERNI QAYTA BOSHLASH
===================================== */

function resetMatchStopwatch(
    scope,
    roundIndex,
    matchIndex
) {
    const match = getMatch(
        scope,
        roundIndex,
        matchIndex
    );

    if (!match || match.winner) {
        return;
    }

    match.stopwatch = createStopwatch();

    saveTournament();
    renderTournament();
}


/* =====================================
   TAYMER TICK
===================================== */

function runStopwatchTick() {
    if (!tournament) {
        return;
    }

    let changed = false;

    const increaseStopwatch = (match) => {
        if (!match.stopwatch.running) {
            return;
        }

        changed = true;

        if (match.stopwatch.activeSlot === 1) {
            match.stopwatch.elapsed1 += 1;
        }

        if (match.stopwatch.activeSlot === 2) {
            match.stopwatch.elapsed2 += 1;
        }
    };

    if (tournament.group) {
        tournament.group.matches.forEach(
            increaseStopwatch
        );
    }

    tournament.rounds.forEach((round) => {
        round.matches.forEach(
            increaseStopwatch
        );
    });

    if (changed) {
        saveTournament();
        updateStopwatchDisplays();
    }
}


function updateStopwatchDisplays() {
    document
        .querySelectorAll("[data-stopwatch-display]")
        .forEach((element) => {
            const scope =
                element.dataset.scope;

            const roundIndex =
                Number(element.dataset.roundIndex);

            const matchIndex =
                Number(element.dataset.matchIndex);

            const slot =
                Number(element.dataset.slot);

            const match = getMatch(
                scope,
                roundIndex,
                matchIndex
            );

            if (!match) {
                return;
            }

            const elapsed =
                slot === 1
                    ? match.stopwatch.elapsed1
                    : match.stopwatch.elapsed2;

            element.textContent =
                formatTime(elapsed);

            const isActive =
                match.stopwatch.running &&
                match.stopwatch.activeSlot === slot;

            element.classList.toggle(
                "active",
                isActive
            );
        });
}


/* =====================================
   GURUH NATIJASI
===================================== */

function calculateGroupResult() {
    const group = tournament.group;

    if (!group) {
        return;
    }

    const allMatchesFinished =
        group.matches.every(
            (match) => Boolean(match.winner)
        );

    if (!allMatchesFinished) {
        return;
    }

    const wins = {};

    group.teams.forEach((team) => {
        wins[team] = 0;
    });

    group.matches.forEach((match) => {
        if (match.winner) {
            wins[match.winner] += 1;
        }
    });

    const sortedTeams =
        [...group.teams].sort(
            (teamA, teamB) => {
                return wins[teamB] - wins[teamA];
            }
        );

    const secondScore =
        wins[sortedTeams[1]];

    const thirdScore =
        wins[sortedTeams[2]];

    if (secondScore > thirdScore) {
        finalizeGroupQualification([
            sortedTeams[0],
            sortedTeams[1],
        ]);

        return;
    }

    group.needsManualSelection = true;
    group.manualSelection = [];
}


function toggleManualQualifier(team) {
    const group = tournament.group;

    if (
        !group ||
        !group.needsManualSelection
    ) {
        return;
    }

    const selectedIndex =
        group.manualSelection.indexOf(team);

    if (selectedIndex >= 0) {
        group.manualSelection.splice(
            selectedIndex,
            1
        );
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


function finalizeGroupQualification(
    qualifiedTeams
) {
    const group = tournament.group;

    group.qualified =
        [...qualifiedTeams];

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


/* =====================================
   G‘OLIBNI KEYINGI BOSQICHGA O‘TKAZISH
===================================== */

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


/* =====================================
   BO‘SH YO‘LLANMALARNI AVTOMATIK O‘TKAZISH
===================================== */

function processAutomaticByes() {
    if (
        !tournament ||
        tournament.rounds.length === 0
    ) {
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

                        const automaticWinner =
                            match.team1 || match.team2;

                        match.winner =
                            automaticWinner;

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


/* =====================================
   BOSQICH NOMLARI
===================================== */

function getRoundName(roundIndex) {
    const round =
        tournament.rounds[roundIndex];

    const teamsInRound =
        round.matches.length * 2;

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

    return `${teamsInRound} jamoalik bosqich`;
}


/* =====================================
   JAMOA TUGMASI
===================================== */

function createParticipantButton({
    team,
    opponent,
    winner,
    scope,
    roundIndex,
    matchIndex,
    slot,
}) {
    const match = getMatch(
        scope,
        roundIndex,
        matchIndex
    );

    const button =
        document.createElement("button");

    button.type = "button";
    button.className = "team-button";

    if (!team) {
        button.classList.add("empty-team");
    }

    if (
        match &&
        match.stopwatch.running &&
        match.stopwatch.activeSlot === slot
    ) {
        button.classList.add("timer-running");
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

    const timer =
        document.createElement("span");

    timer.className =
        "participant-stopwatch";

    timer.dataset.stopwatchDisplay = "true";
    timer.dataset.scope = scope;
    timer.dataset.roundIndex =
        String(roundIndex);

    timer.dataset.matchIndex =
        String(matchIndex);

    timer.dataset.slot =
        String(slot);

    const elapsed =
        match
            ? (
                slot === 1
                    ? match.stopwatch.elapsed1
                    : match.stopwatch.elapsed2
            )
            : 0;

    timer.textContent =
        formatTime(elapsed);

    if (
        match &&
        match.stopwatch.running &&
        match.stopwatch.activeSlot === slot
    ) {
        timer.classList.add("active");
    }

    information.append(
        name,
        timer
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
                handleParticipantClick(
                    scope,
                    roundIndex,
                    matchIndex,
                    slot
                );
            }
        );
    }

    return button;
}


/* =====================================
   RESET TUGMASI
===================================== */

function createResetButton(
    scope,
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
        "Taymerni qayta boshlash";

    button.disabled =
        Boolean(match.winner) ||
        (
            match.stopwatch.elapsed1 === 0 &&
            match.stopwatch.elapsed2 === 0
        );

    button.addEventListener(
        "click",
        () => {
            resetMatchStopwatch(
                scope,
                roundIndex,
                matchIndex
            );
        }
    );

    return button;
}


/* =====================================
   GURUH BOSQICHINI CHIZISH
===================================== */

function renderGroupRound() {
    if (!tournament.group) {
        return;
    }

    const group = tournament.group;

    const roundElement =
        document.createElement("section");

    roundElement.className =
        "round group-round";

    const title =
        document.createElement("div");

    title.className = "round-title";

    const label =
        document.createElement("span");

    label.textContent =
        "Saralash bosqichi";

    const heading =
        document.createElement("h3");

    heading.textContent =
        "3 jamoalik guruh";

    title.append(label, heading);

    const matchesElement =
        document.createElement("div");

    matchesElement.className =
        "round-matches";

    group.matches.forEach(
        (match, matchIndex) => {
            const matchElement =
                document.createElement("article");

            matchElement.className = "match";

            const matchNumber =
                document.createElement("span");

            matchNumber.className =
                "match-number";

            matchNumber.textContent =
                `Guruh uchrashuvi ${matchIndex + 1}`;

            const team1Button =
                createParticipantButton({
                    team: match.team1,
                    opponent: match.team2,
                    winner: match.winner,
                    scope: "group",
                    roundIndex: -1,
                    matchIndex,
                    slot: 1,
                });

            const team2Button =
                createParticipantButton({
                    team: match.team2,
                    opponent: match.team1,
                    winner: match.winner,
                    scope: "group",
                    roundIndex: -1,
                    matchIndex,
                    slot: 2,
                });

            const resetButton =
                createResetButton(
                    "group",
                    -1,
                    matchIndex,
                    match
                );

            matchElement.append(
                matchNumber,
                team1Button,
                team2Button,
                resetButton
            );

            matchesElement.append(
                matchElement
            );
        }
    );

    if (group.needsManualSelection) {
        const selector =
            document.createElement("div");

        selector.className =
            "qualification-selector";

        const selectorTitle =
            document.createElement("p");

        selectorTitle.textContent =
            "Natija teng. Asosiy setkaga chiqadigan 2 ta jamoani tanlang:";

        selector.append(selectorTitle);

        group.teams.forEach((team) => {
            const button =
                document.createElement("button");

            button.type = "button";
            button.className =
                "qualifier-button";

            button.textContent = team;

            if (
                group.manualSelection.includes(team)
            ) {
                button.classList.add("selected");
            }

            button.addEventListener(
                "click",
                () => {
                    toggleManualQualifier(team);
                }
            );

            selector.append(button);
        });

        matchesElement.append(selector);
    }

    if (group.completed) {
        const qualifiedBox =
            document.createElement("div");

        qualifiedBox.className =
            "qualified-box";

        const titleElement =
            document.createElement("strong");

        titleElement.textContent =
            "Asosiy setkaga chiqdi:";

        const teamsElement =
            document.createElement("span");

        teamsElement.textContent =
            group.qualified.join(" va ");

        qualifiedBox.append(
            titleElement,
            teamsElement
        );

        matchesElement.append(
            qualifiedBox
        );
    }

    roundElement.append(
        title,
        matchesElement
    );

    bracketElement.append(
        roundElement
    );
}


/* =====================================
   ASOSIY SETKANI CHIZISH
===================================== */

function renderMainRounds() {
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

            title.append(
                label,
                heading
            );

            const matchesElement =
                document.createElement("div");

            matchesElement.className =
                "round-matches";

            round.matches.forEach(
                (match, matchIndex) => {
                    const matchElement =
                        document.createElement("article");

                    matchElement.className =
                        "match";

                    const matchNumber =
                        document.createElement("span");

                    matchNumber.className =
                        "match-number";

                    matchNumber.textContent =
                        `Uchrashuv ${matchIndex + 1}`;

                    const team1Button =
                        createParticipantButton({
                            team: match.team1,
                            opponent: match.team2,
                            winner: match.winner,
                            scope: "main",
                            roundIndex,
                            matchIndex,
                            slot: 1,
                        });

                    const team2Button =
                        createParticipantButton({
                            team: match.team2,
                            opponent: match.team1,
                            winner: match.winner,
                            scope: "main",
                            roundIndex,
                            matchIndex,
                            slot: 2,
                        });

                    const resetButton =
                        createResetButton(
                            "main",
                            roundIndex,
                            matchIndex,
                            match
                        );

                    matchElement.append(
                        matchNumber,
                        team1Button,
                        team2Button,
                        resetButton
                    );

                    matchesElement.append(
                        matchElement
                    );
                }
            );

            roundElement.append(
                title,
                matchesElement
            );

            bracketElement.append(
                roundElement
            );
        }
    );
}


/* =====================================
   TURNIRNI CHIZISH
===================================== */

function renderTournament() {
    if (!tournament) {
        return;
    }

    bracketElement.innerHTML = "";

    renderGroupRound();
    renderMainRounds();

    totalParticipantCount.textContent =
        String(
            tournament
                .originalParticipants
                .length
        );

    const totalStages =
        tournament.rounds.length +
        (tournament.group ? 1 : 0);

    totalRoundCount.textContent =
        String(totalStages);

    if (
        tournament.group &&
        !tournament.group.completed
    ) {
        tournamentDescription.textContent =
            "O‘quvchi nomini bir marta bossangiz taymer boshlanadi. " +
            "Yana bossangiz to‘xtaydi va o‘sha o‘quvchi g‘olib bo‘ladi.";
    } else {
        tournamentDescription.textContent =
            "O‘quvchini birinchi bosishda taymer boshlanadi. " +
            "Ikkinchi bosishda to‘xtaydi va keyingi bosqichga o‘tadi.";
    }

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


/* =====================================
   SAQLASH
===================================== */

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
    const savedTournament =
        localStorage.getItem(STORAGE_KEY);

    if (!savedTournament) {
        return;
    }

    try {
        tournament =
            JSON.parse(savedTournament);

        stopAllStopwatches();

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


/* =====================================
   QUR’A TASHLASH
===================================== */

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
            "Eng ko‘pi bilan 32 ta ishtirokchi kiritish mumkin."
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

        tournament =
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


/* =====================================
   YANGI TURNIR VA TOZALASH
===================================== */

function startNewTournament() {
    stopAllStopwatches();

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

    stopAllStopwatches();

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

    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });
}


/* =====================================
   TO‘LIQ EKRAN
===================================== */

async function toggleFullscreen() {
    try {
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
    } catch (error) {
        console.error(error);
    }
}


/* =====================================
   EVENTLAR
===================================== */

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

document.addEventListener(
    "fullscreenchange",
    () => {
        if (!document.fullscreenElement) {
            fullscreenButton.textContent =
                "To‘liq ekran";
        }
    }
);

window.setInterval(
    runStopwatchTick,
    1000
);

updateParticipantCounter();
loadTournament();