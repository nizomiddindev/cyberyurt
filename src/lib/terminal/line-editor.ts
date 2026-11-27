/**
 * Pure, xterm-independent multiline terminal line editor.
 *
 * Manages buffer, cursor position (code-point index), history navigation,
 * word/line editing shortcuts, and exact VT100 escape sequences for wrapped
 * multi-row input across arbitrary terminal widths.
 */

const COMBINING_MARK_REGEX = /\p{Mark}/u;

function isWideCodePoint(code: number): boolean {
  return (
    code >= 0x1100 &&
    (code <= 0x115f ||
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x20000 && code <= 0x3fffd))
  );
}

/**
 * Display column width of a single Unicode character in a monospace terminal.
 * Uzbek Latin letters and U+2018 (‘) / U+2019 (’) are 1 column each (never
 * treated as East Asian wide). Combining marks and control chars are 0.
 */
export function charDisplayWidth(ch: string): number {
  if (!ch) return 0;
  const code = ch.codePointAt(0);
  if (code === undefined) return 0;
  if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return 0;
  if (COMBINING_MARK_REGEX.test(ch)) return 0;
  if (isWideCodePoint(code)) return 2;
  return 1;
}

export function stringDisplayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    width += charDisplayWidth(ch);
  }
  return width;
}

export function cleanInsertedText(raw: string): string {
  return raw
    .replace(/\r\n|\r|\n|\t/g, " ")
    .replace(/[\x00-\x1f\x7f]/g, "");
}

function clampCols(cols: number): number {
  if (!Number.isFinite(cols) || cols < 1) return 80;
  return Math.floor(cols);
}

export class LineEditor {
  private chars: string[] = [];
  private cursor = 0;
  private history: string[] = [];
  private historyCursor = -1;
  private historyDraft = "";

  // Layout state from the most recent render
  private lastCursorRow = 0;
  private lastRowCount = 1;
  private lastCols = 80;

  getBuffer(): string {
    return this.chars.join("");
  }

  getCursor(): number {
    return this.cursor;
  }

  getBeforeCursor(): string {
    return this.chars.slice(0, this.cursor).join("");
  }

  getAfterCursor(): string {
    return this.chars.slice(this.cursor).join("");
  }

  getLastRowCount(): number {
    return this.lastRowCount;
  }

  getLastCursorRow(): number {
    return this.lastCursorRow;
  }

  getHistory(): readonly string[] {
    return this.history;
  }

  setHistory(entries: readonly string[]): void {
    this.history = [...entries];
    this.historyCursor = -1;
    this.historyDraft = "";
  }

  resetAll(): void {
    this.chars = [];
    this.cursor = 0;
    this.history = [];
    this.historyCursor = -1;
    this.historyDraft = "";
    this.lastCursorRow = 0;
    this.lastRowCount = 1;
  }

  /**
   * Renders prompt + current buffer from a clean cursor at column 0 of a fresh
   * line (used right after command output, Ctrl+L clear, or Tab candidates).
   */
  renderFresh(prompt: string, cols: number): string {
    this.lastCursorRow = 0;
    this.lastRowCount = 1;
    return this.render(prompt, cols);
  }

  /**
   * Moves to the start of the first row of the previous render, clears to end
   * of screen, prints prompt + buffer, and positions the cursor accurately.
   */
  render(prompt: string, cols: number): string {
    const safeCols = clampCols(cols);
    const promptWidth = stringDisplayWidth(prompt);
    const buffer = this.getBuffer();
    const bufferWidth = stringDisplayWidth(buffer);
    const beforeWidth = stringDisplayWidth(this.getBeforeCursor());

    const totalWidth = promptWidth + bufferWidth;
    const cursorOffset = promptWidth + beforeWidth;

    let out = "";

    // Move back up to row 0 of the input block, go to column 0, clear below.
    if (this.lastCursorRow > 0) {
      out += `\x1b[${this.lastCursorRow}A`;
    }
    out += "\r\x1b[J";

    // Write prompt + full input buffer.
    out += prompt + buffer;

    // Resolve VT100 pending-wrap when totalWidth lands exactly on a row edge:
    // writing a space triggers a soft autowrap to (endRow, 1), then "\r\x1b[K"
    // moves to (endRow, 0) and erases the space without inserting a hard newline
    // (so terminal resize reflow stays accurate).
    const hitsExactWrap = totalWidth > 0 && totalWidth % safeCols === 0;
    if (hitsExactWrap) {
      out += " \r\x1b[K";
    }

    const endRow = Math.floor(totalWidth / safeCols);
    const targetRow = Math.floor(cursorOffset / safeCols);
    const targetCol = cursorOffset % safeCols;

    const moveUp = endRow - targetRow;
    if (moveUp > 0) {
      out += `\x1b[${moveUp}A`;
    }
    out += "\r";
    if (targetCol > 0) {
      out += `\x1b[${targetCol}C`;
    }

    this.lastCols = safeCols;
    this.lastCursorRow = targetRow;
    this.lastRowCount = endRow + 1;

    return out;
  }

  /**
   * Updates tracking after xterm reflows the line to a new column width and
   * returns the escape sequence to redraw cleanly at the new width.
   */
  handleResize(prompt: string, newCols: number): string {
    const safeCols = clampCols(newCols);
    if (safeCols === this.lastCols) {
      return "";
    }
    const cursorOffset =
      stringDisplayWidth(prompt) + stringDisplayWidth(this.getBeforeCursor());
    // xterm reflows existing wrapped rows to the new width before calling onResize
    this.lastCursorRow = Math.floor(cursorOffset / safeCols);
    return this.render(prompt, safeCols);
  }

