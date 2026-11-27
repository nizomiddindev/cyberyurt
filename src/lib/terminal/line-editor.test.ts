import { describe, expect, it } from "vitest";
import {
  charDisplayWidth,
  LineEditor,
  stringDisplayWidth,
} from "@/lib/terminal/line-editor";

/**
 * Minimal VT100 2D grid terminal emulator with autowrap + pending-wrap (xenl)
 * and soft-wrap resize reflow. Executes the exact escape sequences returned by
 * LineEditor so tests verify real screen output and cursor coordinates.
 */
class FakeTerminal {
  cols: number;
  rows: string[][] = [[]];
  wrapped: boolean[] = [false];
  cursorRow = 0;
  cursorCol = 0;
  pendingWrap = false;

  constructor(cols: number) {
    this.cols = cols;
  }

  private ensureRow(r: number) {
    while (this.rows.length <= r) {
      this.rows.push([]);
      this.wrapped.push(false);
    }
  }

  write(data: string) {
    let i = 0;
    while (i < data.length) {
      const ch = data[i];

      if (ch === "\r") {
        this.cursorCol = 0;
        this.pendingWrap = false;
        i++;
        continue;
      }

      if (ch === "\n") {
        this.pendingWrap = false;
        this.cursorRow++;
        this.ensureRow(this.cursorRow);
        i++;
        continue;
      }

      if (ch === "\x1b" && data[i + 1] === "[") {
        const rest = data.slice(i + 2);
        const match = rest.match(/^(\d*)([A-Za-z])/);
        if (match) {
          const n = match[1] ? Number.parseInt(match[1], 10) : 1;
          const cmd = match[2];
          this.pendingWrap = false;

          if (cmd === "A") {
            this.cursorRow = Math.max(0, this.cursorRow - n);
          } else if (cmd === "B") {
            this.cursorRow += n;
            this.ensureRow(this.cursorRow);
          } else if (cmd === "C") {
            this.cursorCol = Math.min(this.cols - 1, this.cursorCol + n);
          } else if (cmd === "D") {
            this.cursorCol = Math.max(0, this.cursorCol - n);
          } else if (cmd === "K") {
            this.ensureRow(this.cursorRow);
            this.rows[this.cursorRow].length = Math.min(
              this.rows[this.cursorRow].length,
              this.cursorCol,
            );
          } else if (cmd === "J") {
            this.ensureRow(this.cursorRow);
            this.rows[this.cursorRow].length = Math.min(
              this.rows[this.cursorRow].length,
              this.cursorCol,
            );
            this.rows.length = this.cursorRow + 1;
            this.wrapped.length = this.cursorRow + 1;
          }

          i += 2 + match[0].length;
          continue;
        }
      }

      // Printable character (handle surrogate pairs via codePointAt)
      const cp = data.codePointAt(i)!;
      const char = String.fromCodePoint(cp);
      const step = char.length;

      if (this.pendingWrap) {
        this.pendingWrap = false;
        this.cursorRow++;
        this.cursorCol = 0;
        this.ensureRow(this.cursorRow);
        this.wrapped[this.cursorRow] = true;
      }

      this.ensureRow(this.cursorRow);
      this.rows[this.cursorRow][this.cursorCol] = char;
      if (this.cursorCol + 1 >= this.cols) {
        this.pendingWrap = true;
      } else {
        this.cursorCol++;
      }

      i += step;
    }
  }

  /** Simulates xterm reflowing soft-wrapped rows to a new width. */
  resize(newCols: number) {
    // Reconstruct logical lines from wrapped rows and track cursor offset
    let logical = "";
    let cursorLogicalOffset = 0;
    let foundCursor = false;

    for (let r = 0; r < this.rows.length; r++) {
      const rowText = this.rows[r].join("");
      if (r === this.cursorRow) {
        cursorLogicalOffset = logical.length + this.cursorCol;
        foundCursor = true;
      }
      logical += rowText;
    }

    this.cols = newCols;
    this.rows = [[]];
    this.wrapped = [false];
    this.cursorRow = 0;
    this.cursorCol = 0;
    this.pendingWrap = false;

    const chars = Array.from(logical);
    for (let idx = 0; idx < chars.length; idx++) {
      const r = Math.floor(idx / newCols);
      const c = idx % newCols;
      this.ensureRow(r);
      if (r > 0 && c === 0) this.wrapped[r] = true;
      this.rows[r][c] = chars[idx];
    }

    if (foundCursor) {
      this.cursorRow = Math.floor(cursorLogicalOffset / newCols);
      this.cursorCol = cursorLogicalOffset % newCols;
      this.ensureRow(this.cursorRow);
    }
  }

  getScreenText(): string {
    return this.rows.map((r) => r.join("")).join("");
  }

  getLines(): string[] {
    return this.rows.map((r) => r.join(""));
  }
}

