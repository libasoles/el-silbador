// ascii-tabs has no types and no package entry point: its module is `ascii-tabs/ascii-tabs.js`.
declare module "ascii-tabs/ascii-tabs.js" {
  /** One cell per string, 1 to 6: a fret (0–24) or `null`. */
  export type Column = (number | null)[];

  /** Plain ASCII staves to one Tab. Malformed input logs an error and yields an empty Tab. */
  export function parse(ascii: string): Column[];

  export function format(
    tab: Column[],
    options?: { spacing?: number; labels?: "numbers" | "notes"; width?: number },
  ): string;

  export class AsciiTabs extends HTMLElement {
    value: Column[][];
    spacing: number;
    readonly: boolean;
    addTab(): void;
    removeTab(index: number): void;
    copy(index?: number): Promise<void>;
  }
}
