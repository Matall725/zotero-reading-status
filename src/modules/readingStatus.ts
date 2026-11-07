export type ReadingStatusType = "unread" | "reading" | "finished";

export interface StatusConfig {
  key: ReadingStatusType;
  label: string;
  order: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  icon: string;
  next: ReadingStatusType;
}

export const STATUS_MAP: Record<ReadingStatusType, StatusConfig> = {
  unread: {
    key: "unread",
    label: "未读",
    order: "1",
    bgColor: "#f1f5f9",
    textColor: "#64748b",
    borderColor: "#cbd5e1",
    icon: "○",
    next: "reading",
  },
  reading: {
    key: "reading",
    label: "在读",
    order: "2",
    bgColor: "#f59e0b",
    textColor: "#ffffff",
    borderColor: "#d97706",
    icon: "●",
    next: "finished",
  },
  finished: {
    key: "finished",
    label: "已读",
    order: "3",
    bgColor: "#10b981",
    textColor: "#ffffff",
    borderColor: "#059669",
    icon: "✔",
    next: "unread",
  },
};

/**
 * 从文献 item 的 Extra 字段解析阅读状态
 */
export function getItemReadingStatus(item: Zotero.Item): ReadingStatusType {
  if (!item || !item.isRegularItem()) {
    return "unread";
  }
  try {
    const extra = (item.getField("extra") as string) || "";
    const match = extra.match(/^ReadingStatus:\s*(unread|reading|finished)\s*$/im);
    if (match) {
      return match[1].toLowerCase() as ReadingStatusType;
    }
  } catch (e) {
    ztoolkit.log("Error reading extra for item " + item?.id, e);
  }
  return "unread";
}

/**
 * 将阅读状态写入文献 item 的 Extra 字段并保存
 */
export async function setItemReadingStatus(
  item: Zotero.Item,
  status: ReadingStatusType,
): Promise<void> {
  if (!item || !item.isRegularItem()) return;

  try {
    const extra = (item.getField("extra") as string) || "";
    const lines = extra.split(/\r?\n/).filter(
      (line) => !line.match(/^ReadingStatus:\s*/i),
    );
    lines.push(`ReadingStatus: ${status}`);

    item.setField("extra", lines.join("\n").trim());
    await item.saveTx();
  } catch (e) {
    ztoolkit.log("Error saving reading status for item " + item.id, e);
  }
}

/**
 * 从 reader 实例中解析出顶层 Regular Item
 */
export async function getTopLevelItemFromReader(
  reader: any,
): Promise<Zotero.Item | null> {
  try {
    if (!reader || !reader.itemID) return null;
    const attachment = await Zotero.Items.getAsync(reader.itemID);
    if (!attachment) return null;
    if (attachment.isRegularItem()) {
      return attachment;
    }
    const topItem = attachment.topLevelItem;
    if (topItem && topItem.isRegularItem()) {
      return topItem;
    }
  } catch (e) {
    ztoolkit.log("Error getting top level item from reader", e);
  }
  return null;
}

export class ReadingStatusManager {
  private static notifierID: string | null = null;
  private static activeReaderIntervals: Map<string, any> = new Map();

