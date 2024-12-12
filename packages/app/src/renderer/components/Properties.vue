<template>
<h2>Calculated properties</h2>
<ul>
    <li v-show="!!MW">MW {{ MW }}</li>
    <li v-show="!!Composition">{{ Composition }}</li>
</ul>
</template>

<script setup lang="ts">

interface Props {
    MW?: number,
    Composition?: string
}

defineProps<Props>();

</script>

<style lang="css" scoped>
h2 {
    color: #555;
    font-size: 14pt;
}
ul {
    list-style-type: none;
    padding: 0;
}
</style>