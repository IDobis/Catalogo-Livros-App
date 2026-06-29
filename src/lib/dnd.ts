import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";

/** Só vertical, dentro do container da lista (sem expandir para a direita). */
export const sortableListModifiers = [
  restrictToVerticalAxis,
  restrictToParentElement,
];
