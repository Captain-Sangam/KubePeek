import type { TablePlugin } from '@astryxdesign/core/Table';

// Table plugin making every body row clickable (astryx's data-driven Table
// has no onRowClick prop; plugins own row props).
export function tableRowClick<T extends Record<string, unknown>>(
  onClick: (item: T) => void
): TablePlugin<T> {
  return {
    transformBodyRow: (props, item) => ({
      ...props,
      htmlProps: {
        ...props.htmlProps,
        onClick: () => onClick(item),
        style: { ...props.htmlProps.style, cursor: 'pointer' },
      },
    }),
  };
}
