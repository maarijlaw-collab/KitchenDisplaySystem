import { Modifier } from '../../types';

interface Props {
  modifier: Modifier;
}

const STYLE = {
  allergy: 'bg-red-900/60 text-red-300 border-red-600',
  dietary: 'bg-green-900/60 text-green-300 border-green-600',
  preference: 'bg-blue-900/40 text-blue-300 border-blue-700',
};

export function ModifierBadge({ modifier }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold tracking-wide ${STYLE[modifier.type]}`}>
      {modifier.type === 'allergy' && <span aria-hidden>⚠</span>}
      {modifier.name}
    </span>
  );
}
