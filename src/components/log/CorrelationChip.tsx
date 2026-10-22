import React from 'react';
import { useInspectorStore } from '../../stores/inspectorStore';
import { useLogDockStore } from '../../stores/logDockStore';

interface CorrelationChipProps {
  requestId?: string;
  isClickable?: boolean;
  className?: string;
}

export const CorrelationChip: React.FC<CorrelationChipProps> = ({
  requestId,
  isClickable = true,
  className = '',
}) => {
  const selectByRequestId = useInspectorStore((s) => s.selectByRequestId);
  const activeFilterId = useLogDockStore((s) => s.requestIdFilter);
  const setRequestIdFilter = useLogDockStore((s) => s.setRequestIdFilter);

  if (!requestId) return null;

  const isCurrentFilter = activeFilterId === requestId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isClickable) return;
    selectByRequestId(requestId);
    // Also toggle filter in log dock
    if (isCurrentFilter) {
      setRequestIdFilter(null);
    } else {
      setRequestIdFilter(requestId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Click to correlate with Inspector and filter logs"
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors select-none cursor-pointer ${
        isCurrentFilter
          ? 'bg-blue-600 text-white font-semibold ring-1 ring-blue-400'
          : 'bg-slate-200/80 text-slate-700 hover:bg-blue-100 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-900/60 dark:hover:text-blue-200'
      } ${className}`}
    >
      {requestId}
    </button>
  );
};
