"use strict";

const STORAGE_KEY = "football-bracket-tournament-v1";

const teamInput = document.querySelector("#teamInput");
const teamCount = document.querySelector("#teamCount");
const drawButton = document.querySelector("#drawButton");
const exampleButton = document.querySelector("#exampleButton");
const resetButton = document.querySelector("#resetButton");
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
const bracketTeamCount = document.querySelector("#bracketTeamCount");
const roundCount = document.querySelector("#roundCount");
const tournamentStatus = document.querySelector(
    "#tournamentStatus"
);
const tournamentDescription = document.querySelector(
    "#tournamentDescription"
);
const championPanel = document.querySelector("#championPanel");
const championName = document.querySelector("#championName");

const exampleTeams = [
    "Real Madrid",
    "Barcelona",
    "Manchester City",
    "Arsenal",
    "Bayern Munich",
    "PSG",
    "Inter Milan",
    "Liverpool",
];

let tournament = null;


function parseTeams(value) {
    const names = value
        .split(/[\n,;]+/)
        .map((team) => team.trim())
        .filter(Boolean);

    const uniqueTeams = [];
    const usedNames = new Set();

    names.forEach((name) => {
        const normalizedName = name.toLocaleLowerCase("uz-UZ");

        if (!usedNames.has(normalizedName)) {
            usedNames.add(normalizedName);
            uniqueTeams.push(name);
        }
    });

    return uniqueTeams;
}


function updateTeamCounter() {
    const teams = parseTeams(teamInput.value);
    teamCount.textContent = String(teams.length);

    if (teams.length > 32) {
        teamCount.parentElement.style.color = "#ff8793";
    } else {
        teamCount.parentElement.style.color = "";
    }
}


function showMessage(message, type = "error") {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;

    window.setTimeout(() => {
        messageBox.className = "message-box";
    }, 5000);
}


function getRoundName(roundIndex, totalRounds) {
    const participantsInRound =
        2 ** (totalRounds - roundIndex);

    if (participantsInRound === 2) {
        return "Final";
    }

    if (participantsInRound === 4) {
        return "Yarim final";
    }

    if (participantsInRound === 8) {
        return "1/4 final";
    }

    if (participantsInRound === 16) {
        return "1/8 final";
    }

    if (participantsInRound === 32) {
        return "1/16 final";
    }

    return `${roundIndex + 1}-bosqich`;
}

function createEmptyTournament(shuffledTeams, bracketSize) {
    const paddedTeams = [...shuffledTeams];

    while (paddedTeams.length < bracketSize) {
        paddedTeams.push(null);
    }

    /*
     * BYE jamoalarni bir-biriga to‘qnash kelmasligi uchun
     * mavjud jamoalar va bo‘sh joylar tarqatiladi.
     */
    const arrangedTeams = distributeByeTeams(
        shuffledTeams,
        bracketSize
    );

    const totalRounds = Math.log2(bracketSize);
    const rounds = [];

    const firstRoundMatches = [];

    for (let index = 0; index < bracketSize; index += 2) {
        firstRoundMatches.push({
            team1: arrangedTeams[index],
            team2: arrangedTeams[index + 1],
            winner: null,
        });
    }

    rounds.push(firstRoundMatches);

    for (
        let roundIndex = 1;
        roundIndex < totalRounds;
        roundIndex += 1
    ) {
        const matchCount = bracketSize / 2 ** (roundIndex + 1);
        const matches = [];

        for (let index = 0; index < matchCount; index += 1) {
            matches.push({
                team1: null,
                team2: null,
                winner: null,
            });
        }

        rounds.push(matches);
    }

    return {
        originalTeams: shuffledTeams,
        bracketSize,
        totalRounds,
        rounds,
        champion: null,
        createdAt: new Date().toISOString(),
    };
}


function distributeByeTeams(teams, bracketSize) {
    if (teams.length === bracketSize) {
        return [...teams];
    }

    const positions = new Array(bracketSize).fill(null);
    const byeCount = bracketSize - teams.length;
    let teamIndex = 0;

    /*
     * Avval BYE oladigan jamoalarni alohida juftliklarga
     * joylashtiramiz.
     */
    for (
        let matchIndex = 0;
        matchIndex < byeCount;
        matchIndex += 1
    ) {
        const position = matchIndex * 2;
        positions[position] = teams[teamIndex];
        teamIndex += 1;
    }

    /*
     * Qolgan jamoalarni bo‘sh joylarga joylashtiramiz.
     */
    for (
        let position = 0;
        position < bracketSize;
        position += 1
    ) {
        if (positions[position] === null && teamIndex < teams.length) {
            positions[position] = teams[teamIndex];
            teamIndex += 1;
        }
    }

    return positions;
}