  /**
   * 注册主界面文献列表中的阅读状态自定义列
   */
  static async registerColumn() {
    const columnOptions: any = {
      pluginID: addon.data.config.addonID,
      dataKey: "readingStatus",
      label: "阅读状态",
      minWidth: 80,
      width: "90px",
      showInColumnPicker: true,
      columnPickerSubMenu: false,
      // 返回带有排序序号、状态、itemID 的组合标识
      dataProvider: (item: Zotero.Item, _dataKey: string) => {
        if (!item || !item.isRegularItem()) {
          return "";
        }
        const status = getItemReadingStatus(item);
        const conf = STATUS_MAP[status];
        return `${conf.order}_${status}_${item.id}`;
      },
      renderCell: (
        _index: number,
        data: string,
        column: any,
        _isFirstColumn: boolean,
        doc: Document,
      ) => {
        const cell = doc.createElement("div");
        cell.className = `cell ${column.className || ""}`;
        cell.style.display = "flex";
        cell.style.alignItems = "center";
        cell.style.justifyContent = "center";
        cell.style.width = "100%";
        cell.style.height = "100%";

        if (!data) {
          return cell;
        }

        const parts = data.split("_");
        // format: [order, status, itemID]
        const status = (parts[1] || "unread") as ReadingStatusType;
        const itemID = parseInt(parts[2], 10);
        const conf = STATUS_MAP[status] || STATUS_MAP.unread;

        const badge = doc.createElement("span");
        badge.style.display = "inline-flex";
        badge.style.alignItems = "center";
        badge.style.justifyContent = "center";
        badge.style.gap = "4px";
        badge.style.padding = "2px 8px";
        badge.style.borderRadius = "9999px";
        badge.style.fontSize = "11px";
        badge.style.fontWeight = "600";
        badge.style.lineHeight = "1.2";
        badge.style.cursor = "pointer";
        badge.style.transition = "transform 0.1s ease, filter 0.1s ease";
        badge.style.userSelect = "none";
        badge.style.backgroundColor = conf.bgColor;
        badge.style.color = conf.textColor;
        if (conf.borderColor) {
          badge.style.border = `1px solid ${conf.borderColor}`;
        }

        badge.title = `阅读状态: ${conf.label}\n点击快速轮换: 未读 ➔ 在读 ➔ 已读`;
        badge.innerText = `${conf.icon} ${conf.label}`;

        badge.onmouseenter = () => {
          badge.style.transform = "scale(1.05)";
          badge.style.filter = "brightness(1.1)";
        };
        badge.onmouseleave = () => {
          badge.style.transform = "scale(1)";
          badge.style.filter = "none";
        };

        // 单击色块一键轮换状态
        badge.onclick = async (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
          if (!itemID) return;
          const item = Zotero.Items.get(itemID);
          if (item) {
            const nextStatus = conf.next;
            await setItemReadingStatus(item, nextStatus);
            Zotero.ItemTreeManager.refreshColumns();
          }
        };

        cell.appendChild(badge);
        return cell;
      },
    };

    try {
      if (typeof Zotero.ItemTreeManager.registerColumn === "function") {
        Zotero.ItemTreeManager.registerColumn(columnOptions);
      } else if (
        typeof (Zotero.ItemTreeManager as any).registerColumns === "function"
      ) {
        await (Zotero.ItemTreeManager as any).registerColumns(columnOptions);
      }
      ztoolkit.log("Reading status column registered successfully");
    } catch (e) {
      ztoolkit.log("Failed to register reading status column", e);
    }
  }

  /**
   * 注册右键菜单，支持批量标记
   */
  static registerContextMenu() {
    ztoolkit.Menu.register("item", {
      tag: "menu",
      id: "reading-status-menu",
      label: "📖 标记阅读状态",
      children: [
        {
          tag: "menuitem",
          id: "reading-status-menu-unread",
          label: "⚪ 标记为：未读 (Unread)",
          commandListener: async () => {
            await this.batchSetSelectedItems("unread");
          },
        },
        {
          tag: "menuitem",
          id: "reading-status-menu-reading",
          label: "🟡 标记为：在读 (Reading)",
          commandListener: async () => {
            await this.batchSetSelectedItems("reading");
          },
        },
        {
          tag: "menuitem",
          id: "reading-status-menu-finished",
          label: "🟢 标记为：已读完 (Finished)",
          commandListener: async () => {
            await this.batchSetSelectedItems("finished");
          },
        },
      ],
    });
  }

