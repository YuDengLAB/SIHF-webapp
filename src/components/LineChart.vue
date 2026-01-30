<!--
 * @Author: 241164@qq.com
 * @Date: 2025-05-29 17:27:51
-->
<template>
    <div class="chart-section">
        <div ref="chartRef" class="chart-box" v-show="showChart"></div>
        <van-button block type="primary" @click="generate" :disabled="!canGenerate" class="chart-btn">生成曲线</van-button>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
const props = defineProps({
    data: Array,
    canGenerate: Boolean
})
const emit = defineEmits(['generate'])
const chartRef = ref(null)
let chart
const showChart = ref(false)

function generate() {
    if (!props.canGenerate) {
        if (window.$toast) window.$toast('请先填写完整8组浓度和电压')
        return
    }
    showChart.value = true
    emit('generate')
    nextTick(() => renderChart())
}

function renderChart() {
    if (!chartRef.value) return
    if (!chart) chart = echarts.init(chartRef.value)
    const x = props.data.map(d => d.concentration)
    const y = props.data.map(d => d.voltage)
    chart.setOption({
        grid: { left: 30, right: 20, top: 30, bottom: 30 },
        xAxis: { type: 'category', data: x, name: '浓度', nameLocation: 'middle', nameGap: 25 },
        yAxis: { type: 'value', name: '电压', nameLocation: 'middle', nameGap: 35 },
        series: [{ data: y, type: 'line', smooth: true, symbolSize: 10, lineStyle: { width: 3 } }],
        dataZoom: [
            { type: 'inside', xAxisIndex: 0, filterMode: 'none' }
        ],
        tooltip: { trigger: 'axis' }
    })
    chart.resize()
}

watch(() => props.data, () => { if (showChart.value) renderChart() }, { deep: true })
onMounted(() => { if (showChart.value) renderChart() })
onBeforeUnmount(() => { if (chart) { chart.dispose(); chart = null } })
</script>

<style scoped>
.chart-section {
    margin: 18px 12px 20px 12px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    padding: 18px 0 18px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.chart-box {
    width: 100%;
    min-width: 0;
    height: 260px;
    margin-bottom: 0;
    box-sizing: border-box;
}

.chart-btn {
    margin-top: 18px;
    width: 90%;
    font-size: 16px;
    border-radius: 8px;
    letter-spacing: 2px;
}
</style>