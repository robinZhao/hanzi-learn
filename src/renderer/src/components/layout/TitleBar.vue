<template>
  <div class="title-bar">
    <div class="title-bar-drag">
      <span class="app-title">汉字学习</span>
    </div>
    <div class="title-bar-controls">
      <button class="ctrl-btn" @click="minimize">
        <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="2" fill="currentColor"/></svg>
      </button>
      <button class="ctrl-btn" @click="maximize">
        <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
      </button>
      <button class="ctrl-btn close-btn" @click="close">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
function minimize() { window.api.window.minimize() }
function maximize() { window.api.window.maximize() }
function close() { window.api.window.close() }
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  height: 36px;
  background: var(--bg-sidebar);
  color: #ecf0f1;
  flex-shrink: 0;
}
.title-bar-drag {
  flex: 1;
  -webkit-app-region: drag;
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 16px;
}
.app-title {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 1px;
}
.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}
.ctrl-btn {
  width: 46px;
  height: 36px;
  border: none;
  background: transparent;
  color: #bdc3c7;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.ctrl-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.close-btn:hover {
  background: #e74c3c;
  color: #fff;
}
</style>
