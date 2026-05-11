import { useApp } from './hooks';
import { ListView } from './components/list';
import { MindMapView } from './components/mindmap';
import { FilterView } from './components/filter';
import { SettingsView } from './components/settings';
import { Header, StatusBar } from './components/layout';
import { SaveControls } from './components/common';
import { useSchedulerStore } from './stores/schedulerStore';

type ViewType = 'list' | 'mindmap' | 'filter' | 'settings';

function App() {
  const { initialized, loading, error, currentView, setCurrentView } = useApp();
  const nodeCount = useSchedulerStore((s) => s.nodes.length);
  const completedCount = useSchedulerStore(
    (s) => s.nodes.filter((n) => n.completed).length
  );

  // 加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center text-red-500">
          <p className="mb-4">加载失败: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 未初始化状态
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500">初始化中...</p>
      </div>
    );
  }

  // 渲染主应用
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with view switcher */}
      <Header
        title="FlowDay"
        subtitle="智能日程管理"
        actions={
          <div className="flex items-center gap-4">
            <SaveControls />
            <ViewSwitcher
              currentView={currentView}
              onViewChange={setCurrentView}
            />
          </div>
        }
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'list' && <ListView />}
        {currentView === 'mindmap' && <MindMapView />}
        {currentView === 'filter' && <FilterView />}
        {currentView === 'settings' && <SettingsView />}
      </main>

      {/* Status Bar */}
      <StatusBar nodeCount={nodeCount} completedCount={completedCount} />
    </div>
  );
}

// 视图切换组件
interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const views: { key: ViewType; label: string }[] = [
    { key: 'list', label: '列表' },
    { key: 'mindmap', label: '思维导图' },
    { key: 'filter', label: '筛选' },
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {views.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onViewChange(key)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              currentView === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        onClick={() => onViewChange('settings')}
        className={`p-1.5 rounded-md transition-colors ${
          currentView === 'settings'
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        title="设置"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  );
}

export default App;
