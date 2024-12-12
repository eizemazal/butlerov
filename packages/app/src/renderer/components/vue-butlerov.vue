<template>
    <div
      ref="chemical"
      style="width:100%; height: 100%;"
    ></div>
  </template>
  <script>
  import { MoleculeEditor } from "butlerov";


  export default {
    name: "VueButlerov",
    props: {
      value: {
        type: String,
        default: "",
      },
      width: {
        type: Number,
        default: 400,
      },
      height: {
        type: Number,
        default: 300,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      autofocus: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        editor: null,
        ctab: "",
        cleared_: false,
      };
    },
    watch: {
      value(v) {
        if (!v) {
          this.ctab = "";
          this.cleared_ = true;
          if (this.editor) this.editor.clear();
          return;
        }
        if (v !== this.ctab) {
          this.ctab = v;
          if (this.editor) {
            this.editor.load_mol_from_string(this.ctab);
            this.editor.zoom_to_fit(false, 0.08);
          }
        }
      },
      disabled(v) {
        if (this.editor) {
          this.editor.readonly = v;
        }
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.editor = MoleculeEditor.from_html_element(this.$refs.chemical, this.autofocus);
        console.log(this.editor);
        this.editor.onchange = this.onchange;
        if (this.value) {
          this.editor.load_mol_from_string(this.value);
          this.editor.zoom_to_fit(false, 0.08);
        }
        this.editor.readonly = this.disabled;
      });
    },
    methods: {
      onchange() {
        this.ctab = this.editor.get_mol_string();
        if (!this.cleared_) this.$emit("input", this.ctab);
        this.cleared_ = false;
      },
    },
  };
  </script>
