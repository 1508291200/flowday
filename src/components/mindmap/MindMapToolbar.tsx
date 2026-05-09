/**
 * MindMapToolbar 思维导图工具栏组件
 */

import { Button, IconButton } from '../common';
import { Toolbar, ToolbarGroup, ToolbarDivider } from '../layout';

export interface MindMapToolbarProps {
  onAddRoot?: () => void;
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

// 适应视图图标
function FitViewIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

// 放大图标
function ZoomInIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
    </svg>
  );
}

// 缩小图标
function ZoomOutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
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

export function MindMapToolbar({
  onAddRoot,
  onFitView,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: MindMapToolbarProps) {
  return (
    <Toolbar>
      <ToolbarGroup>
        <Button size="sm" icon={<AddIcon />} onClick={onAddRoot}>
          添加日程
        </Button>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <IconButton size="sm" title="适应视图" onClick={onFitView}>
          <FitViewIcon />
        </IconButton>
        <IconButton size="sm" title="放大" onClick={onZoomIn}>
          <ZoomInIcon />
        </IconButton>
        <IconButton size="sm" title="缩小" onClick={onZoomOut}>
          <ZoomOutIcon />
        </IconButton>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <IconButton size="sm" title="撤销" onClick={onUndo} disabled={!canUndo}>
          <UndoIcon />
        </IconButton>
        <IconButton size="sm" title="重做" onClick={onRedo} disabled={!canRedo}>
          <RedoIcon />
        </IconButton>
      </ToolbarGroup>
    </Toolbar>
  );
}
