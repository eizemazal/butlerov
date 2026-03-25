import FileNotebook from "../components/FileNotebook.vue";
import { mount } from "@vue/test-utils";
import { expect, test, beforeEach } from "vitest";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const vuetify = createVuetify({
  components,
  directives,
});

// Mock window.electronAPI
beforeEach(() => {
  global.window = global.window || {};
  global.window.electronAPI = {
    on: () => {},
    showOpenDialog: async () => undefined,
    showSaveAsDialog: async () => undefined,
    writeFile: () => false,
    readFile: () => ""
  };
});

test("FileNotebook Component renders correctly", () => {
  const wrapper = mount(FileNotebook, {
    attachTo: document.body,
    global: {
      plugins: [vuetify],
      stubs: {
        VueButlerov: { template: "<div />" },
      },
    },
  });
  // FileNotebook should render with at least one tab showing "untitled"
  expect(wrapper.text()).toContain("untitled");
});