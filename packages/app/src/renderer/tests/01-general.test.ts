import MainControl from "../components/FileNotebookTab.vue";
import { mount } from "@vue/test-utils";
import { expect, test } from 'vitest';
import { createVuetify } from "vuetify";

test("HelloWorld Component renders the correct text", () => {
  const wrapper = mount(MainControl, {
    global: {
      plugins: [createVuetify()],
    },
    props: {
      modelValue: {
        document: {
          mime: "application/butlerov",
        },
        filepath: "untitled",
        modified: false,
      }
    }
  });
  expect(wrapper.text()).toBe("Начните работу с нажатия этой кнопки.");
});