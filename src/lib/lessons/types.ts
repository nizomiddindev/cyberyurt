export interface GlossaryEntry {
  slug: string;
  term: string;
  definition: string;
  analogy?: string;
}

export interface TreeNode {
  id: string;
  title: string;
  description: string;
  children?: TreeNode[];
}

export interface StepItem {
  title: string;
  body: string;
}

export interface CompareRow {
  label: string;
  left: string;
  right: string;
  diff?: boolean;
}

export type LessonContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "diagram-tree"; root: TreeNode }
  | { type: "diagram-flow"; steps: string[] }
  | { type: "steps"; items: StepItem[] }
  | {
      type: "compare";
      leftTitle: string;
      rightTitle: string;
      rows: CompareRow[];
    };

export interface LessonQuestion {
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface LessonTerminalTask {
  instruction: string;
  matchCommand?: string;
  checkFile?: string;
}

export interface LessonTask {
  id: string;
  title: string;
  blocks: LessonContentBlock[];
  simpler?: string;
  question?: LessonQuestion;
  terminalTask?: LessonTerminalTask;
}

export interface Lesson {
  id: string;
  title: string;
  pathId: string;
  pathTitle: string;
  pathOrder: number;
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  lessonOrder: number;
  prerequisites: string[];
  hasTerminal: boolean;
  scenario: string;
  tasks: LessonTask[];
  glossaryRefs: string[];
}

export interface LessonModuleGroup {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface LessonPathGroup {
  id: string;
  title: string;
  order: number;
  modules: LessonModuleGroup[];
}
