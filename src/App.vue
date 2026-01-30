<template>
    <div class="app-container">
        <!-- 头部区域 -->
        <div class="header-section">
            <img src="./image/image.png" alt="Logo" class="header-logo">
            
        </div>

        <!-- 标准曲线折叠区 -->
        <div class="standard-curve-section">
            <div class="collapse-header" @click="toggleStandardCurve">
                <span class="collapse-title">Standard Curve</span>
                <span class="collapse-subtitle">(Click to {{ showStandardCurve ? 'Collapse' : 'Expand' }})</span>
                <span class="collapse-arrow" :class="{ 'expanded': showStandardCurve }">▼</span>
            </div>
            
            <div v-show="showStandardCurve" class="collapse-content">
                <!-- 校准说明 -->
                <div class="instructions">
                    <h3>Instructions</h3>
                    <ol>
                        <li>Prepare a series of known-concentration standards (e.g., 0, 0.1, 0.2, 0.4, 0.6, 0.8, 1 mM).</li>
                        <li>Enter 'Standard Concentration (mM)' and 'Device-Measured Voltage (V)' below.</li>
                        <li>The system will auto-fit R² = a*C + b, and display R².</li>
                        <li>Click "Save Calibration" to apply these parameters and enable real-time mode.</li>
                    </ol>
                </div>

                <!-- 数据输入表格与标准曲线图表 - 水平布局 -->
                <div class="data-chart-layout">
                    <!-- 数据输入表格 -->
                    <div class="data-input-table">
                        <h3>Data Input Table</h3>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Concentration (mM)</th>
                                        <th>Voltage (V)</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(row, index) in standardData" :key="index">
                                        <td>
                                            <input 
                                                v-model="row.concentration" 
                                                type="number" 
                                                step="0.001"
                                                placeholder="0.000"
                                            >
                                        </td>
                                        <td>
                                            <input 
                                                v-model="row.voltage" 
                                                type="number" 
                                                step="0.001"
                                                placeholder="0.000"
                                            >
                                        </td>
                                        <td>
                                            <div class="action-buttons">
                                                <button 
                                                    class="read-btn" 
                                                    @click="readVoltage(index)"
                                                    :disabled="readingRow !== -1"
                                                >
                                                    <span v-if="readingRow === index">
                                                        {{ standardProgress.current }}/{{ standardProgress.total }}
                                                    </span>
                                                    <span v-else>Read</span>
                                                </button>
                                                <button class="delete-btn" @click="deleteRow(index)">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <button class="add-row-btn" @click="addRow">Add Row</button>
                        </div>
                    </div>

                    <!-- 标准曲线图表 -->
                    <div class="standard-curve-chart">
                        <h3>Standard Curve (Scatter + Line)</h3>
                        <RegressionChart 
                            ref="regressionChartRef"
                            :data="validStandardData" 
                            @fit="handleFit" 
                            :regression="regression" 
                            :can-fit="canFit"
                        />
                        <div class="results-section">
                            <div class="results-display">
                                <span>Results: V = {{ regression.a.toFixed(3) }}*C + {{ regression.b.toFixed(3) }}</span>
                                <span>R² = {{ regression.r2.toFixed(3) }}</span>
                            </div>
                            
                            <!-- 数据状态提示 -->
                            <div v-if="!canFit" class="data-status-tip">
                                <small style="color: #E74C3C;">
                                    At least 2 valid data points required for fitting (Current: {{ validStandardData.length }}/2)
                                </small>
                            </div>
                            
                            <div class="action-buttons-row">
                                <button class="fitting-btn" @click="performFitting" :disabled="!canFit">
                                    Fitting {{ canFit ? '' : `(Need ${2 - validStandardData.length} more data)` }}
                                </button>
                                <button class="save-calibration-btn" @click="saveCalibration" :disabled="!regression.a">Save Calibration</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 实时测量区 -->
        <div class="realtime-measurement">
            <h2>Real-time Measurement</h2>
            
            <div class="measurement-layout">
                <!-- 左侧控制面板 -->
                <div class="measurement-control">
                    <div class="control-form">
                        <div class="form-group">
                            <label>Sample ID:</label>
                            <input v-model="currentSample.id" type="text" placeholder="Enter ID">
                        </div>
                        <div class="form-group">
                            <label>Time:</label>
                            <input v-model="currentSample.time" type="text" placeholder="Auto filled" readonly>
                        </div>
                        <div class="form-group">
                            <label>Concentration:</label>
                            <input v-model="concentration" type="text" placeholder="Auto calculated" readonly>
                        </div>
                        
                        <!-- Progress Display -->
                        <div v-if="isCollecting" class="progress-section">
                            <div class="collect-progress">
                                Collection Progress: {{ collectProgress.current }}/{{ collectProgress.total }}
                            </div>
                        </div>
                        
                        <!-- Collection Results Display -->
                        <div v-if="voltage" class="collect-result">
                            Average Voltage: {{ voltage }}
                        </div>
                        <div v-if="concentration" class="collect-result">
                            Calculated Concentration: {{ concentration }} mM
                        </div>
                    </div>
                    
                    <div class="control-actions">
                        <button 
                            class="read-save-btn" 
                            @click="startSingleCollection"
                            :disabled="!calibrationSaved || isCollecting"
                            :class="{ 'collecting': isCollecting }"
                        >
                            <span v-if="isCollecting">
                                Collecting...
                            </span>
                            <span v-else>
                                Read
                            </span>
                        </button>
                    </div>
                </div>
                
                <!-- 右侧采样历史表格 -->
                <div class="sampling-history">
                    <div class="history-header">
                        <div class="col">Sample ID</div>
                        <div class="col">Concentration (mM)</div>
                        <div class="col">Time</div>
                        <div class="col">
                            <button class="clear-btn" @click="clearSampleHistory" :disabled="sampleHistory.length === 0">
                                Clear
                            </button>
                        </div>
                    </div>
                    <div class="history-content">
                        <div v-for="sample in sampleHistory" :key="sample.id" class="history-row">
                            <div class="col">{{ sample.id }}</div>
                            <div class="col">{{ sample.concentration }}</div>
                            <div class="col">{{ sample.time }}</div>
                            <div class="col"></div>
                        </div>
                        <div v-if="sampleHistory.length === 0" class="empty-state">
                            No samples collected yet
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 下载报告区 -->
        <div class="download-section">
            <div class="download-actions">
                <button class="download-btn" @click="downloadReport">Download Report</button>
                <button class="reset-btn" @click="resetSampleCounter">Reset Sample Counter</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import RegressionChart from './components/RegressionChart_new.vue'
