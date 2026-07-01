import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  Download,
  FileText,
  FolderOpen,
  Save,
  SaveAll,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const starterText = `# Welcome to Paper

A small, local-first editor for text and Markdown.

- Open a \`.txt\` or \`.md\` file from your computer
- Edit it here
- Save changes directly back to disk

Your document stays in your browser. Nothing is uploaded.
`

const pickerTypes: FilePickerAcceptType[] = [
  {
    description: "Text and Markdown",
    accept: {
      "text/plain": [".txt", ".md", ".markdown"],
    },
  },
]

type View = "edit" | "preview"
type SaveState = "idle" | "saving" | "saved" | "error"

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function downloadFile(contents: string, fileName: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [contents, setContents] = useState(starterText)
  const [lastSavedContents, setLastSavedContents] = useState(starterText)
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(
    null,
  )
  const [fileName, setFileName] = useState("untitled.md")
  const [view, setView] = useState<View>("edit")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [message, setMessage] = useState("Local document")
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const isDirty = contents !== lastSavedContents
  const supportsFileAccess =
    "showOpenFilePicker" in window && "showSaveFilePicker" in window

  const documentStats = useMemo(() => {
    const trimmed = contents.trim()
    const words = trimmed ? trimmed.split(/\s+/).length : 0
    return `${words} ${words === 1 ? "word" : "words"} · ${contents.length} characters`
  }, [contents])

  const writeToHandle = useCallback(
    async (handle: FileSystemFileHandle) => {
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
        window.setTimeout(() => setSaveState("idle"), 1600)
      } catch (error) {
        setSaveState("error")
        setMessage("Could not save the file")
        throw error
      }
    },
    [contents],
  )

  const saveAs = useCallback(async () => {
    if (!window.showSaveFilePicker) {
      downloadFile(contents, fileName)
      setLastSavedContents(contents)
      setMessage("Downloaded a copy")
      setSaveState("saved")
      window.setTimeout(() => setSaveState("idle"), 1600)
      return
    }

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: pickerTypes,
      })
      await writeToHandle(handle)
    } catch (error) {
      if (!isAbortError(error)) {
        setSaveState("error")
        setMessage("Could not save the file")
      }
    }
  }, [contents, fileName, writeToHandle])

  const save = useCallback(async () => {
    if (!fileHandle) {
      await saveAs()
      return
    }

    try {
      await writeToHandle(fileHandle)
    } catch {
      // writeToHandle updates the visible error state.
    }
  }, [fileHandle, saveAs, writeToHandle])

  const openFile = useCallback(async () => {
    if (!window.showOpenFilePicker) {
      setMessage("Opening local files is not supported in this browser")
      return
    }

    if (
      isDirty &&
      !window.confirm("Open another file and discard your unsaved changes?")
    ) {
      return
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: pickerTypes,
      })
      const file = await handle.getFile()
      const text = await file.text()

      setFileHandle(handle)
      setFileName(file.name)
      setContents(text)
      setLastSavedContents(text)
      setSaveState("idle")
      setMessage("Opened from disk")
      setView("edit")
      window.setTimeout(() => editorRef.current?.focus(), 0)
    } catch (error) {
      if (!isAbortError(error)) {
        setMessage("Could not open the file")
      }
    }
  }, [isDirty])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        void save()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [save])

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!isDirty) return
      event.preventDefault()
    }

    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [isDirty])

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
            <FileText className="size-[18px]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold">{fileName}</h1>
              {isDirty && (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-amber-500"
                  aria-label="Unsaved changes"
                />
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openFile}>
            <FolderOpen />
            <span className="hidden sm:inline">Open</span>
          </Button>
          <Button
            variant="outline"
            onClick={saveAs}
            title={supportsFileAccess ? "Save as" : "Download a copy"}
          >
            {supportsFileAccess ? <SaveAll /> : <Download />}
            <span className="hidden md:inline">
              {supportsFileAccess ? "Save as" : "Download"}
            </span>
          </Button>
          <Button onClick={save} disabled={saveState === "saving"}>
            {saveState === "saved" ? <Check /> : <Save />}
            <span className="hidden sm:inline">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : "Save"}
            </span>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex min-h-[calc(100svh-7rem)] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-2 sm:px-4">
            <div
              className="flex rounded-lg bg-muted p-1"
              role="tablist"
              aria-label="Document view"
            >
              {(["edit", "preview"] as View[]).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={view === tab}
                  onClick={() => setView(tab)}
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                    view === tab
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {documentStats}
            </p>
          </div>

          <div className="relative flex-1">
            {view === "edit" ? (
              <textarea
                ref={editorRef}
                value={contents}
                onChange={(event) => {
                  setContents(event.target.value)
                  setSaveState("idle")
                  setMessage(fileHandle ? "Editing local file" : "Local document")
                }}
                aria-label="Document contents"
                spellCheck
                className="absolute inset-0 size-full resize-none bg-card px-5 py-6 font-mono text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground sm:px-10 sm:py-8"
                placeholder="Start writing…"
              />
            ) : (
              <pre className="absolute inset-0 m-0 size-full overflow-auto whitespace-pre-wrap break-words bg-card px-5 py-6 font-sans text-[15px] leading-7 text-foreground sm:px-10 sm:py-8">
                {`Preview\n\n${contents}`}
              </pre>
            )}
          </div>

          <footer className="flex h-9 shrink-0 items-center justify-between border-t border-border px-4 text-[11px] text-muted-foreground">
            <span>{fileName.endsWith(".md") ? "Markdown" : "Plain text"}</span>
            <span className="sm:hidden">{documentStats}</span>
            <span className="hidden sm:inline">⌘/Ctrl + S to save</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
