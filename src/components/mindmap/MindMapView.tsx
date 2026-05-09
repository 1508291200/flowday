/**
 * MindMapView 思维导图视图组件
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useSchedulerStore } from '../../stores/schedulerStore';
import { useEventBus } from '../../hooks/useEventBus';
import { MindMapNode } from './MindMapNode';
import { MindMapToolbar } from './MindMapToolbar';
import { EditModal } from './EditModal';
import type { ScheduleNode, MindMapSettings } from '../../core/types';
import { calculateSubtreeHeight } from '../../utils/tree';

// 注册自定义节点类型
const nodeTypes = {
  scheduleNode: MindMapNode,
};

// 默认设置
const defaultSettings: MindMapSettings = {
  nodeWidth: 180,
  nodeHeight: 40,
  horizontalGap: 60,
  verticalGap: 20,
  defaultZoom: 1,
  showConnectionLines: true,
  connectionLineStyle: 'step',
};

function MindMapViewInner() {
  const schedulerManager = useSchedulerStore((s) => s.schedulerManager);
  const tagManager = useSchedulerStore((s) => s.tagManager);
  const nodes = useSchedulerStore((s) => s.nodes); // 订阅 nodes 状态变化
  const canUndo = useSchedulerStore((s) => s.canUndo);
  const canRedo = useSchedulerStore((s) => s.canRedo);
  const createNode = useSchedulerStore((s) => s.createNode);
  const updateNode = useSchedulerStore((s) => s.updateNode);
  const deleteNode = useSchedulerStore((s) => s.deleteNode);
  const toggleCollapse = useSchedulerStore((s) => s.toggleCollapse);
  const toggleComplete = useSchedulerStore((s) => s.toggleComplete);
  const undo = useSchedulerStore((s) => s.undo);
  const redo = useSchedulerStore((s) => s.redo);

  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);

  // 编辑弹窗状态
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // 将日程数据转换为 React Flow 节点和边
  const convertToFlowData = useCallback(() => {
    const allNodes = schedulerManager.getAllNodes();
    const allTags = tagManager.getAllTags();
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // 构建父子映射
    const childrenMap = new Map<string | null, ScheduleNode[]>();
    for (const node of allNodes) {
      const siblings = childrenMap.get(node.parentId) ?? [];
      siblings.push(node);
      childrenMap.set(node.parentId, siblings);
    }

    // 排序
    for (const siblings of childrenMap.values()) {
      siblings.sort((a, b) => a.order - b.order);
    }

    // 计算布局位置
    const calculatePosition = (
      parentId: string | null,
      depth: number,
      startY: number
    ): number => {
      const children = childrenMap.get(parentId) ?? [];
      let currentY = startY;

      for (const node of children) {
        const isCollapsed = node.collapsed;
        const subtreeHeight = isCollapsed
          ? defaultSettings.nodeHeight + defaultSettings.verticalGap
          : calculateSubtreeHeight(
              node.id,
              allNodes,
              defaultSettings.nodeHeight,
              defaultSettings.verticalGap
            );

        const x = depth * (defaultSettings.nodeWidth + defaultSettings.horizontalGap);
        const y = currentY + subtreeHeight / 2 - defaultSettings.nodeHeight / 2;

        flowNodes.push({
          id: node.id,
          type: 'scheduleNode',
          position: { x, y },
          data: {
            node,
            tags: allTags.filter(t => node.tags.includes(t.id)),
            onToggleCollapse: () => toggleCollapse(node.id),
            onToggleComplete: () => toggleComplete(node.id),
            onAddChild: () => handleAddChild(node.id),
            onEdit: () => handleOpenEdit(node.id),
            onDelete: () => handleDelete(node.id),
          },
        });

        if (node.parentId) {
          flowEdges.push({
            id: `${node.parentId}-${node.id}`,
            source: node.parentId,
            target: node.id,
            type: 'step',
            style: { stroke: '#d1d5db', strokeWidth: 2 },
          });
        }

        if (!isCollapsed) {
          calculatePosition(node.id, depth + 1, currentY);
        }

        currentY += subtreeHeight;
      }

      return currentY;
    };

    // 从根节点开始计算
    calculatePosition(null, 0, 100);

    setFlowNodes(flowNodes);
    setFlowEdges(flowEdges);
  }, [schedulerManager, tagManager, toggleCollapse, toggleComplete, setFlowNodes, setFlowEdges]);

  // 监听 nodes 状态变化，触发重新渲染
  useEffect(() => {
    convertToFlowData();
  }, [nodes, convertToFlowData]);

  // 监听事件总线
  useEventBus('tree:loaded', convertToFlowData);
  useEventBus('tree:reordered', convertToFlowData);

  // 添加根节点
  const handleAddRoot = useCallback(() => {
    createNode(null, { title: '新日程' });
  }, [createNode]);

  // 添加子节点
  const handleAddChild = useCallback((parentId: string) => {
    createNode(parentId, { title: '新子日程' });
  }, [createNode]);

  // 打开编辑弹窗
  const handleOpenEdit = useCallback((id: string) => {
    setEditingNodeId(id);
    setEditModalOpen(true);
  }, []);

  // 保存编辑
  const handleSaveEdit = useCallback((data: { title: string; description: string; importance: number; dueDate: string | null }) => {
    if (editingNodeId) {
      updateNode(editingNodeId, {
        title: data.title,
        description: data.description,
        importance: data.importance as 1 | 2 | 3 | 4 | 5,
        dueDate: data.dueDate,
      });
    }
    setEditModalOpen(false);
    setEditingNodeId(null);
  }, [editingNodeId, updateNode]);

  // 删除节点
  const handleDelete = useCallback((id: string) => {
    if (window.confirm('确定要删除这个日程及其所有子日程吗？')) {
      deleteNode(id);
    }
  }, [deleteNode]);

  // 适应视图
  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 200 });
  }, [reactFlowInstance]);

  // 放大
  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn({ duration: 200 });
  }, [reactFlowInstance]);

  // 缩小
  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut({ duration: 200 });
  }, [reactFlowInstance]);

  // 获取正在编辑的节点
  const editingNode = editingNodeId ? schedulerManager.getNodeById(editingNodeId) : null;

  return (
    <div className="w-full h-full flex flex-col" ref={containerRef}>
      <MindMapToolbar
        onAddRoot={handleAddRoot}
        onFitView={handleFitView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div className="flex-1">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls showInteractive={false} />
          <Background color="#e5e7eb" gap={20} />
          <MiniMap
            nodeColor="#3b82f6"
            maskColor="rgba(0, 0, 0, 0.1)"
            style={{ background: 'white' }}
          />
        </ReactFlow>
      </div>

      {/* 编辑弹窗 */}
      <EditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingNodeId(null);
        }}
        onSave={handleSaveEdit}
        node={editingNode}
      />
    </div>
  );
}

// 导出带 Provider 的组件
export function MindMapView() {
  return (
    <ReactFlowProvider>
      <MindMapViewInner />
    </ReactFlowProvider>
  );
}
