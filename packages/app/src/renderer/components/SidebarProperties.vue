<template>
    <v-list>
        <v-list-item>
            <h5>Calculated properties</h5>
        </v-list-item>
        <v-list-item v-if="mw > 0.1 ">
            <span>{{ mw.toFixed(2) }}</span>
        </v-list-item>
        <v-list-item v-if="exact_mass > 0.1 ">
            <span>{{ mw.toFixed(5) }}</span>
        </v-list-item>
        <v-list-item>
            <span v-html="composition"></span>
        </v-list-item>
    </v-list>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MW, ExactMass, Composition, Document } from 'butlerov';



interface PropInterface {
    document?: Document;
}

const props = defineProps<PropInterface>()


const mw = computed(() => {
    const graphs = props.document?.objects?.filter(e => e.type == "Graph");
    if (!graphs?.length)
        return 0.00;
    return new MW(graphs[0]).compute();
})

const exact_mass = computed(() => {
    const graphs = props.document?.objects?.filter(e => e.type == "Graph");
    if (!graphs?.length)
        return 0.00;
    return new ExactMass(graphs[0]).compute();
})

const composition = computed(() => {
    const graphs = props.document?.objects?.filter(e => e.type == "Graph");
    if (!graphs?.length)
        return "";
    return new Composition(graphs[0]).compute_as_html();
})

</script>

<style lang="css" scoped>h
h2 {
    color: #555;
    font-size: 14pt;
}
ul {
    list-style-type: none;
    padding: 0;
}
</style>