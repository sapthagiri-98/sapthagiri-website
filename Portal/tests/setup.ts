// Test setup file for vitest
import { beforeAll, afterAll, vi } from 'vitest'

// Mock DOM APIs
global.Blob = global.Blob || class Blob {
  constructor(parts, options) {
    this.size = parts.reduce((acc, part) => acc + (part?.length || 0), 0)
    this.type = options?.type || ''
  }
}

global.File = global.File || class File extends Blob {
  constructor(parts, name, options) {
    super(parts, options)
    this.name = name
    this.lastModified = Date.now()
  }
}

global.FileReader = global.FileReader || class FileReader {
  constructor() {
    this.readyState = 0
    this.result = null
    this.onerror = null
    this.onload = null
  }
  readAsArrayBuffer(blob) {
    setTimeout(() => {
      this.readyState = 2
      this.result = new ArrayBuffer(blob.size)
      this.onload?.({ target: this })
    }, 0)
  }
}

// Mock fetch
global.fetch = vi.fn()

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}