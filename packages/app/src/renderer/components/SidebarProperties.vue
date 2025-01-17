<template>
    <v-list>
        <v-list-item>
            <h5>Calculated properties</h5>
        </v-list-item>
        <v-list-item>
            <v-text-field
                label="Molecular weight"
                variant="underlined"
                :model-value="mw"
                :readonly="true"
                append-icon="mdi-content-copy"
            >
            </v-text-field>
        </v-list-item>
        <v-list-item>
            <span v-html="composition"></span>
        </v-list-item>
    </v-list>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MW, Composition, Document } from 'butlerov';



interface PropInterface {
    document?: Document;
}

const props = defineProps<PropInterface>()


const mw = computed(() => {
    const graphs = props.document?.objects?.filter(e => e.type == "Graph");
    if (!graphs?.length)
        return "";
    return new MW(graphs[0]).compute().toFixed(2);
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