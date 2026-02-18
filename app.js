const fileSelect = document.getElementById("fileSelect");
const durationSelect = document.getElementById("durationSelect");
const restartBtn = document.getElementById("restartBtn");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const textDisplay = document.getElementById("textDisplay");
const typingInput = document.getElementById("typingInput");
const wpmValue = document.getElementById("wpmValue");
const accuracyValue = document.getElementById("accuracyValue");
const timeValue = document.getElementById("timeValue");
const progressValue = document.getElementById("progressValue");
const sourceInfo = document.getElementById("sourceInfo");
const statusText = document.getElementById("statusText");
const typingPanel = document.querySelector(".typing-panel");
const dropZone = document.getElementById("dropZone");

// Static samples embedded in memory
const SAMPLES = [
    {
        id: "samples/javascript_sample.js",
        name: "javascript_sample.js",
        language: "js",
        content: `const items = [
  { id: 1, name: "keyboard", price: 219.9, tags: ["hardware", "typing"] },
  { id: 2, name: "monitor", price: 999.0, tags: ["hardware", "display"] },
  { id: 3, name: "chair", price: 540.0, tags: ["furniture"] }
];

function groupByTag(records) {
  return records.reduce((acc, item) => {
    for (const tag of item.tags) {
      if (!acc[tag]) {
        acc[tag] = [];
      }
      acc[tag].push(item.name);
    }
    return acc;
  }, {});
}

console.log(groupByTag(items));`
    },
    {
        id: "samples/python_sample.py",
        name: "python_sample.py",
        language: "py",
        content: `from dataclasses import dataclass
from typing import Iterable


@dataclass
class Commit:
    hash: str
    author: str
    files_changed: int


def summarize(commits: Iterable[Commit]) -> dict[str, int]:
    result: dict[str, int] = {}
    for commit in commits:
        result.setdefault(commit.author, 0)
        result[commit.author] += commit.files_changed
    return result


if __name__ == "__main__":
    fake_commits = [
        Commit("a12bc", "ana", 3),
        Commit("ff010", "davi", 8),
        Commit("b194f", "ana", 5),
    ]
    print(summarize(fake_commits))`
    },
    {
        id: "samples/quickstart.txt",
        name: "quickstart.txt",
        language: "txt",
        content: `Welcome to TypeCodeBlock.

Train your typing with common texts and source code.
The goal is to maintain a constant pace with minimum errors.

Tips:
1. Prioritize accuracy before speed.
2. Maintain posture and breathe regularly.
3. Use restart to repeat the same block.`
    }
];

const state = {
    files: [...SAMPLES],
    activeFile: null,
    targetText: "",
    typedText: "",
    previousTypedText: "",
    charSpans: [],
    timerSeconds: Number(durationSelect.value),
    startedAtMs: null,
    pauseStartedAtMs: null,
    intervalId: null,
    finished: false
};

function normalizeText(value) {
    return value.replace(/\r\n/g, "\n");
}

