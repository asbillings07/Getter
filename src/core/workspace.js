export const initialWorkspace = () => ({
  usageSort: { colors: "most", fonts: "most" },
  text: { scope: "page", query: "", result: null },
  inspect: {
    section: "styles",
    all: false,
    query: "",
    snapshot: null,
    picking: true,
  },
});
export async function verifyDocument(api, scan) {
  if (!scan?.tabId || !scan.documentId) return false;
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== scan.tabId) return false;
    const result = await api.scripting.executeScript({
      target: { tabId: scan.tabId, documentIds: [scan.documentId] },
      func: () => true,
    });
    const [current] = await api.tabs.query({
      active: true,
      currentWindow: true,
    });
    return (
      current?.id === scan.tabId &&
      result.some((r) => r.documentId === scan.documentId && r.result === true)
    );
  } catch {
    return false;
  }
}
export async function takeWorkspace(api) {
  const win = await api.windows.getCurrent();
  return api.runtime.sendMessage({
    type: "getter:take-workspace",
    windowId: win.id,
  });
}
