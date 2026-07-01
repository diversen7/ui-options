import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "https://cdn.jsdelivr.net/npm/react@19.2.7/+esm"
import { createRoot } from "https://cdn.jsdelivr.net/npm/react-dom@19.2.7/client/+esm"
import htm from "https://cdn.jsdelivr.net/npm/htm@3.1.1/+esm"

const html = htm.bind(React.createElement)

const starterText = `# Welcome to Simple React Paper

This editor loads React, ReactDOM, and HTM from a CDN.

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

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError"
}

function download(contents, fileName) {
  const blob = new Blob([contents], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function App() {
  const [contents, setContents] = useState(starterText)
  const [lastSavedContents, setLastSavedContents] = useState(starterText)
  const [fileHandle, setFileHandle] = useState(null)
  const [fileName, setFileName] = useState("untitled.md")
  const [view, setView] = useState("edit")
  const [saveState, setSaveState] = useState("idle")
  const [message, setMessage] = useState("Local document")
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)

  const dirty = contents !== lastSavedContents
  const supportsSavePicker = "showSaveFilePicker" in window

  const stats = useMemo(() => {
    const trimmed = contents.trim()
    const words = trimmed ? trimmed.split(/\s+/).length : 0
    return `${words} ${words === 1 ? "word" : "words"} · ${contents.length} characters`
  }, [contents])

  const resetSavedLabel = useCallback(() => {
    window.setTimeout(() => {
      setSaveState((current) => (current === "saved" ? "idle" : current))
    }, 1600)
  }, [])

  const writeToHandle = useCallback(
    async (handle) => {
      setSaveState("saving")

      try {
        const writable = await handle.createWritable()
        await writable.write(contents)
        await writable.close()

        setFileHandle(handle)
        setFileName(handle.name)
        setLastSavedContents(contents)
        setSaveState("saved")
        setMessage("Saved to disk")
        resetSavedLabel()
      } catch (error) {
        setSaveState("error")
        setMessage("Could not save the file")
        throw error
      }
    },
    [contents, resetSavedLabel],
  )

  const saveAs = useCallback(async () => {
    if (!window.showSaveFilePicker) {
      download(contents, fileName)
      setLastSavedContents(contents)
      setSaveState("saved")
      setMessage("Downloaded a copy")
      resetSavedLabel()
      return
    }

    try {
      const handle = await window.showSaveFilePicker({
        ...pickerOptions,
        suggestedName: fileName,
      })
      await writeToHandle(handle)
    } catch (error) {
      if (!isAbortError(error)) {
        setSaveState("error")
        setMessage("Could not save the file")
      }
    }
  }, [contents, fileName, resetSavedLabel, writeToHandle])

  const save = useCallback(async () => {
    if (!fileHandle) {
      await saveAs()
      return
    }

    try {
      await writeToHandle(fileHandle)
    } catch {
      // writeToHandle has already updated the visible error state.
    }
  }, [fileHandle, saveAs, writeToHandle])

  const loadFile = useCallback(async (file, handle = null) => {
    const text = await file.text()

    setContents(text)
    setLastSavedContents(text)
    setFileHandle(handle)
    setFileName(file.name)
    setView("edit")
    setSaveState("idle")
    setMessage(handle ? "Opened from disk" : "Opened a local copy")
    window.setTimeout(() => editorRef.current?.focus(), 0)
  }, [])

  const openFile = useCallback(async () => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) {
      return
    }

    if (!window.showOpenFilePicker) {
      fileInputRef.current.value = ""
      fileInputRef.current.click()
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
        setMessage("Could not open the file")
      }
    }
  }, [dirty, loadFile])

  const loadSelectedFile = useCallback(
    async (event) => {
      const file = event.target.files[0]
      if (!file) return

      try {
        await loadFile(file)
      } catch {
        setMessage("Could not open the file")
      }
    },
    [loadFile],
  )

  useEffect(() => {
    const handleShortcut = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault()
        void save()
      }
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [save])

  useEffect(() => {
    const warnBeforeLeaving = (event) => {
      if (dirty) {
        event.preventDefault()
      }
    }

    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [dirty])

  const markdown =
    fileName.endsWith(".md") || fileName.endsWith(".markdown")
  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : "Save"

  return html`
    <div className="app">
      <header className="toolbar">
        <div className="file-info">
          <div className="logo" aria-hidden="true">R</div>
          <div className="file-copy">
            <div className="file-title">
              <strong>${fileName}</strong>
              ${dirty &&
              html`
                <span
                  className="dirty-indicator"
                  aria-label="Unsaved changes"
                ></span>
              `}
            </div>
            <span>${message}</span>
          </div>
        </div>

        <div className="actions">
          <button className="button secondary" onClick=${openFile}>Open</button>
          <button className="button secondary" onClick=${saveAs}>
            ${supportsSavePicker ? "Save as" : "Download"}
          </button>
          <button
            className="button primary"
            onClick=${save}
            disabled=${saveState === "saving"}
          >
            ${saveLabel}
          </button>
        </div>

        <input
          ref=${fileInputRef}
          type="file"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          onChange=${loadSelectedFile}
          hidden
        />
      </header>

      <main>
        <section className="document">
          <div className="document-toolbar">
            <div className="tabs" role="tablist" aria-label="Document view">
              <button
                className=${`tab ${view === "edit" ? "active" : ""}`}
                aria-selected=${view === "edit"}
                onClick=${() => setView("edit")}
                role="tab"
              >
                Edit
              </button>
              <button
                className=${`tab ${view === "preview" ? "active" : ""}`}
                aria-selected=${view === "preview"}
                onClick=${() => setView("preview")}
                role="tab"
              >
                Preview
              </button>
            </div>
            <span className="stats">${stats}</span>
          </div>

          <div className="document-body">
            ${view === "edit"
              ? html`
                  <textarea
                    ref=${editorRef}
                    value=${contents}
                    onChange=${(event) => {
                      setContents(event.target.value)
                      setSaveState("idle")
                      setMessage(
                        fileHandle ? "Editing local file" : "Local document",
                      )
                    }}
                    aria-label="Document contents"
                    spellCheck=${true}
                    placeholder="Start writing…"
                  ></textarea>
                `
              : html`
                  <pre className="preview">${`Preview\n\n${contents}`}</pre>
                `}
          </div>

          <footer className="document-footer">
            <span>${markdown ? "Markdown" : "Plain text"}</span>
            <span>Ctrl/Cmd + S to save</span>
          </footer>
        </section>
      </main>
    </div>
  `
}

createRoot(document.querySelector("#root")).render(html`<${App} />`)
