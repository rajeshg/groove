import BOARD_TEMPLATES from "./board-templates.json";

export interface TemplateColumn {
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  shortcut?: string;
  isExpanded?: boolean;
}

export interface BoardTemplate {
  name: string;
  columns: TemplateColumn[];
}

export function getBoardTemplates(): BoardTemplate[] {
  return BOARD_TEMPLATES as BoardTemplate[];
}

export function getBoardTemplate(name: string): BoardTemplate | undefined {
  return BOARD_TEMPLATES.find((t) => t.name === name) as
    | BoardTemplate
    | undefined;
}