import collectApi from './assets/collectApi.js'

// 标准曲线相关数据
const showStandardCurve = ref(false)
const standardData = ref([
    { concentration: '', voltage: '' },
    { concentration: '', voltage: '' },
    { concentration: '', voltage: '' },
    { concentration: '', voltage: '' },
    { concentration: '', voltage: '' },
    { concentration: '', voltage: '' }
])
const regression = ref({ a: 0, b: 0, r2: 0 })
const calibrationSaved = ref(false)
const regressionChartRef = ref(null)

// 实时测量相关数据
const isCollecting = ref(false)
const collectInterval = ref(null)
const sampleCounter = ref(1) // Sample counter
const collectProgress = ref({ current: 0, total: 10 }) // Collection progress
const readingRow = ref(-1) // Index of row being read, -1 means none
const standardProgress = ref({ current: 0, total: 10 }) // Standard curve reading progress
const voltage = ref('') // Average voltage
const concentration = ref('') // Calculated concentration
const currentSample = ref({
    id: 'Sample1',
    time: '',
    concentration: ''
})
const sampleHistory = ref([])

// 计算属性
const validStandardData = computed(() => 
    standardData.value.filter(row => row.concentration && row.voltage)
)

const canFit = computed(() => 
    validStandardData.value.length >= 2
)

// 标准曲线方法
function toggleStandardCurve() {
    showStandardCurve.value = !showStandardCurve.value
}

function addRow() {
    standardData.value.push({ concentration: '', voltage: '' })
}

