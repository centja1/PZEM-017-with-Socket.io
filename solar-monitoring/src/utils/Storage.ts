import { LocalStorageConfig } from '../constants/Constants';

const Storage = {
  getActiveTab() {
    return localStorage.getItem(LocalStorageConfig.defaultActiveTab)
      ? JSON.parse(
          localStorage.getItem(LocalStorageConfig.defaultActiveTab) ?? '1'
        )
      : [];
  },
  setActiveTab(currentTab: string) {
    localStorage.setItem(
      LocalStorageConfig.defaultActiveTab,
      JSON.stringify(currentTab)
    );
  },
};

async function clearCache() {
  window.localStorage.clear();
  window.sessionStorage.clear();
  const keys = await caches.keys();
  keys.forEach((key) => {
    caches.delete(key);
  });
}

export { Storage, clearCache };
