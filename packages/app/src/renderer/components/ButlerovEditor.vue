<template>
    <div ref="container" class="w-100 h-100 m-0"></div>
</template>
<script setup lang="ts">
import { onMounted, useTemplateRef, ref, watch, computed } from 'vue';
import { MoleculeEditor, darkTheme, Document, lightTheme } from 'butlerov';
import { useTheme } from 'vuetify';

const container = useTemplateRef("container");

interface Props {
  modelValue: Document,
}

const emit = defineEmits(['update:modelValue']);
const theme = useTheme();

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => {
    return {
      mime: "application/butlerov",
      objects: [
        {
          type: "Graph",
          vertices:[], edges: []
      }]
    }
  }
});

const editor = ref<MoleculeEditor>();

const theme_name = computed(() => theme.global.name.value);

defineExpose({editor});

watch(() => props.modelValue.objects, (v) => {
  if (editor.value) {
    editor.value.document.objects = v;
  }
}, {deep: true})

watch(() => props.modelValue.style, (v) => {
  if (editor.value?.style && v)
    editor.value.style = v;
}, {deep:true})

watch(theme_name, (v) => {
  if (editor.value) {
    if (v == 'dark')
      editor.value.theme = darkTheme;
    else if (v == 'light')
    editor.value.theme = lightTheme;
  }
})


onMounted(() => {
    if (!container.value) {
        return;
    }
    editor.value = new MoleculeEditor({stage: container.value, mode: "structure"});
    editor.value.theme = darkTheme;
    editor.value.document = props.modelValue;
    setTimeout(() => editor.value?.center_view(), 100);
    editor.value.onchange = () => {
      if (!editor.value)
        return;
      const v = editor.value.document;
      v.style = editor.value.style;
      emit("update:modelValue", v);
    }
})


</script>

<style lang="css">
  #editor:focus {
    outline: none;
  }
</style>