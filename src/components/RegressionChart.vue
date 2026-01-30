<template>
    <div class="chart-section">
        <div ref="chartRef" class="chart-box" v-show="showChart"></div>
        <div v-if="regression && showChart" class="regression-info">
            <p>回归方程：y = {{ regression.a.toFixed(3) }}x + {{ regression.b.toFixed(3) }}</p>
            <p>R² = {{ regression.r2.toFixed(3) }}</p>
        </div>
        <van-button block type="success" @click="fit" :disabled="!canFit" class="chart-btn">拟合生成</van-button>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
const props = defineProps({
    data: Array,
    regression: Object,
    canFit: Boolean
})
const emit = defineEmits(['fit'])
const chartRef = ref(null)
let chart
const showChart = ref(false)

function linearRegression(data) {
    const n = data.length
    const x = data.map(d => Number(d.concentration))
    const y = data.map(d => Number(d.voltage))
    const xMean = x.reduce((a, b) => a + b, 0) / n
    const yMean = y.reduce((a, b) => a + b, 0) / n
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
        num += (x[i] - xMean) * (y[i] - yMean)
        den += (x[i] - xMean) ** 2
    }
    const a = num / den
    const b = yMean - a * xMean
    let ssTot = 0, ssRes = 0
    for (let i = 0; i < n; i++) {
        const yPred = a * x[i] + b
        ssTot += (y[i] - yMean) ** 2
        ssRes += (y[i] - yPred) ** 2
    }
    const r2 = 1 - ssRes / ssTot
    return { a, b, r2 }
}

function fit() {
    if (!props.canFit) {
        if (window.$toast) window.$toast('请先填写完整8组浓度和电压')
        return
    }
    showChart.value = true
    const reg = linearRegression(props.data)
    emit('fit', reg)
    nextTick(() => renderChart(reg))
}

function renderChart(reg = props.regression) {
    if (!chartRef.value) return
    if (!chart) chart = echarts.init(chartRef.value)
    const x = props.data.map(d => d.concentration)
    const y = props.data.map(d => d.voltage)
    const fitY = x.map(xi => reg.a * xi + reg.b)
    chart.setOption({
        grid: { left: 30, right: 20, top: 30, bottom: 30 },
        xAxis: { type: 'category', data: x, name: '浓度', nameLocation: 'middle', nameGap: 25 },
        yAxis: { type: 'value', name: '电压', nameLocation: 'middle', nameGap: 35 },
        series: [
            { data: y, type: 'scatter', name: '原始点' },
            { data: fitY, type: 'line', name: '拟合线', smooth: true }
        ],
        dataZoom: [
            { type: 'inside', xAxisIndex: 0, filterMode: 'none' }
        ],
        tooltip: { trigger: 'axis' }
    })
    chart.resize()
}

watch(() => props.data, () => { if (showChart.value) renderChart(props.regression) }, { deep: true })
watch(() => props.regression, () => { if (showChart.value) renderChart(props.regression) }, { deep: true })
onMounted(() => { if (showChart.value) renderChart(props.regression) })
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

.regression-info {
    margin: 12px 0 0 0;
    color: #222;
    font-size: 15px;
    text-align: center;
}
</style>