<template>
    <div class="regression-chart-container">
        <div ref="chartRef" class="chart-box" v-show="showChart"></div>
        <div v-if="!showChart" class="placeholder">
            Click "Fitting" to generate regression chart
        </div>
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
        if (window.$toast) window.$toast('Please complete all concentration and voltage data first')
        return
    }
    
    const regression = linearRegression(props.data)
    emit('fit', regression)
    showChart.value = true
    nextTick(() => renderChart(regression))
}

function renderChart(regressionData = null) {
    if (!chartRef.value) return
    if (!chart) chart = echarts.init(chartRef.value)
    
    const data = props.data.filter(d => d.concentration && d.voltage)
    const x = data.map(d => Number(d.concentration))
    const y = data.map(d => Number(d.voltage))
    
    // 计算回归线数据点
    let regressionLine = []
    if (regressionData || props.regression.a) {
        const reg = regressionData || props.regression
        const minX = Math.min(...x)
        const maxX = Math.max(...x)
        const step = (maxX - minX) / 50
        for (let i = 0; i <= 50; i++) {
            const xVal = minX + i * step
            const yVal = reg.a * xVal + reg.b
            regressionLine.push([xVal, yVal])
        }
    }
    
    const series = [
        {
            name: 'Data Points',
            type: 'scatter',
            data: x.map((xVal, i) => [xVal, y[i]]),
            symbolSize: 10,
            itemStyle: { color: '#1976d2' }
        }
    ]
    
    if (regressionLine.length > 0) {
        series.push({
            name: 'Regression Line',
            type: 'line',
            data: regressionLine,
            lineStyle: { color: '#f57c00', width: 2 },
            symbol: 'none',
            smooth: false
        })
    }
    
    chart.setOption({
        grid: { left: 60, right: 30, top: 30, bottom: 60 },
        xAxis: { 
            type: 'value', 
            name: 'Concentration (mM)', 
            nameLocation: 'middle', 
            nameGap: 40,
            nameTextStyle: { fontSize: 14, fontWeight: 'bold' }
        },
        yAxis: { 
            type: 'value', 
            name: 'Voltage (V)', 
            nameLocation: 'middle', 
            nameGap: 45,
            nameTextStyle: { fontSize: 14, fontWeight: 'bold' }
        },
        series: series,
        tooltip: { 
            trigger: 'item',
            formatter: function(params) {
                if (params.seriesName === 'Data Points') {
                    return `Concentration: ${params.value[0]}<br/>Voltage: ${params.value[1]}`
                }
                return `${params.seriesName}<br/>Concentration: ${params.value[0].toFixed(3)}<br/>Voltage: ${params.value[1].toFixed(3)}`
            }
        },
        legend: {
            data: ['Data Points', 'Regression Line'],
            top: 'top'
        }
    })
    chart.resize()
}

// 暴露fit方法给父组件调用
defineExpose({ fit })

watch(() => props.data, () => { 
    if (showChart.value && props.regression.a) {
        renderChart()
    }
}, { deep: true })

onMounted(() => { 
    if (showChart.value) renderChart() 
})

onBeforeUnmount(() => { 
    if (chart) { 
        chart.dispose()
        chart = null 
    } 
})
</script>

<style scoped>
.regression-chart-container {
    width: 100%;
    height: 300px;
    background: white;
    border: 1px solid #CCCCCC;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.chart-box {
    width: 100%;
    height: 100%;
    border-radius: 6px;
}

.placeholder {
    color: #999999;
    font-size: 14px;
    text-align: center;
    font-style: italic;
    padding: 20px;
}

@media (max-width: 768px) {
    .regression-chart-container {
        height: 250px;
    }
    
    .placeholder {
        font-size: 12px;
        padding: 16px;
    }
}
</style>