  /**
   * 批量为当前选中的条目设置阅读状态
   */
  private static async batchSetSelectedItems(status: ReadingStatusType) {
    const pane = Zotero.getActiveZoteroPane();
    if (!pane) return;
    const selectedItems = pane.getSelectedItems();
    if (!selectedItems || selectedItems.length === 0) return;

    for (const item of selectedItems) {
      if (item.isRegularItem()) {
        await setItemReadingStatus(item, status);
      }
    }
    Zotero.ItemTreeManager.refreshColumns();
  }

  /**
   * 注册 PDF 阅读器工具栏按钮与阅读进度自动监听
   */
  static registerReaderHooks() {
    try {
      if (!Zotero.Reader || !Zotero.Reader.registerEventListener) {
        return;
      }

      Zotero.Reader.registerEventListener(
        "renderToolbar",
        async (event: any) => {
          const { reader, doc, append } = event;
          if (!reader || !doc) return;

          const item = await getTopLevelItemFromReader(reader);
          if (!item) return;

          // 1. 自动标记“在读”：打开阅读器时若为未读，自动变为在读
          const currentStatus = getItemReadingStatus(item);
          if (currentStatus === "unread") {
            await setItemReadingStatus(item, "reading");
            Zotero.ItemTreeManager.refreshColumns();
          }

          // 2. 在阅读器顶部工具栏注入“阅读状态”快捷按钮
          this.injectReaderToolbarButton(reader, doc, append, item);

          // 3. 启动该 reader 的阅读进度自动检测定时器
          this.startReaderProgressMonitor(reader, item);
        },
        addon.data.config.addonID,
      );
    } catch (e) {
      ztoolkit.log("Failed to register reader hooks", e);
    }
  }

  /**
   * 在阅读器工具栏中注入状态胶囊按钮
   */
  private static injectReaderToolbarButton(
    reader: any,
    doc: Document,
    append: any,
    item: Zotero.Item,
  ) {
    const btnId = "reading-status-reader-btn";
    let btn = doc.getElementById(btnId) as HTMLButtonElement | null;

    const updateBtnAppearance = (status: ReadingStatusType) => {
      if (!btn) return;
      const conf = STATUS_MAP[status];
      btn.style.backgroundColor = conf.bgColor;
      btn.style.color = conf.textColor;
      if (conf.borderColor) {
        btn.style.border = `1px solid ${conf.borderColor}`;
      } else {
        btn.style.border = "none";
      }
      btn.title = `当前阅读状态: ${conf.label}\n点击可切换状态或手动标记已读`;
      btn.innerHTML = `${conf.icon} <span>${conf.label}</span>`;
    };

    if (!btn) {
      btn = doc.createElement("button");
      btn.id = btnId;
      btn.style.display = "inline-flex";
      btn.style.alignItems = "center";
      btn.style.gap = "4px";
      btn.style.padding = "2px 10px";
      btn.style.margin = "0 6px";
      btn.style.borderRadius = "12px";
      btn.style.cursor = "pointer";
      btn.style.fontSize = "12px";
      btn.style.fontWeight = "600";
      btn.style.userSelect = "none";
      btn.style.transition = "all 0.15s ease";

      // 单击按钮手动切换状态
      btn.onclick = async (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        const curStatus = getItemReadingStatus(item);
        const nextStatus = STATUS_MAP[curStatus].next;
        await setItemReadingStatus(item, nextStatus);
        updateBtnAppearance(nextStatus);
        Zotero.ItemTreeManager.refreshColumns();
      };

      if (typeof append === "function") {
        append(btn);
      } else {
        const container =
          doc.querySelector(".toolbar-start") ||
          doc.querySelector(".toolbar-end") ||
          doc.body;
        container?.appendChild(btn);
      }
    }

    const currentStatus = getItemReadingStatus(item);
    updateBtnAppearance(currentStatus);
  }