function deleteRow(index) {
    if (standardData.value.length > 1) {
        standardData.value.splice(index, 1)
    }
}

function readVoltage(index) {
    if (readingRow.value !== -1) return // If a row is already being read, don't allow
    
    readingRow.value = index
    standardProgress.value = { current: 0, total: 10 }
    
    // Read voltage value
    collectApi.startCollection(
        (progress) => {
            standardProgress.value = {
                current: progress.current,
                total: progress.total
            }
            console.log(`Reading voltage for row ${index + 1}: ${progress.current}/${progress.total}`)
        },
        (result) => {
            if (result.success) {
                standardData.value[index].voltage = result.average
                if (window.$toast) {
                    window.$toast(`Row ${index + 1} voltage read: ${result.average}V`)
                }
            } else {
                if (window.$toast) {
                    window.$toast(`Row ${index + 1} read failed: ${result.error}`)
                }
            }
            
            // Reset reading status
            readingRow.value = -1
            standardProgress.value = { current: 0, total: 10 }
        }
    )
}

function performFitting() {
    if (regressionChartRef.value) {
        regressionChartRef.value.fit()
    }
}

function handleFit(fitResult) {
    regression.value = fitResult
}

function saveCalibration() {
    if (regression.value.a) {
        calibrationSaved.value = true
        if (window.$toast) {
            window.$toast('Calibration saved successfully!')
        }
    }
}

// Real-time measurement methods
function startSingleCollection() {
    if (!calibrationSaved.value) {
        if (window.$toast) {
            window.$toast('Please save calibration first!')
        }
        return
    }
    
    // 开始单次采集，采集完成后自动保存
    performSingleCollection().then(() => {
        if (voltage.value && concentration.value) {
            autoSaveSample()
        }
    })
}

function clearSampleHistory() {
    sampleHistory.value = []
    if (window.$toast) {
        window.$toast('Sample history cleared!')
    }
}

function performSingleCollection() {
    return new Promise((resolve) => {
        if (isCollecting.value) {
            resolve()
            return
        }

        isCollecting.value = true
        voltage.value = ''
        concentration.value = ''
        currentSample.value.concentration = ''
        currentSample.value.time = ''
        collectProgress.value = { current: 0, total: 10 }

        // Start collection
        collectApi.startCollection(
            // Data callback
            (progress) => {
                collectProgress.value = {
                    current: progress.current,
                    total: progress.total
                }
                console.log(`Collection progress: ${progress.current}/${progress.total}, current voltage: ${progress.voltage}`)
            },
            // Completion callback
            (result) => {
                isCollecting.value = false

                if (result.success) {
                    voltage.value = result.average
                    
                    // Calculate concentration based on regression equation
                    if (regression.value && regression.value.a) {
                        const calculatedConcentration = (result.average - regression.value.b) / regression.value.a
                        concentration.value = calculatedConcentration.toFixed(3)
                        currentSample.value.concentration = concentration.value
                    }
                    
                    currentSample.value.time = new Date().toLocaleTimeString()

                    if (window.$toast) {
                        window.$toast(`Collection completed! Average voltage: ${result.average}V`)
                    }

                    // Auto save the sample after successful collection
                    setTimeout(() => {
                        autoSaveSample()
                    }, 100)
                } else {
                    console.error('Collection failed:', result.error)
                    if (window.$toast) {
                        window.$toast(`Collection failed: ${result.error}`)
                    }
                }
                
                resolve()
            }
        ).then(result => {
            if (!result.success) {
                isCollecting.value = false
                if (window.$toast) {
                    window.$toast(`Failed to start collection: ${result.error}`)
                }
                resolve()
            }
        })
    })
}

