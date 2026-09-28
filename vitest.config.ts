import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Show every test name (including the `it.todo` placeholders) on each run,
    // so the brief's checklist is always visible in the terminal.
    reporters: ['verbose'],
  },
})