  /**
   * Moves cursor to the line below the last row of the current input block
   * without erasing it (used before printing Tab candidates).
   */
  moveBelowInput(): string {
    const down = Math.max(0, this.lastRowCount - 1 - this.lastCursorRow);
    let out = "";
    if (down > 0) {
      out += `\x1b[${down}B`;
    }
    out += "\r\n";
    this.lastCursorRow = 0;
    this.lastRowCount = 1;
    return out;
  }

  insert(rawText: string, prompt: string, cols: number): string {
    const cleaned = cleanInsertedText(rawText);
    if (!cleaned) return "";

    const inserted = Array.from(cleaned);
    this.chars.splice(this.cursor, 0, ...inserted);
    this.cursor += inserted.length;
    return this.render(prompt, cols);
  }

  setLine(
    nextLine: string,
    nextCursor: number,
    prompt: string,
    cols: number,
  ): string {
    this.chars = Array.from(nextLine);
    this.cursor = Math.max(0, Math.min(nextCursor, this.chars.length));
    return this.render(prompt, cols);
  }

  backspace(prompt: string, cols: number): string {
    if (this.cursor === 0) return "";
    this.chars.splice(this.cursor - 1, 1);
    this.cursor--;
    return this.render(prompt, cols);
  }

  deleteForward(prompt: string, cols: number): string {
    if (this.cursor >= this.chars.length) return "";
    this.chars.splice(this.cursor, 1);
    return this.render(prompt, cols);
  }

  moveLeft(prompt: string, cols: number): string {
    if (this.cursor === 0) return "";
    this.cursor--;
    return this.render(prompt, cols);
  }

  moveRight(prompt: string, cols: number): string {
    if (this.cursor >= this.chars.length) return "";
    this.cursor++;
    return this.render(prompt, cols);
  }

  moveHome(prompt: string, cols: number): string {
    if (this.cursor === 0) return "";
    this.cursor = 0;
    return this.render(prompt, cols);
  }

  moveEnd(prompt: string, cols: number): string {
    if (this.cursor === this.chars.length) return "";
    this.cursor = this.chars.length;
    return this.render(prompt, cols);
  }

  /** Ctrl+U: clear everything before the cursor. */
  killBeforeCursor(prompt: string, cols: number): string {
    if (this.cursor === 0) return "";
    this.chars.splice(0, this.cursor);
    this.cursor = 0;
    return this.render(prompt, cols);
  }

  /** Ctrl+K: clear everything from the cursor to the end of the line. */
  killAfterCursor(prompt: string, cols: number): string {
    if (this.cursor >= this.chars.length) return "";
    this.chars.splice(this.cursor);
    return this.render(prompt, cols);
  }

  /** Ctrl+W: delete the word immediately before the cursor. */
  killWordBeforeCursor(prompt: string, cols: number): string {
    if (this.cursor === 0) return "";
    let start = this.cursor;
    while (start > 0 && /\s/.test(this.chars[start - 1])) {
      start--;
    }
    while (start > 0 && !/\s/.test(this.chars[start - 1])) {
      start--;
    }
    this.chars.splice(start, this.cursor - start);
    this.cursor = start;
    return this.render(prompt, cols);
  }

  historyPrev(prompt: string, cols: number): string {
    if (this.history.length === 0) return "";
    if (this.historyCursor === -1) {
      this.historyDraft = this.getBuffer();
      this.historyCursor = this.history.length - 1;
    } else if (this.historyCursor > 0) {
      this.historyCursor--;
    }
    const entry = this.history[this.historyCursor] ?? "";
    return this.setLine(entry, Array.from(entry).length, prompt, cols);
  }

  historyNext(prompt: string, cols: number): string {
    if (this.historyCursor === -1) return "";
    if (this.historyCursor < this.history.length - 1) {
      this.historyCursor++;
      const entry = this.history[this.historyCursor] ?? "";
      return this.setLine(entry, Array.from(entry).length, prompt, cols);
    }
    this.historyCursor = -1;
    return this.setLine(
      this.historyDraft,
      Array.from(this.historyDraft).length,
      prompt,
      cols,
    );
  }

  /**
   * Commits the current line on Enter: moves cursor below any wrapped rows,
   * records non-empty commands in history, resets buffer, and returns both
   * the submitted line and the escape sequence to emit.
   */
  submit(): { line: string; output: string } {
    const line = this.getBuffer();
    const trimmed = line.trim();
    if (trimmed) {
      this.history.push(trimmed);
    }
    const output = this.moveBelowInput();
    this.chars = [];
    this.cursor = 0;
    this.historyCursor = -1;
    this.historyDraft = "";
    return { line, output };
  }

  /**
   * Cancels the current line on Ctrl+C: moves below any wrapped rows, emits
   * "^C\r\n", resets buffer, and renders a fresh prompt.
   */
  cancel(prompt: string, cols: number): string {
    const down = Math.max(0, this.lastRowCount - 1 - this.lastCursorRow);
    let out = "";
    if (down > 0) {
      out += `\x1b[${down}B`;
    }
    out += "^C\r\n";
    this.chars = [];
    this.cursor = 0;
    this.historyCursor = -1;
    this.historyDraft = "";
    this.lastCursorRow = 0;
    this.lastRowCount = 1;
    return out + this.renderFresh(prompt, cols);
  }
}