async function autoSaveSample() {
    if (currentSample.value.id && currentSample.value.concentration) {
        const savedConcentration = currentSample.value.concentration
        
        sampleHistory.value.unshift({
            id: currentSample.value.id,
            concentration: currentSample.value.concentration,
            time: currentSample.value.time
        })
        
        // Extract number from current Sample ID if exists
        const currentNum = parseInt(currentSample.value.id.replace(/\D/g, '')) || sampleCounter.value
        
        // Update counter to current number + 1, ensure next ID increments
        sampleCounter.value = currentNum + 1
        currentSample.value.id = `Sample${sampleCounter.value}`
        
        // Clear all measurement related data, prepare for next measurement
        voltage.value = ''
        concentration.value = ''
        currentSample.value.concentration = ''
        currentSample.value.time = ''
        
        console.log(`Auto saved sample ${currentNum}: concentration ${savedConcentration}`)
        if (window.$toast) {
            window.$toast(`Sample ${currentNum} auto-saved successfully!`)
        }
    }
}

function startCollection() {
    if (!calibrationSaved.value) {
        if (window.$toast) {
            window.$toast('Please save calibration first!')
        }
        return
    }
    
    // If there's already concentration value, save sample
    if (voltage.value && concentration.value) {
        saveSample()
        return
    }
    
    performSingleCollection()
}

function stopCollection() {
    isCollecting.value = false
    collectProgress.value = { current: 0, total: 10 } // Reset progress
    console.log('Collection stopped')
    
    if (window.$toast) {
        window.$toast('Collection stopped')
    }
}

function saveSample() {
    if (currentSample.value.id && currentSample.value.concentration) {
        sampleHistory.value.unshift({
            id: currentSample.value.id,
            concentration: currentSample.value.concentration,
            time: currentSample.value.time
        })
        
        // 从当前Sample ID中提取数字，如果有的话
        const currentNum = parseInt(currentSample.value.id.replace(/\D/g, '')) || sampleCounter.value
        
        // 更新计数器为当前数字+1，确保下一个ID是递增的
        sampleCounter.value = currentNum + 1
        currentSample.value.id = `Sample${sampleCounter.value}`
        
        // 清空所有测量相关数据，准备下次测量
        voltage.value = ''
        concentration.value = ''
        currentSample.value.concentration = ''
        currentSample.value.time = ''
        
        if (window.$toast) {
            window.$toast('Sample saved successfully!')
        }
    }
}

