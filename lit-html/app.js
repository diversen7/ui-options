import {
  html,
  nothing,
  render,
} from "https://cdn.jsdelivr.net/npm/lit-html@3.3.3/+esm"

const starterText = `# Welcome to Lit Paper

This editor uses lit-html tagged template literals.

- Open a text or Markdown file
- Edit it locally
- Save it directly back to disk

Nothing is uploaded to a server.
`

const pickerOptions = {
  types: [
    {
      description: "Text and Markdown",
      accept: {
        "text/plain": [".txt", ".md", ".markdown"],
      },
    },
  ],
}

const state = {
  contents: starterText,
  lastSavedContents: starterText,
  fileName: "untitled.md",
  fileHandle: null,
  view: "edit",
  saveState: "idle",
  message: "Local document",
}

const root = document.querySelector("#app")

function isDirty() {
  return state.contents !== state.lastSavedContents
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError"
}

function getStats() {
  const trimmed = state.contents.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  return `${words} ${words === 1 ? "word" : "words"} · ${state.contents.length} characters`
}

function getSaveLabel() {
  if (state.saveState === "saving") return "Saving…"
  if (state.saveState === "saved") return "Saved"
  return "Save"
}

function appTemplate() {
  const supportsSavePicker = "showSaveFilePicker" in window
  const markdown =
    state.fileName.endsWith(".md") ||
    state.fileName.endsWith(".markdown")

  return html`
    <div class="app">
      <header class="toolbar">
        <div class="file-info">
          <div class="logo" aria-hidden="true">L</div>
          <div class="file-copy">
            <div class="file-title">
              <strong>${state.fileName}</strong>
              ${isDirty()
                ? html`
                    <span
                      class="dirty-indicator"
                      aria-label="Unsaved changes"
                    ></span>
                  `
                : nothing}
            </div>
            <span>${state.message}</span>
          </div>
        </div>

        <div class="actions">
          <button class="button secondary" @click=${openFile}>Open</button>
          <button class="button secondary" @click=${saveAs}>
            ${supportsSavePicker ? "Save as" : "Download"}
          </button>
          <button
            class="button primary"
            @click=${save}
            ?disabled=${state.saveState === "saving"}
          >
            ${getSaveLabel()}
          </button>
        </div>

        <input
          id="file-input"
          type="file"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          @change=${loadSelectedFile}
          hidden
        />
      </header>

      <main>
        <section class="document">
          <div class="document-toolbar">
            <div class="tabs" role="tablist" aria-label="Document view">
              <button
                class="tab ${state.view === "edit" ? "active" : ""}"
                aria-selected=${state.view === "edit"}
                @click=${() => setView("edit")}
                role="tab"
              >
                Edit
              </button>
              <button
                class="tab ${state.view === "preview" ? "active" : ""}"
                aria-selected=${state.view === "preview"}
                @click=${() => setView("preview")}
                role="tab"
              >
                Preview
              </button>
            </div>
            <span class="stats">${getStats()}</span>
          </div>

          <div class="document-body">
            ${state.view === "edit"
              ? html`
                  <textarea
                    id="editor"
                    .value=${state.contents}
                    @input=${handleInput}
                    aria-label="Document contents"
                    spellcheck="true"
                    placeholder="Start writing…"
                  ></textarea>
                `
              : html`
                  <pre class="preview">${`Preview\n\n${state.contents}`}</pre>
                `}
          </div>

          <footer class="document-footer">
            <span>${markdown ? "Markdown" : "Plain text"}</span>
            <span>Ctrl/Cmd + S to save</span>
          </footer>
        </section>
      </main>
    </div>
  `
}

function update() {
  render(appTemplate(), root)
}

function setView(view) {
  state.view = view
  update()
}

function handleInput(event) {
  state.contents = event.target.value
  state.saveState = "idle"
  state.message = state.fileHandle ? "Editing local file" : "Local document"
  update()
}

async function openFile() {
  if (isDirty() && !window.confirm("Discard your unsaved changes?")) {
    return
  }

  if (!window.showOpenFilePicker) {
    const input = document.querySelector("#file-input")
    input.value = ""
    input.click()
    return
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      ...pickerOptions,
      multiple: false,
    })
    const file = await handle.getFile()
    await loadFile(file, handle)
  } catch (error) {
    if (!isAbortError(error)) {
      state.message = "Could not open the file"
      update()
    }
  }
}

async function loadSelectedFile(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    await loadFile(file)
  } catch {
    state.message = "Could not open the file"
    update()
  }
}

async function loadFile(file, handle = null) {
  const text = await file.text()

  state.contents = text
  state.lastSavedContents = text
  state.fileHandle = handle
  state.fileName = file.name
  state.view = "edit"
  state.saveState = "idle"
  state.message = handle ? "Opened from disk" : "Opened a local copy"
  update()
  document.querySelector("#editor").focus()
}

async function writeToHandle(handle) {
  state.saveState = "saving"
  update()

  try {
    const writable = await handle.createWritable()
    await writable.write(state.contents)
    await writable.close()

    state.fileHandle = handle
    state.fileName = handle.name
    state.lastSavedContents = state.contents
    state.saveState = "saved"
    state.message = "Saved to disk"
    update()
    resetSavedLabel()
  } catch (error) {
    state.saveState = "error"
    state.message = "Could not save the file"
    update()
    throw error
  }
}

async function save() {
  if (!state.fileHandle) {
    await saveAs()
    return
  }

  try {
    await writeToHandle(state.fileHandle)
  } catch {
    // writeToHandle has already updated the visible error state.
  }
}

async function saveAs() {
  if (!window.showSaveFilePicker) {
    downloadFile()
    return
  }

  try {
    const handle = await window.showSaveFilePicker({
      ...pickerOptions,
      suggestedName: state.fileName,
    })
    await writeToHandle(handle)
  } catch (error) {
    if (!isAbortError(error)) {
      state.saveState = "error"
      state.message = "Could not save the file"
      update()
    }
  }
}

function downloadFile() {
  const blob = new Blob([state.contents], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = state.fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)

  state.lastSavedContents = state.contents
  state.saveState = "saved"
  state.message = "Downloaded a copy"
  update()
  resetSavedLabel()
}

function resetSavedLabel() {
  window.setTimeout(() => {
    if (state.saveState === "saved") {
      state.saveState = "idle"
      update()
    }
  }, 1600)
}

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault()
    void save()
  }
})

window.addEventListener("beforeunload", (event) => {
  if (isDirty()) {
    event.preventDefault()
  }
})

update()