function processAutomaticByes() {
    if (!tournament) {
        return;
    }

    let changed = true;

    while (changed) {
        changed = false;

        tournament.rounds.forEach((round, roundIndex) => {
            round.forEach((match, matchIndex) => {
                if (match.winner) {
                    return;
                }

                const hasTeam1 = Boolean(match.team1);
                const hasTeam2 = Boolean(match.team2);

                if (hasTeam1 !== hasTeam2) {
                    const automaticWinner =
                        match.team1 || match.team2;

                    match.winner = automaticWinner;

                    moveWinnerForward(
                        roundIndex,
                        matchIndex,
                        automaticWinner,
                        false
                    );

                    changed = true;
                }
            });
        });
    }
}


function moveWinnerForward(
    roundIndex,
    matchIndex,
    winner,
    shouldResetNext = true
) {
    const isFinalRound =
        roundIndex === tournament.rounds.length - 1;

    if (isFinalRound) {
        tournament.champion = winner;
        return;
    }

    const nextRoundIndex = roundIndex + 1;
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch =
        tournament.rounds[nextRoundIndex][nextMatchIndex];

    if (shouldResetNext && nextMatch.winner) {
        clearFollowingRounds(nextRoundIndex, nextMatchIndex);
    }

    if (matchIndex % 2 === 0) {
        nextMatch.team1 = winner;
    } else {
        nextMatch.team2 = winner;
    }
}


function clearFollowingRounds(roundIndex, matchIndex) {
    const currentMatch = tournament.rounds[roundIndex][matchIndex];
    const previousWinner = currentMatch.winner;

    currentMatch.winner = null;
    tournament.champion = null;

    if (
        roundIndex >= tournament.rounds.length - 1 ||
        !previousWinner
    ) {
        return;
    }

    const nextRoundIndex = roundIndex + 1;
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch =
        tournament.rounds[nextRoundIndex][nextMatchIndex];

    if (matchIndex % 2 === 0) {
        if (nextMatch.team1 === previousWinner) {
            nextMatch.team1 = null;
        }
    } else if (nextMatch.team2 === previousWinner) {
        nextMatch.team2 = null;
    }

    clearFollowingRounds(nextRoundIndex, nextMatchIndex);
}


function selectWinner(roundIndex, matchIndex, selectedTeam) {
    const match = tournament.rounds[roundIndex][matchIndex];

    if (!selectedTeam) {
        return;
    }

    if (
        selectedTeam !== match.team1 &&
        selectedTeam !== match.team2
    ) {
        return;
    }

    const previousWinner = match.winner;

    if (previousWinner === selectedTeam) {
        return;
    }

    if (previousWinner) {
        removePreviousWinnerFromNextRound(
            roundIndex,
            matchIndex,
            previousWinner
        );
    }

    match.winner = selectedTeam;

    moveWinnerForward(
        roundIndex,
        matchIndex,
        selectedTeam,
        true
    );

    processAutomaticByes();
    saveTournament();
    renderTournament();
}