function downloadReport() {
    // 生成报告数据
    const reportData = {
        calibration: {
            regression: regression.value,
            standardData: validStandardData.value
        },
        samples: sampleHistory.value,
        timestamp: new Date().toISOString()
    }
    
    // 创建下载链接
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `NO3_Analysis_Report_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
}

// 重置样本计数器
function resetSampleCounter() {
    sampleCounter.value = 1
    currentSample.value.id = 'Sample1'
    voltage.value = ''
    concentration.value = ''
    currentSample.value.concentration = ''
    currentSample.value.time = ''
    if (window.$toast) {
        window.$toast('Sample counter reset!')
    }
}

// 清理定时器
onMounted(() => {
    return () => {
        if (collectInterval.value) {
            clearInterval(collectInterval.value)
        }
    }
})
</script>

<style scoped>
/* 移动端整体容器 */
.app-container {
    min-height: 100vh;
    background: #F5F5F5;
    font-family: 'PingFang SC', 'Helvetica Neue', Arial, 'Microsoft YaHei', sans-serif;
    color: #333333;
    padding: 0;
    margin: 0;
}

/* 头部区域 */
.header-section {
    background: #FFFFFF;
    padding: 0;
    text-align: center;
    border-bottom: 1px solid #CCCCCC;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    overflow: hidden;
}

.header-logo {
    width: 100vw;
    height: auto;
    object-fit: contain;
    margin: 0 -16px;
    display: block;
}

.page-title {
    font-size: 18px;
    line-height: 22px;
    font-weight: 700;
    color: #000000;
    margin: 0;
}

/* 标准曲线折叠区 */
.standard-curve-section {
    background: #FFFFFF;
    border: 1px solid #CCCCCC;
    border-radius: 6px;
    margin: 12px 16px;
}

.collapse-header {
    background: #3498DB;
    color: #FFFFFF;
    padding: 12px 16px;
    border-radius: 6px 6px 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
}

.collapse-title {
    font-size: 16px;
    line-height: 20px;
    font-weight: 600;
}

.collapse-subtitle {
    font-size: 14px;
    opacity: 0.9;
}

.collapse-arrow {
    font-size: 14px;
    transition: transform 0.3s ease;
}

.collapse-arrow.expanded {
    transform: rotate(180deg);
}

.collapse-content {
    background: #F5F5F5;
    padding: 16px;
}

/* 指令说明 */
.instructions h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: #333333;
}

.instructions ol {
    font-size: 14px;
    line-height: 20px;
    color: #333333;
    margin: 0;
    padding-left: 20px;
}

.instructions li {
    margin-bottom: 8px;
}

/* 数据表格与图表水平布局 */
.data-chart-layout {
    display: flex;
    gap: 20px;
    margin-top: 20px;
}

/* 数据输入表格 */
.data-input-table {
    flex: 0 0 400px;
}

.data-input-table h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: #333333;
}

.table-container {
    background: #FFFFFF;
    border: 1px solid #CCCCCC;
    border-radius: 6px;
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

th {
    background: #F5F5F5;
    padding: 10px 8px;
    font-weight: 600;
    color: #333333;
    border-bottom: 1px solid #CCCCCC;
    text-align: center;
}

td {
    padding: 8px;
    border-bottom: 1px solid #EEEEEE;
    text-align: center;
}

input[type="number"] {
    width: 100%;
    border: 1px solid #CCCCCC;
    border-radius: 4px;
    padding: 6px 8px;
    background: #FAFAFA;
    font-size: 14px;
    text-align: center;
}

input[type="number"]:focus {
    border-color: #3498DB;
    outline: none;
}

.action-buttons {
    display: flex;
    gap: 4px;
    justify-content: center;
}

.read-btn, .delete-btn {
    border: none;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
}

.read-btn {
    background: #3498DB;
    color: #FFFFFF;
}

.delete-btn {
    background: #E67E22;
    color: #FFFFFF;
}

.add-row-btn {
    width: 100%;
    border: none;
    background: #3498DB;
    color: #FFFFFF;
    padding: 10px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 0 0 6px 6px;
    cursor: pointer;
}

/* 标准曲线图表 */
.standard-curve-chart {
    flex: 1;
}

.standard-curve-chart h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: #333333;
}

.results-section {
    margin-top: 12px;
}

.results-display {
    background: #FFFFFF;
    border: 1px solid #CCCCCC;
    border-radius: 4px;
    padding: 12px;
    font-size: 14px;
    line-height: 20px;
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
}

.action-buttons-row {
    display: flex;
    gap: 12px;
    justify-content: center;
}

.fitting-btn, .save-calibration-btn {
    border: none;
    border-radius: 4px;
    padding: 10px 16px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
}

.fitting-btn {
    background: #3498DB;
    color: #FFFFFF;
}

.save-calibration-btn {
    background: #2ECC71;
    color: #FFFFFF;
}

.fitting-btn:disabled, .save-calibration-btn:disabled {
    background: #CCCCCC;
    cursor: not-allowed;
}

/* 实时测量区 */
.realtime-measurement {
    background: #FFFFFF;
    border: 1px solid #CCCCCC;
    border-radius: 6px;
    margin: 12px 16px;
    padding: 16px;
}

.realtime-measurement h2 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 16px 0;
    color: #333333;
}

/* 测量布局 - 左右分栏 */
.measurement-layout {
    display: flex;
    gap: 20px;
    align-items: flex-start;
}

/* 左侧控制面板 */
.measurement-control {
    flex: 0 0 300px;
    background: #F5F5F5;
    border: 1px solid #CCCCCC;
    border-radius: 6px;
    padding: 16px;
}

.control-form {
    margin-bottom: 16px;
}

.form-group {
    margin-bottom: 12px;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #333333;
    margin-bottom: 4px;
}

.form-group input {
    width: 100%;
    border: 1px solid #CCCCCC;
    border-radius: 4px;
    padding: 6px 8px;
    background: #FAFAFA;
    font-size: 14px;
    box-sizing: border-box;
}

.form-group input:focus {
    border-color: #3498DB;
    outline: none;
}

.form-group input[readonly] {
    background: #EEEEEE;
    color: #666666;
}

/* 进度条样式 */
.progress-section {
    margin-top: 12px;
}

.collect-progress {
    font-size: 14px;
    color: #666;
    background: #e8f4fd;
    border-radius: 8px;
    padding: 6px 12px;
    text-align: center;
}

.collect-result {
    margin-top: 12px;
    font-size: 16px;
    color: #333;
    background: #f7f8fa;
    border-radius: 8px;
    padding: 8px 16px;
    text-align: center;
}

.control-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
}

.read-save-btn, .stop-btn {
    border: none;
    border-radius: 4px;
    padding: 10px 20px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    min-width: 100px;
}

.read-save-btn {
    background: #3498DB;
    color: #FFFFFF;
}

.read-save-btn.collecting {
    background: #E67E22;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.stop-btn {
    background: #E74C3C;
    color: #FFFFFF;
}

.read-save-btn:disabled {
    background: #CCCCCC;
    cursor: not-allowed;
}

/* 右侧采样历史表格 */
.sampling-history {
    flex: 1;
    background: #FFFFFF;
    border: 1px solid #CCCCCC;
    border-radius: 6px;
    height: 200px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.history-header {
    background: #F5F5F5;
    border-bottom: 1px solid #CCCCCC;
    display: flex;
    padding: 10px 8px;
    font-size: 14px;
    font-weight: 600;
    color: #333333;
    border-radius: 6px 6px 0 0;
}

.history-content {
    flex: 1;
    overflow-y: auto;
}

.history-row {
    display: flex;
    padding: 10px 8px;
    border-bottom: 1px solid #EEEEEE;
    font-size: 14px;
    color: #333333;
}

.history-header .col, .history-row .col {
    flex: 1;
    text-align: center;
}

.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999999;
    font-size: 14px;
    font-style: italic;
}

/* 下载报告区 */
.download-section {
    padding: 16px;
    text-align: center;
    margin-bottom: 20px;
}

.download-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
}

.download-btn, .reset-btn {
    border: none;
    border-radius: 4px;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    min-width: 160px;
}

.download-btn {
    background: #3498DB;
    color: #FFFFFF;
}

.reset-btn {
    background: #95A5A6;
    color: #FFFFFF;
}

.download-btn:hover {
    background: #2E86DE;
}

.reset-btn:hover {
    background: #7F8C8D;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .data-chart-layout {
        flex-direction: column;
        gap: 16px;
    }
    
    .data-input-table {
        flex: none;
    }
    
    .measurement-layout {
        flex-direction: column;
        gap: 16px;
    }
    
    .measurement-control {
        flex: none;
    }
    
    .control-actions {
        flex-direction: column;
        gap: 8px;
    }
    
    .control-actions button {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .standard-curve-section,
    .realtime-measurement {
        margin: 8px 12px;
    }
    
    .collapse-header {
        padding: 10px 12px;
    }
    
    .collapse-content {
        padding: 12px;
    }
    
    .page-title {
        font-size: 16px;
    }
    
    .data-chart-layout {
        flex-direction: column;
        gap: 12px;
    }
    
    .data-input-table {
        flex: none;
    }
    
    .measurement-layout {
        flex-direction: column;
        gap: 12px;
    }
    
    .measurement-control {
        flex: none;
        padding: 12px;
    }
    
    .control-actions {
        flex-direction: column;
        gap: 8px;
    }
    
    .control-actions button {
        width: 100%;
        padding: 12px;
    }
    
    .download-actions {
        flex-direction: column;
        gap: 8px;
    }
    
    .download-actions button {
        width: 100%;
    }
    
    .action-buttons-row {
        flex-direction: column;
        gap: 8px;
    }
    
    .action-buttons-row button {
        width: 100%;
    }
    
    .action-buttons {
        flex-direction: column;
        gap: 4px;
    }
    
    .action-buttons button {
        width: 100%;
        padding: 4px 8px;
        font-size: 11px;
    }
    
    .header-section {
        padding: 0;
        width: 100%;
    }
    
    .header-logo {
        width: 100vw;
        height: auto;
        margin: 0 -12px;
    }
}
</style>