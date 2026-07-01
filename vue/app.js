const starterText = `# Welcome to Vue Paper

This editor loads Vue from a CDN and has no build step.

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

// The browser handle does not affect rendering, so it stays outside Vue state.
let activeFileHandle = null

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError"
}

Vue.createApp({
  data() {
    return {
      contents: starterText,
      lastSavedContents: starterText,
      fileName: "untitled.md",
      view: "edit",
      saveState: "idle",
      message: "Local document",
    }
  },

  computed: {
    dirty() {
      return this.contents !== this.lastSavedContents
    },

    supportsSavePicker() {
      return "showSaveFilePicker" in window
    },

    saveButtonLabel() {
      if (this.saveState === "saving") return "Saving…"
      if (this.saveState === "saved") return "Saved"
      return "Save"
    },

    stats() {
      const trimmed = this.contents.trim()
      const words = trimmed ? trimmed.split(/\s+/).length : 0
      return `${words} ${words === 1 ? "word" : "words"} · ${this.contents.length} characters`
    },

    fileType() {
      const markdown =
        this.fileName.endsWith(".md") ||
        this.fileName.endsWith(".markdown")
      return markdown ? "Markdown" : "Plain text"
    },

    previewText() {
      return `Preview\n\n${this.contents}`
    },
  },

  mounted() {
    window.addEventListener("keydown", this.handleShortcut)
    window.addEventListener("beforeunload", this.warnBeforeLeaving)
  },

  beforeUnmount() {
    window.removeEventListener("keydown", this.handleShortcut)
    window.removeEventListener("beforeunload", this.warnBeforeLeaving)
  },

  methods: {
    markEditing() {
      this.saveState = "idle"
      this.message = activeFileHandle
        ? "Editing local file"
        : "Local document"
    },

    async openFile() {
      if (this.dirty && !window.confirm("Discard your unsaved changes?")) {
        return
      }

      if (!window.showOpenFilePicker) {
        this.$refs.fileInput.value = ""
        this.$refs.fileInput.click()
        return
      }

      try {
        const [handle] = await window.showOpenFilePicker({
          ...pickerOptions,
          multiple: false,
        })
        const file = await handle.getFile()
        await this.loadFile(file, handle)
      } catch (error) {
        if (!isAbortError(error)) {
          this.message = "Could not open the file"
        }
      }
    },

    async loadSelectedFile(event) {
      const file = event.target.files[0]
      if (!file) return

      try {
        await this.loadFile(file)
      } catch {
        this.message = "Could not open the file"
      }
    },

    async loadFile(file, handle = null) {
      const text = await file.text()

      activeFileHandle = handle
      this.contents = text
      this.lastSavedContents = text
      this.fileName = file.name
      this.view = "edit"
      this.saveState = "idle"
      this.message = handle ? "Opened from disk" : "Opened a local copy"

      await this.$nextTick()
      this.$refs.editor.focus()
    },

    async writeToHandle(handle) {
      this.saveState = "saving"

      try {
        const writable = await handle.createWritable()
        await writable.write(this.contents)
        await writable.close()

        activeFileHandle = handle
        this.fileName = handle.name
        this.lastSavedContents = this.contents
        this.saveState = "saved"
        this.message = "Saved to disk"
        this.resetSavedLabel()
      } catch (error) {
        this.saveState = "error"
        this.message = "Could not save the file"
        throw error
      }
    },

    async save() {
      if (!activeFileHandle) {
        await this.saveAs()
        return
      }

      try {
        await this.writeToHandle(activeFileHandle)
      } catch {
        // writeToHandle has already updated the visible error state.
      }
    },

    async saveAs() {
      if (!window.showSaveFilePicker) {
        this.downloadFile()
        return
      }

      try {
        const handle = await window.showSaveFilePicker({
          ...pickerOptions,
          suggestedName: this.fileName,
        })
        await this.writeToHandle(handle)
      } catch (error) {
        if (!isAbortError(error)) {
          this.saveState = "error"
          this.message = "Could not save the file"
        }
      }
    },

    downloadFile() {
      const blob = new Blob([this.contents], {
        type: "text/plain;charset=utf-8",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = this.fileName
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)

      this.lastSavedContents = this.contents
      this.saveState = "saved"
      this.message = "Downloaded a copy"
      this.resetSavedLabel()
    },

    resetSavedLabel() {
      window.setTimeout(() => {
        if (this.saveState === "saved") {
          this.saveState = "idle"
        }
      }, 1600)
    },

    handleShortcut(event) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault()
        this.save()
      }
    },

    warnBeforeLeaving(event) {
      if (this.dirty) {
        event.preventDefault()
      }
    },
  },
}).mount("#app")
