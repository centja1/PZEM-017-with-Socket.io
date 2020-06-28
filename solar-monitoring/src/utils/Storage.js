import { LocalStorageConfig } from '../constants/Constants';

const Storage = {
  getActiveTab() {
    return localStorage.getItem(LocalStorageConfig.defaultActiveTab)
      ? JSON.parse(localStorage.getItem(LocalStorageConfig.defaultActiveTab))
      : [];
  },
  setActiveTab(currentTab) {
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