function setStatus(message) {
    statusText.textContent = message;
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function buildFileOptions(selectedId) {
    fileSelect.innerHTML = "";
    for (const file of state.files) {
        const option = document.createElement("option");
        option.value = file.id;
        option.textContent = `${file.name} (${file.language})`;
        if (file.id === selectedId) {
            option.selected = true;
        }
        fileSelect.appendChild(option);
    }
}

function getFileById(id) {
    return state.files.find((file) => file.id === id) || null;
}

function clearTimer() {
    if (state.intervalId) {
        clearInterval(state.intervalId);
        state.intervalId = null;
    }
}

function elapsedSeconds() {
    if (!state.startedAtMs) return 0;
    let elapsed = (Date.now() - state.startedAtMs) / 1000;
    if (state.pauseStartedAtMs) {
        elapsed -= (Date.now() - state.pauseStartedAtMs) / 1000;
    }
    return elapsed;
}

function firstDiffIndex(previousText, nextText) {
    const max = Math.min(previousText.length, nextText.length);
    for (let i = 0; i < max; i += 1) {
        if (previousText[i] !== nextText[i]) {
            return i;
        }
    }
    return max;
}

function updateCharStyles(fromIndex = 0) {
    const typed = state.typedText;
    const target = state.targetText;
    for (let i = fromIndex; i < state.charSpans.length; i += 1) {
        const charEl = state.charSpans[i];
        if (i < typed.length) {
            charEl.className = typed[i] === target[i] ? "char correct" : "char incorrect";
        } else if (i === typed.length && typed.length < target.length) {
            charEl.className = "char current";
        } else {
            charEl.className = "char";
        }
    }
}

function scrollCurrentIntoView() {
    const current = state.charSpans[state.typedText.length];
    if (current) {
        current.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
}

function renderTargetText() {
    textDisplay.innerHTML = "";
    state.charSpans = [];
    const fragment = document.createDocumentFragment();
    for (const char of state.targetText) {
        const span = document.createElement("span");
        span.className = "char";
        if (char === " ") {
            span.textContent = "\u00A0";
        } else {
            span.textContent = char;
        }
        state.charSpans.push(span);
        fragment.appendChild(span);
    }
    textDisplay.appendChild(fragment);
    updateCharStyles();
}

function updateStats() {
    const typed = state.typedText;
    const target = state.targetText;
    let correctCount = 0;
    for (let i = 0; i < typed.length; i += 1) {
        if (typed[i] === target[i]) {
            correctCount += 1;
        }
    }

    const elapsed = Math.max(elapsedSeconds(), 1 / 60);
    const minutes = elapsed / 60;
    const wpm = Math.round(correctCount / 5 / minutes);
    const accuracy = typed.length ? (correctCount / typed.length) * 100 : 100;
    const progress = target.length ? (typed.length / target.length) * 100 : 0;
    const remaining = Math.max(0, state.timerSeconds - elapsedSeconds());

    wpmValue.textContent = Number.isFinite(wpm) ? String(wpm) : "0";
    accuracyValue.textContent = `${accuracy.toFixed(1)}%`;
    progressValue.textContent = `${Math.min(100, progress).toFixed(1)}%`;
    timeValue.textContent = `${Math.ceil(remaining)}s`;
}

function finishTyping(message) {
    if (state.finished) return;
    state.finished = true;
    clearTimer();
    typingInput.disabled = true;
    typingPanel.classList.add("finished");
    setStatus(message);
    updateStats();
}

function startTimerIfNeeded() {
    if (state.startedAtMs || state.finished) return;
    state.startedAtMs = Date.now();
    state.intervalId = setInterval(() => {
        const left = state.timerSeconds - elapsedSeconds();
        updateStats();
        if (left <= 0) {
            finishTyping("Time's up.");
        }
    }, 120);
}

function resetSession(content) {
    clearTimer();
    state.targetText = normalizeText(content);
    state.typedText = "";
    state.previousTypedText = "";
    state.startedAtMs = null;
    state.pauseStartedAtMs = null;
    state.finished = false;
    typingInput.value = "";
    typingInput.disabled = false;
    typingPanel.classList.remove("finished");

    renderTargetText();
    updateStats();
    scrollCurrentIntoView();
    typingInput.focus();
}

function loadActiveFile() {
    const selectedId = fileSelect.value;
    const file = getFileById(selectedId);
    if (!file) return;

    state.activeFile = file;
    resetSession(file.content);

    sourceInfo.textContent = `${file.name} | ${file.language} | ${formatBytes(file.content.length)}`;
    setStatus("Ready to type.");
}

function handleFileImport(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        const extension = file.name.split('.').pop();
        const newFile = {
            id: "uploaded-" + Date.now(),
            name: file.name,
            language: extension,
            content: content
        };
        state.files.unshift(newFile);
        buildFileOptions(newFile.id);
        loadActiveFile();
        setStatus("File imported successfully.");
    };
    reader.readAsText(file);
}

typingInput.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
        event.preventDefault();
        const start = typingInput.selectionStart;
        const end = typingInput.selectionEnd;
        const value = typingInput.value;
        typingInput.value = `${value.slice(0, start)}\t${value.slice(end)}`;
        typingInput.selectionStart = typingInput.selectionEnd = start + 1;
        typingInput.dispatchEvent(new Event("input"));
    }
    if (event.key === " ") {
        event.stopPropagation();
    }
});

typingInput.addEventListener("input", () => {
    if (state.finished) {
        typingInput.value = state.typedText;
        return;
    }

    let nextText = typingInput.value;
    if (nextText.length > state.targetText.length) {
        nextText = nextText.slice(0, state.targetText.length);
        typingInput.value = nextText;
    }

    if (nextText.length > 0) {
        startTimerIfNeeded();
    }

    state.previousTypedText = state.typedText;
    state.typedText = nextText;
    const diffIndex = firstDiffIndex(state.previousTypedText, state.typedText);
    updateCharStyles(diffIndex);
    scrollCurrentIntoView();
    updateStats();

    if (state.typedText.length === state.targetText.length) {
        finishTyping("Text completed.");
    }
});

fileSelect.addEventListener("change", () => loadActiveFile());

typingPanel.addEventListener("click", () => {
    if (!typingInput.disabled) {
        typingInput.focus();
    }
});

window.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("active");
});

dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("active");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("active");
    const file = e.dataTransfer.files[0];
    if (file) {
        setStatus("Importing file...");
        handleFileImport(file);
    }
});

restartBtn.addEventListener("click", () => {
    if (!state.targetText) return;
    resetSession(state.targetText);
    setStatus("Training restarted.");
});

durationSelect.addEventListener("change", () => {
    state.timerSeconds = Number(durationSelect.value);
    if (state.targetText) {
        resetSession(state.targetText);
        setStatus("Time updated.");
    }
});

uploadBtn.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    const [file] = fileInput.files;
    if (!file) return;
    setStatus("Importing file...");
    handleFileImport(file);
    fileInput.value = "";
});

window.addEventListener("focus", () => {
    if (!state.finished && state.targetText && !typingInput.disabled) {
        typingInput.focus();
    }
});

document.addEventListener("visibilitychange", () => {
    if (state.finished || !state.startedAtMs) return;

    if (document.visibilityState === "hidden") {
        state.pauseStartedAtMs = Date.now();
        clearTimer();
    } else {
        if (state.pauseStartedAtMs) {
            const pausedFor = Date.now() - state.pauseStartedAtMs;
            state.startedAtMs += pausedFor;
            state.pauseStartedAtMs = null;
        }
        startTimerIfNeeded();
    }
});

// Initialization
buildFileOptions(SAMPLES[0].id);
loadActiveFile();