function removePreviousWinnerFromNextRound(
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
        tournament.rounds[nextRoundIndex][nextMatchIndex];

    if (nextMatch.winner) {
        clearFollowingRounds(nextRoundIndex, nextMatchIndex);
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
}


function createTeamButton(
    team,
    opponent,
    winner,
    roundIndex,
    matchIndex,
    teamPosition
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

    const teamSeed = document.createElement("span");
    teamSeed.className = "team-seed";
    teamSeed.textContent = team
        ? String(teamPosition)
        : "—";

    const teamName = document.createElement("span");
    teamName.className = "team-name";
    teamName.textContent = team || "Kutilmoqda";

    button.append(teamSeed, teamName);

    if (winner === team && team) {
        const winnerCheck = document.createElement("span");
        winnerCheck.className = "winner-check";
        winnerCheck.textContent = "✓";
        button.append(winnerCheck);
    }

    const canSelect =
        Boolean(team) &&
        Boolean(opponent) &&
        !(
            roundIndex > 0 &&
            (!tournament.rounds[roundIndex][matchIndex].team1 ||
                !tournament.rounds[roundIndex][matchIndex].team2)
        );

    button.disabled = !canSelect;

    if (canSelect) {
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


function renderTournament() {
    if (!tournament) {
        return;
    }

    bracketElement.innerHTML = "";

    tournament.rounds.forEach((round, roundIndex) => {
        const roundElement = document.createElement("section");
        roundElement.className = "round";

        const titleElement = document.createElement("div");
        titleElement.className = "round-title";

        const roundLabel = document.createElement("span");
        roundLabel.textContent = `${roundIndex + 1}-bosqich`;

        const roundName = document.createElement("h3");
        roundName.textContent = getRoundName(
            roundIndex,
            tournament.totalRounds
        );

        titleElement.append(roundLabel, roundName);

        const matchesElement = document.createElement("div");
        matchesElement.className = "round-matches";

        round.forEach((match, matchIndex) => {
            const matchElement = document.createElement("article");
            matchElement.className = "match";

            const numberElement = document.createElement("span");
            numberElement.className = "match-number";
            numberElement.textContent =
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

            matchElement.append(
                numberElement,
                team1Button,
                team2Button
            );

            matchesElement.append(matchElement);
        });

        roundElement.append(titleElement, matchesElement);
        bracketElement.append(roundElement);
    });

    bracketTeamCount.textContent = String(
        tournament.originalTeams.length
    );

    roundCount.textContent = String(tournament.totalRounds);

    tournamentDescription.textContent =
        `${tournament.originalTeams.length} ta jamoa, ` +
        `${tournament.totalRounds} ta bosqich. ` +
        "G‘olib jamoani bosing.";

    if (tournament.champion) {
        championPanel.classList.remove("hidden");
        championName.textContent = tournament.champion;
        tournamentStatus.textContent = "Yakunlandi";
    } else {
        championPanel.classList.add("hidden");
        championName.textContent = "Chempion";
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
        const parsedTournament = JSON.parse(storedTournament);

        if (
            !parsedTournament ||
            !Array.isArray(parsedTournament.rounds)
        ) {
            throw new Error("Saqlangan turnir noto‘g‘ri.");
        }

        tournament = parsedTournament;

        setupSection.classList.add("hidden");
        tournamentSection.classList.remove("hidden");

        renderTournament();
    } catch (error) {
        console.error(error);
        localStorage.removeItem(STORAGE_KEY);
    }
}


async function startRandomDraw() {
    const teams = parseTeams(teamInput.value);

    if (teams.length < 2) {
        showMessage("Kamida 2 ta turli jamoa kiriting.");
        return;
    }

    if (teams.length > 32) {
        showMessage(
            "Eng ko‘pi bilan 32 ta jamoa kiritish mumkin."
        );
        return;
    }

    drawButton.disabled = true;
    drawButton.innerHTML = "<span>⏳</span> Qur’a tashlanmoqda...";

    try {
        const response = await fetch("/api/draw", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ teams }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Qur’a tashlashda xatolik yuz berdi."
            );
        }

        tournament = createEmptyTournament(
            data.teams,
            data.bracket_size
        );

        processAutomaticByes();
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

        showMessage(
            error.message ||
                "Server bilan bog‘lanishda xatolik yuz berdi."
        );
    } finally {
        drawButton.disabled = false;
        drawButton.innerHTML =
            "<span>⚡</span> Random Draw — Qur’a tashlash";
    }
}


function startNewTournament() {
    tournament = null;
    saveTournament();

    tournamentSection.classList.add("hidden");
    setupSection.classList.remove("hidden");
    championPanel.classList.add("hidden");
    bracketElement.innerHTML = "";

    window.scrollTo({
        top: setupSection.offsetTop - 95,
        behavior: "smooth",
    });
}


function resetEverything() {
    const hasData =
        Boolean(teamInput.value.trim()) ||
        Boolean(tournament);

    if (
        hasData &&
        !window.confirm(
            "Jamoalar va turnir natijalarini tozalaysizmi?"
        )
    ) {
        return;
    }

    tournament = null;
    teamInput.value = "";

    localStorage.removeItem(STORAGE_KEY);

    updateTeamCounter();

    tournamentSection.classList.add("hidden");
    setupSection.classList.remove("hidden");
    championPanel.classList.add("hidden");
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
            fullscreenButton.textContent = "✕ Ekrandan chiqish";
        } else {
            await document.exitFullscreen();
            fullscreenButton.textContent = "⛶ To‘liq ekran";
        }
    } catch (error) {
        console.error(error);
    }
}


teamInput.addEventListener("input", updateTeamCounter);

exampleButton.addEventListener("click", () => {
    teamInput.value = exampleTeams.join("\n");
    updateTeamCounter();
    teamInput.focus();
});

drawButton.addEventListener("click", startRandomDraw);
newTournamentButton.addEventListener("click", startNewTournament);
restartButton.addEventListener("click", startNewTournament);
resetButton.addEventListener("click", resetEverything);
fullscreenButton.addEventListener("click", toggleFullscreen);

document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
        fullscreenButton.textContent = "⛶ To‘liq ekran";
    }
});

updateTeamCounter();
loadTournament();