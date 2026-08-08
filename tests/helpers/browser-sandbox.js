"use strict";

/*
 * "public/script.js" — oddiy brauzer skripti: modul emas,
 * hech narsani eksport qilmaydi va yuklanishi bilanoq
 * DOM ga murojaat qiladi.
 *
 * Uni Node ichida sinash uchun shu yerda minimal DOM va
 * localStorage taqlidi yaratiladi, so'ng fayl oxiriga
 * ichki funksiyalarni tashqariga chiqaruvchi qator ulanadi.
 *
 * Shu tufayli test uchun asosiy kodni o'zgartirish
 * yoki qo'shimcha kutubxona o'rnatish shart emas.
 */

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");


const SCRIPT_PATH = path.join(
    __dirname,
    "..",
    "..",
    "public",
    "script.js"
);


const EXPOSED_NAMES = [
    "STORAGE_KEY",
    "MINIMUM_PARTICIPANTS",
    "MAXIMUM_PARTICIPANTS",

    "createTimer",
    "getElapsedSeconds",
    "startTimer",
    "stopTimer",
    "formatTime",

    "getNextPowerOfTwo",
    "createTournament",
    "getMatch",

    "handleTeamClick",
    "revertMatchWinner",

    "startMatchTimers",
    "stopParticipantTimer",
    "resetMatchTimers",

    "saveTournament",
    "loadTournament",
    "normalizeLoadedTournament",
];


function createElementStub() {
    return {
        classList: {
            add() {},
            remove() {},
            toggle() {},
        },
        dataset: {},
        style: {},
        append() {},
        addEventListener() {},
    };
}


/*
 * Har bir test uchun toza muhit qaytaradi.
 */
function createSandbox() {
    const storage = new Map();

    const sandbox = {
        console,

        localStorage: {
            getItem: (key) =>
                storage.has(key) ? storage.get(key) : null,
            setItem: (key, value) =>
                storage.set(key, String(value)),
            removeItem: (key) => storage.delete(key),
            clear: () => storage.clear(),
        },

        document: {
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener() {},
            createElement: createElementStub,
        },

        window: {
            setInterval: () => 0,
            setTimeout: () => 0,
            scrollTo() {},
        },

        /*
         * "showMessage" xabar maydoni topilmasa
         * alert() ga murojaat qiladi.
         */
        alert: () => {},

        fetch: () =>
            Promise.reject(
                new Error("tarmoq testda ishlatilmaydi")
            ),
    };

    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);

    const source = fs.readFileSync(SCRIPT_PATH, "utf8");

    const epilogue = `
globalThis.__api = {
    ${EXPOSED_NAMES.join(",\n    ")},
    getTournament: () => tournament,
    setTournament: (value) => { tournament = value; },
};
`;

    vm.runInContext(source + epilogue, sandbox);

    return {
        api: sandbox.__api,
        storage,
    };
}


/*
 * Sinov uchun oddiy nomlar: "Jamoa 1", "Jamoa 2", ...
 */
function makeNames(count) {
    return Array.from(
        { length: count },
        (_, index) => `Jamoa ${index + 1}`
    );
}


module.exports = {
    createSandbox,
    makeNames,
};
