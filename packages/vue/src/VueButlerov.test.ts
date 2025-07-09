import { test, expect, describe, beforeEach } from 'vitest';
//import { userEvent } from "@vitest/browser/context";
//import { render } from 'vitest-browser-vue';
import VueButlerov from './VueButlerov.vue';
import { mount } from '@vue/test-utils'
//import { Document, Graph } from '@butlerov-chemistry/core';
//import { mount } from '@vue/test-utils';

describe('VueButlerov, test structure mode', async () => {

  let wrapper: any;
  beforeEach(() => {

    wrapper = mount(VueButlerov, {
      modelValue: undefined,
      props: {
        'onUpdate:modelValue': (e) => wrapper.setProps({ modelValue: e })
      }
    })
  })



  /*test('control is rendered, scheme mode', async () => {
    const control = render(VueButlerov, {
      props: {
        mode: "scheme",
        modelValue: {
          objects: [],
        }
      },
    });
    const input = control.getByTestId('butlerov-container');
    expect(input.element()).toBeTruthy();
  });

  test('control is rendered, structure mode', async () => {
    const control = render(VueButlerov, {
      props: {
      },
    });
    const input = control.getByTestId('butlerov-container');
    expect(input.element()).toBeTruthy();
  });*/


  /*
    test('simple edit actions, native mode for scheme', async () => {
      const default_value = {
        objects: [],
      }
      const control = await render(VueButlerov, {
        props: { modelValue: default_value, mode: "scheme" },
      })
      const input = await control.getByTestId('butlerov-container');
      await userEvent.click(input, { position: { x: 150, y: 150 } });
      let value = control.emitted('update:modelValue')![0]![0] as VueButlerovSchemaModel;
      expect(value.objects?.length).toBe(1);
      let graph = value.objects![0] as Graph;
      expect(graph.edges.length).toBe(1);
      expect(graph.vertices.length).toBe(2);
      expect(graph.vertices[0].x).toBeCloseTo(150, -1);
      expect(graph.vertices[0].y).toBeCloseTo(150, -1);
      const midx = (graph.vertices[0].x + graph.vertices[1].x) / 2;
      const midy = (graph.vertices[0].y + graph.vertices[1].y) / 2;
      console.log({ position: { x: midx, y: midy } });
      await userEvent.hover(input, { position: { x: midx, y: midy } });
      console.log("punt");
      await userEvent.keyboard(' rp');
      console.log("aaa");
      value = await control.emitted('update:modelValue')![0]![0] as VueButlerovSchemaModel;
      console.log(value);
      expect(value.objects?.length).toBe(1);
      graph = value.objects![0] as Graph;
      expect(graph.edges.length).toBe(6);
      expect(graph.vertices.length).toBe(6);
    });
  */
  test('simple edit actions, native mode for structure', async () => {


    //const control = render(VueButlerov, {
    //  props: { mode: "structure" },
    //})
    //const input = control.getByTestId('butlerov-container');


    await wrapper.trigger('click', { position: { x: 150, y: 150 } });
    console.log(wrapper);
    expect(wrapper.props.modelValue).toBe(1);

    //let graph = control.emitted('update:modelValue')![0]![0] as Graph;
    //const graph = control.props("modelValue");
    //expect(graph.edges.length).toBe(1);
    //expect(graph.vertices.length).toBe(2);
    //expect(graph.vertices[0].x).toBeCloseTo(150, -1);
    //expect(graph.vertices[0].y).toBeCloseTo(150, -1);
    /*await userEvent.hover(input, { position: { x: graph.vertices[0].x, y: graph.vertices[0].y } });
    await userEvent.click(input, { position: { x: graph.vertices[0].x, y: graph.vertices[0].y } });
    const midx = (graph.vertices[0].x + graph.vertices[1].x) / 2;
    const midy = (graph.vertices[0].y + graph.vertices[1].y) / 2;
    await userEvent.hover(input, { position: { x: midx, y: midy } });
    console.log("hover");
    await userEvent.keyboard(' rp');
    console.log(" rp'ed");
    //control.props("modelValue");
    //graph = await control.emitted('update:modelValue')![0]![0] as Graph;
    console.log("awaited, got")
    console.log(graph);
    expect(graph.edges.length).toBe(6);
    expect(graph.vertices.length).toBe(6);*/
  });
});
