/**
 * ListToolbar 列表视图工具栏组件
 */

import { Button, IconButton } from '../common';
import { Toolbar, ToolbarGroup, ToolbarDivider } from '../layout';

export interface ListToolbarProps {
  onAddRoot?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

// 展开图标
function ExpandIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

// 折叠图标
function CollapseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
    </svg>
  );
}

// 添加图标
function AddIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

// 撤销图标
function UndoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  );
}

// 重做图标
function RedoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
    </svg>
  );
}

export function ListToolbar({
  onAddRoot,
  onExpandAll,
  onCollapseAll,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: ListToolbarProps) {
  return (
    <Toolbar>
      <ToolbarGroup>
        <Button
          size="sm"
          icon={<AddIcon />}
          onClick={onAddRoot}
        >
          添加日程
        </Button>
      </ToolbarGroup>
      
      <ToolbarDivider />
      
      <ToolbarGroup>
        <IconButton
          size="sm"
          title="全部展开"
          onClick={onExpandAll}
        >
          <ExpandIcon />
        </IconButton>
        <IconButton
          size="sm"
          title="全部折叠"
          onClick={onCollapseAll}
        >
          <CollapseIcon />
        </IconButton>
      </ToolbarGroup>
      
      <ToolbarDivider />
      
      <ToolbarGroup>
        <IconButton
          size="sm"
          title="撤销"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <UndoIcon />
        </IconButton>
        <IconButton
          size="sm"
          title="重做"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <RedoIcon />
        </IconButton>
      </ToolbarGroup>
    </Toolbar>
  );
}
