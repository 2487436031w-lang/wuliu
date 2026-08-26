<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number
  }>(),
  { size: 24 },
)
</script>

<template>
  <svg
    class="streetlight-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 4.5c-2.35 0-4.25 1.85-4.25 4.15 0 1.75.95 3.1 2.35 3.85V16.5h3.8v-3.95c1.4-.75 2.35-2.1 2.35-3.85 0-2.3-1.9-4.15-4.25-4.15z"
      fill="currentColor"
    />
    <rect x="9.5" y="16.5" width="5" height="1.6" rx="0.8" fill="currentColor" />
    <rect x="10.75" y="19" width="2.5" height="2" rx="0.6" fill="currentColor" opacity="0.88" />
  </svg>
</template>

<style scoped>
.streetlight-icon {
  display: block;
  flex-shrink: 0;
}
</style>
