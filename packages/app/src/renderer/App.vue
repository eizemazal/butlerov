<script setup lang="ts">

import Editor from './components/Editor.vue'
import Properties from './components/Properties.vue';
//import {MW} from "butlerov";
//import("butlerov").catch(e => console.log(e))
</script>

<template>
    <div class="wrapper">
      <div class="main-col">
        <Editor />
      </div>
      <div class="tools-col">
        <Properties />
      </div>
    </div>
</template>

<style scoped>
body {
    margin: 0;
    padding: 0;
    font-family: "Arial", Helvetica, sans-serif;
  }
  .wrapper {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    max-width: 100%;
    max-height: 100%;
    display: flex;
  }
  .main-col {
    width: 100%;
    height: 100%;
    flex: 1;
  }
  .tools-col {
    width: 250px;
    border-left: solid 1px #bbb;
    color: #555;
    padding: 10px 0 0 10px;
  }
</style>
