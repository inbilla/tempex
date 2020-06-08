Vue.component('app', {
    template: `
<div>
    <navbar></navbar>
    <graph series="avg_temperature" title="Temperature"></graph>
    <graph series="avg_humidity" title="Humidity"></graph>
</div>
`})