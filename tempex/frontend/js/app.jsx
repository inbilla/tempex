Vue.component('app', {
    template: `
<div>
    <navbar></navbar>
    <graph series="avg_temperature"></graph>
    <graph series="avg_humidity"></graph>
</div>
`})