describe("stringDisplayWidth (Uzbek Latin support)", () => {
  it("counts Uzbek characters and U+2018 (‘) as 1 column each", () => {
    expect(charDisplayWidth("o")).toBe(1);
    expect(charDisplayWidth("g")).toBe(1);
    expect(charDisplayWidth("\u2018")).toBe(1);
    expect(charDisplayWidth("\u2019")).toBe(1);
    expect(stringDisplayWidth("o\u2018")).toBe(2);
    expect(stringDisplayWidth("g\u2018")).toBe(2);
    expect(stringDisplayWidth("O\u2018zbekiston")).toBe(11);
  });
});

describe("LineEditor — multiline wrapping and editing", () => {
  const prompt = "mehmon@yurt:~$ "; // 15 columns

  it("renders long lines wrapping 1, 2, and 3 rows without duplicating lines on space", () => {
    const cols = 40;
    const term = new FakeTerminal(cols);
    const editor = new LineEditor();

    term.write(editor.renderFresh(prompt, cols));
    expect(editor.getLastRowCount()).toBe(1);

    // 1 row -> 2 rows -> 3 rows (total > 100 chars at cols=40)
    const longCmd = `echo "${"a".repeat(95)}"`;
    term.write(editor.insert(longCmd, prompt, cols));
    expect(editor.getLastRowCount()).toBe(3);
    expect(term.getScreenText()).toBe(prompt + longCmd);

    // Pressing space repeatedly at the end of a wrapped line must NEVER duplicate the line
    term.write(editor.insert(" ", prompt, cols));
    term.write(editor.insert(" ", prompt, cols));
    expect(term.getScreenText()).toBe(`${prompt}${longCmd}  `);
    expect(term.getLines().length).toBeLessThanOrEqual(4);
  });

  it("handles typing and backspacing across the exact wrap boundary", () => {
    const cols = 20;
    const term = new FakeTerminal(cols);
    const editor = new LineEditor();

    term.write(editor.renderFresh(prompt, cols)); // prompt is 15 cols

    // Type 4 chars -> total 19 (still row 0)
    term.write(editor.insert("abcd", prompt, cols));
    expect(term.cursorRow).toBe(0);
    expect(term.cursorCol).toBe(19);
    expect(editor.getLastRowCount()).toBe(1);

    // Type 5th char -> total 20 (EXACT wrap boundary -> row 1 col 0)
    term.write(editor.insert("e", prompt, cols));
    expect(term.getScreenText()).toBe(`${prompt}abcde`);
    expect(term.cursorRow).toBe(1);
    expect(term.cursorCol).toBe(0);
    expect(editor.getLastRowCount()).toBe(2);

    // Type 6th char -> total 21 (row 1 col 1)
    term.write(editor.insert("f", prompt, cols));
    expect(term.getScreenText()).toBe(`${prompt}abcdef`);
    expect(term.cursorRow).toBe(1);
    expect(term.cursorCol).toBe(1);

    // Backspace from row 1 col 1 -> row 1 col 0
    term.write(editor.backspace(prompt, cols));
    expect(term.getScreenText()).toBe(`${prompt}abcde`);
    expect(term.cursorRow).toBe(1);
    expect(term.cursorCol).toBe(0);

    // Backspace across the row boundary -> row 0 col 19
    term.write(editor.backspace(prompt, cols));
    expect(term.getScreenText()).toBe(`${prompt}abcd`);
    expect(term.cursorRow).toBe(0);
    expect(term.cursorCol).toBe(19);
    expect(editor.getLastRowCount()).toBe(1);
  });

  it("moves cursor left/right, Home/End, and edits in the middle across multiple rows", () => {
    const cols = 20;
    const term = new FakeTerminal(cols);
    const editor = new LineEditor();

    term.write(editor.renderFresh(prompt, cols));
    // prompt (15) + 30 chars = 45 cols -> 3 rows (row 0, row 1, row 2)
    term.write(editor.insert("0123456789abcdefghij0123456789", prompt, cols));
    expect(term.cursorRow).toBe(2);
    expect(term.cursorCol).toBe(5);

    // Move left 6 times: crosses from row 2 col 5 -> row 1 col 19
    for (let i = 0; i < 6; i++) {
      term.write(editor.moveLeft(prompt, cols));
    }
    expect(term.cursorRow).toBe(1);
    expect(term.cursorCol).toBe(19);

    // Insert X right before the row-2 boundary and backspace an earlier char
    term.write(editor.insert("X", prompt, cols));
    expect(editor.getBuffer()).toBe("0123456789abcdefghij0123X456789");
    expect(term.getScreenText()).toBe(
      `${prompt}0123456789abcdefghij0123X456789`,
    );
    expect(term.cursorRow).toBe(2);
    expect(term.cursorCol).toBe(0);

    // Home jumps to row 0 col 15 (right after prompt); End jumps to row 2 col 6
    term.write(editor.moveHome(prompt, cols));
    expect(term.cursorRow).toBe(0);
    expect(term.cursorCol).toBe(15);

    term.write(editor.moveEnd(prompt, cols));
    expect(term.cursorRow).toBe(2);
    expect(term.cursorCol).toBe(6);

    // Delete forward at index 0 removes '0'
    term.write(editor.moveHome(prompt, cols));
    term.write(editor.deleteForward(prompt, cols));
    expect(editor.getBuffer().startsWith("1234")).toBe(true);
    expect(term.getScreenText()).toBe(`${prompt}${editor.getBuffer()}`);
  });

  it("supports Ctrl+W, Ctrl+U, Ctrl+K, and Uzbek text editing cleanly", () => {
    const cols = 30;
    const term = new FakeTerminal(cols);
    const editor = new LineEditor();

    term.write(editor.renderFresh(prompt, cols));
    term.write(editor.insert("echo O\u2018zbekiston g\u2018alaba sinov", prompt, cols));
    expect(term.getScreenText()).toBe(`${prompt}echo O\u2018zbekiston g\u2018alaba sinov`);

    // Ctrl+W deletes "sinov"
    term.write(editor.killWordBeforeCursor(prompt, cols));
    expect(editor.getBuffer()).toBe("echo O\u2018zbekiston g\u2018alaba ");
    expect(term.getScreenText()).toBe(`${prompt}echo O\u2018zbekiston g\u2018alaba `);

    // Move left past "g‘alaba " (8 code points) -> Ctrl+K clears after cursor
    for (let i = 0; i < 8; i++) {
      term.write(editor.moveLeft(prompt, cols));
    }
    term.write(editor.killAfterCursor(prompt, cols));
    expect(editor.getBuffer()).toBe("echo O\u2018zbekiston ");

    // Move left 4 chars and Ctrl+U clears before cursor
    for (let i = 0; i < 4; i++) {
      term.write(editor.moveLeft(prompt, cols));
    }
    term.write(editor.killBeforeCursor(prompt, cols));
    expect(editor.getBuffer()).toBe("ton ");
    expect(term.getScreenText()).toBe(`${prompt}ton `);
  });

  it("recalls long multiline commands from history and preserves draft", () => {
    const cols = 30;
    const term = new FakeTerminal(cols);
    const editor = new LineEditor();

    const long1 = `echo "${"x".repeat(65)}"`;
    editor.setHistory([long1, "ls -la"]);

    term.write(editor.renderFresh(prompt, cols));
    term.write(editor.insert("draft", prompt, cols));

    // Up -> "ls -la"
    term.write(editor.historyPrev(prompt, cols));
    expect(term.getScreenText()).toBe(`${prompt}ls -la`);

    // Up -> 3-row long1
    term.write(editor.historyPrev(prompt, cols));
    expect(editor.getLastRowCount()).toBe(3);
    expect(term.getScreenText()).toBe(`${prompt}${long1}`);

    // Down -> "ls -la" cleanly erases all 3 rows of long1
    term.write(editor.historyNext(prompt, cols));
    expect(editor.getLastRowCount()).toBe(1);
    expect(term.getScreenText()).toBe(`${prompt}ls -la`);

    // Down -> restores "draft"
    term.write(editor.historyNext(prompt, cols));
    expect(term.getScreenText()).toBe(`${prompt}draft`);
  });

  it("re-renders cleanly after terminal resize without duplicating lines", () => {
    const term = new FakeTerminal(40);
    const editor = new LineEditor();

    term.write(editor.renderFresh(prompt, 40));
    const cmd = `echo "${"m".repeat(70)}"`;
    term.write(editor.insert(cmd, prompt, 40));

    // Move cursor into the middle before resizing
    for (let i = 0; i < 25; i++) {
      term.write(editor.moveLeft(prompt, 40));
    }

    // Shrink terminal 40 -> 24
    term.resize(24);
    term.write(editor.handleResize(prompt, 24));
    expect(term.getScreenText()).toBe(prompt + cmd);

    // Type a char after resize -> no duplication
    term.write(editor.insert("!", prompt, 24));
    expect(term.getScreenText()).toBe(prompt + editor.getBuffer());

    // Expand terminal 24 -> 60
    term.resize(60);
    term.write(editor.handleResize(prompt, 60));
    expect(term.getScreenText()).toBe(prompt + editor.getBuffer());
  });

  it("moves below all wrapped rows on submit and Ctrl+C when cursor is on row 0", () => {
    const cols = 20;
    const term = new FakeTerminal(cols);
    const editor = new LineEditor();

    term.write(editor.renderFresh(prompt, cols));
    const cmd = "a".repeat(45); // 15 + 45 = 60 -> wraps onto rows 0, 1, 2, 3
    term.write(editor.insert(cmd, prompt, cols));
    term.write(editor.moveHome(prompt, cols));
    expect(term.cursorRow).toBe(0);

    const { line, output } = editor.submit();
    expect(line).toBe(cmd);
    term.write(output);
    // Must land BELOW all rows of the command
    expect(term.cursorRow).toBeGreaterThanOrEqual(3);

    // Same for Ctrl+C from row 0 of a wrapped line
    const term2 = new FakeTerminal(cols);
    const editor2 = new LineEditor();
    term2.write(editor2.renderFresh(prompt, cols));
    term2.write(editor2.insert("b".repeat(35), prompt, cols));
    term2.write(editor2.moveHome(prompt, cols));
    const cancelOut = editor2.cancel(prompt, cols);
    term2.write(cancelOut);
    expect(editor2.getBuffer()).toBe("");
    expect(term2.getLines().at(-1)).toBe(prompt);
  });
});
