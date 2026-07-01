const starterText = `# Welcome to Plain Paper

This version uses only HTML, CSS, and JavaScript.

- Open a text or Markdown file
- Edit it in the browser
- Save it directly back to disk

Nothing is uploaded to a server.
`

const state = {
  contents: starterText,
  lastSavedContents: starterText,
  fileHandle: null,
  fileName: "untitled.md",
  view: "edit",
  saveState: "idle",
  message: "Local document",
}

const elements = {
  editor: document.querySelector("#editor"),
  preview: document.querySelector("#preview"),
  editTab: document.querySelector("#edit-tab"),
  previewTab: document.querySelector("#preview-tab"),
  fileName: document.querySelector("#file-name"),
  fileType: document.querySelector("#file-type"),
  dirtyIndicator: document.querySelector("#dirty-indicator"),
  statusMessage: document.querySelector("#status-message"),
  documentStats: document.querySelector("#document-stats"),
  openButton: document.querySelector("#open-button"),
  saveButton: document.querySelector("#save-button"),
  saveAsButton: document.querySelector("#save-as-button"),
  fileInput: document.querySelector("#file-input"),
}

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

function isDirty() {
  return state.contents !== state.lastSavedContents
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError"
}

function render() {
  const trimmed = state.contents.trim()
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0
  const isMarkdown =
    state.fileName.endsWith(".md") || state.fileName.endsWith(".markdown")

  elements.fileName.textContent = state.fileName
  elements.fileType.textContent = isMarkdown ? "Markdown" : "Plain text"
  elements.statusMessage.textContent = state.message
  elements.dirtyIndicator.hidden = !isDirty()
  elements.documentStats.textContent =
    `${wordCount} ${wordCount === 1 ? "word" : "words"} · ` +
    `${state.contents.length} characters`

  elements.editor.hidden = state.view !== "edit"
  elements.preview.hidden = state.view !== "preview"
  elements.editTab.classList.toggle("active", state.view === "edit")
  elements.previewTab.classList.toggle("active", state.view === "preview")
  elements.editTab.setAttribute(
    "aria-selected",
    String(state.view === "edit"),
  )
  elements.previewTab.setAttribute(
    "aria-selected",
    String(state.view === "preview"),
  )

  elements.saveButton.disabled = state.saveState === "saving"
  elements.saveButton.textContent =
    state.saveState === "saving"
      ? "Saving…"
      : state.saveState === "saved"
        ? "Saved"
        : "Save"

  const supportsSavePicker = "showSaveFilePicker" in window
  elements.saveAsButton.textContent = supportsSavePicker
    ? "Save as"
    : "Download"
}

function setView(view) {
  state.view = view

  if (view === "preview") {
    elements.preview.textContent = `Preview\n\n${state.contents}`
  }

  render()
}

async function writeToHandle(handle) {
  state.saveState = "saving"
  render()

  try {
    const writable = await handle.createWritable()
    await writable.write(state.contents)
    await writable.close()

    state.fileHandle = handle
    state.fileName = handle.name
    state.lastSavedContents = state.contents
    state.saveState = "saved"
    state.message = "Saved to disk"
    render()

    window.setTimeout(() => {
      state.saveState = "idle"
      render()
    }, 1600)
  } catch (error) {
    state.saveState = "error"
    state.message = "Could not save the file"
    render()
    throw error
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
  render()

  window.setTimeout(() => {
    state.saveState = "idle"
    render()
  }, 1600)
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
      render()
    }
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

async function openFile() {
  if (isDirty() && !window.confirm("Discard your unsaved changes?")) {
    return
  }

  if (!window.showOpenFilePicker) {
    elements.fileInput.value = ""
    elements.fileInput.click()
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
      render()
    }
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

  elements.editor.value = text
  render()
  elements.editor.focus()
}

elements.editor.value = state.contents
elements.editor.addEventListener("input", (event) => {
  state.contents = event.target.value
  state.saveState = "idle"
  state.message = state.fileHandle ? "Editing local file" : "Local document"
  render()
})

elements.editTab.addEventListener("click", () => setView("edit"))
elements.previewTab.addEventListener("click", () => setView("preview"))
elements.openButton.addEventListener("click", openFile)
elements.saveButton.addEventListener("click", save)
elements.saveAsButton.addEventListener("click", saveAs)

elements.fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files
  if (!file) return

  try {
    await loadFile(file)
  } catch {
    state.message = "Could not open the file"
    render()
  }
})

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

render()
