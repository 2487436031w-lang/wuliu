<script setup lang="ts">
import StreetlightMap from '../components/StreetlightMap.vue'
</script>

<template>
  <div class="ui-page ui-page-fill map-page">
    <StreetlightMap variant="full" />
  </div>
</template>

<style scoped>
.map-page {
  padding-top: 0;
}
</style>