  /**
   * 启动阅读器翻页/滚动进度检测
   * 当翻到 90% 以上或最后 1-2 页时自动标记为已读
   */
  private static startReaderProgressMonitor(reader: any, item: Zotero.Item) {
    const readerKey = reader._instanceID || reader.tabID || String(item.id);

    // 清理已有的 interval 避免重复
    if (this.activeReaderIntervals.has(readerKey)) {
      clearInterval(this.activeReaderIntervals.get(readerKey));
    }

    const intervalId = setInterval(async () => {
      try {
        // 如果 reader 已经关闭或卸载，停止监测
        if (!reader || reader._isReaderInitialized === false) {
          clearInterval(intervalId);
          this.activeReaderIntervals.delete(readerKey);
          return;
        }

        const curStatus = getItemReadingStatus(item);
        if (curStatus === "finished") {
          // 已经是已读，无需再检测
          return;
        }

        // 获取阅读器当前页码与总页数
        const stats = reader._internalReader?._state?.primaryViewStats;
        const pageIndex = stats?.pageIndex ?? reader?.state?.pageIndex ?? 0;
        const pagesCount = stats?.pagesCount ?? 0;

        if (pagesCount > 0) {
          // 判定标准：翻到 90% 以上，或者翻到了倒数 1-2 页
          const isNearEnd =
            pageIndex + 1 >= Math.floor(pagesCount * 0.9) ||
            pageIndex >= pagesCount - 2;

          if (isNearEnd) {
            ztoolkit.log(
              `Auto marking item ${item.id} as finished. Page ${pageIndex + 1}/${pagesCount}`,
            );
            await setItemReadingStatus(item, "finished");
            Zotero.ItemTreeManager.refreshColumns();

            // 更新 reader 工具栏中的按钮显示
            const doc = reader._window?.document || reader._iframeWindow?.document;
            const btn = doc?.getElementById("reading-status-reader-btn");
            if (btn) {
              const conf = STATUS_MAP.finished;
              btn.style.backgroundColor = conf.bgColor;
              btn.style.color = conf.textColor;
              btn.innerHTML = `${conf.icon} <span>${conf.label}</span>`;
            }
          }
        }
      } catch (err) {
        // 捕获异常
      }
    }, 2500);

    this.activeReaderIntervals.set(readerKey, intervalId);
  }

  /**
   * 监听事件：文献修改、注记高亮添加（添加注记时自动标为在读）
   */
  static registerObserver() {
    const observer = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
      ) => {
        if (!addon?.data.alive) {
          this.unregisterObserver();
          return;
        }

        // 1. 文献修改或删除时刷新自定义列
        if (
          type === "item" &&
          (event === "modify" || event === "add" || event === "trash")
        ) {
          Zotero.ItemTreeManager.refreshColumns();

          // 2. 如果用户在 PDF 里划线、加高亮或添加笔记（annotation），自动将所属文献标记为“在读”
          if (event === "add" && ids && ids.length > 0) {
            try {
              for (const id of ids) {
                const noteItem = Zotero.Items.get(id as number);
                if (noteItem && noteItem.isAnnotation()) {
                  const parentItem = noteItem.parentItem?.topLevelItem;
                  if (parentItem && parentItem.isRegularItem()) {
                    const status = getItemReadingStatus(parentItem);
                    if (status === "unread") {
                      await setItemReadingStatus(parentItem, "reading");
                      Zotero.ItemTreeManager.refreshColumns();
                    }
                  }
                }
              }
            } catch (e) {
              // ignore
            }
          }
        }
      },
    };

    this.notifierID = Zotero.Notifier.registerObserver(observer, ["item"]);

    Zotero.Plugins.addObserver({
      shutdown: ({ id }) => {
        if (id === addon.data.config.addonID) {
          this.unregisterObserver();
        }
      },
    });
  }

  private static unregisterObserver() {
    if (this.notifierID) {
      Zotero.Notifier.unregisterObserver(this.notifierID);
      this.notifierID = null;
    }
    // 清除所有计时器
    for (const id of this.activeReaderIntervals.values()) {
      clearInterval(id);
    }
    this.activeReaderIntervals.clear();
  }
}

function docWin(reader: any): Window | null {
  return reader?._window || reader?._iframeWindow || null;
}
