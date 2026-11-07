import { initLocale } from "./utils/locale";
import { createZToolkit } from "./utils/ztoolkit";
import { ReadingStatusManager } from "./modules/readingStatus";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  // 1. 注册主界面文献列表中的阅读状态自定义列
  await ReadingStatusManager.registerColumn();

  // 2. 注册条目变更观察者（自动刷新列展示）
  ReadingStatusManager.registerObserver();

  // 3. 注册 PDF 阅读器阅读钩子（工具栏按钮与阅读进度自动监听）
  ReadingStatusManager.registerReaderHooks();

  // 4. 为已打开的主窗口加载 UI
  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // 为当前窗口初始化 ztoolkit
  addon.data.ztoolkit = createZToolkit();

  // 注册右键快捷标记菜单
  ReadingStatusManager.registerContextMenu();
}

async function onMainWindowUnload(_win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  ztoolkit.log("notify", event, type, ids, extraData);
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
};
