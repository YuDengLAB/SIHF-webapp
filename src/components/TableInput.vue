<!--
 * @Author: 241164@qq.com
 * @Date: 2025-05-29 17:27:38
-->
<template>
    <van-cell-group class="table-input-group">
        <div class="row header-row">
            <div class="cell index header">序号</div>
            <div class="cell input header">浓度</div>
            <div class="cell voltage header">电压</div>
            <div class="cell btn header">操作</div>
        </div>
        <div v-for="(row, idx) in tableData" :key="row.id" class="row">
            <div class="cell index">{{ row.id }}</div>
            <div class="cell input">
                <van-field v-model="row.concentration" placeholder="输入浓度" type="number" input-align="center" />
            </div>
            <div class="cell voltage">
                <span v-if="collectingIndex === idx" class="collecting-text">
                    采集中 {{ collectProgress[idx]?.current || 0 }}/{{ collectProgress[idx]?.total || 10 }}
                </span>
                <span v-else>{{ row.voltage }}</span>
            </div>
            <div class="cell btn">
                <van-button 
                    size="small" 
                    type="primary" 
                    @click="startMeasure(idx)"
                    :loading="collectingIndex === idx"
                    :disabled="collectingIndex !== null && collectingIndex !== idx"
                >
                    {{ collectingIndex === idx ? '采集中' : '开始' }}
                </van-button>
            </div>
        </div>
    </van-cell-group>
</template>

<script setup>
import { ref, watch } from 'vue'
import collectApi from '../assets/collectApi.js'

const props = defineProps(['tableData'])
const emit = defineEmits(['update'])
const tableData = ref(JSON.parse(JSON.stringify(props.tableData)))
const collectingIndex = ref(null)
const collectProgress = ref({})

watch(tableData, (val) => emit('update', val), { deep: true })

function startMeasure(idx) {
    if (collectingIndex.value !== null) return
    
    collectingIndex.value = idx
    collectProgress.value[idx] = { current: 0, total: 10 }
    tableData.value[idx].voltage = ''
    
    // 开始采集
    collectApi.startCollection(
        // 数据回调
        (progress) => {
            collectProgress.value[idx] = {
                current: progress.current,
                total: progress.total
            }
            console.log(`第${idx + 1}行采集进度: ${progress.current}/${progress.total}, 当前电压: ${progress.voltage}`)
        },
        // 完成回调
        (result) => {
            collectingIndex.value = null
            
            if (result.success) {
                tableData.value[idx].voltage = result.average
                
                if (window.$toast) {
                    window.$toast(`第${idx + 1}行采集完成！平均电压：${result.average}V`)
                }
            } else {
                console.error(`第${idx + 1}行采集失败:`, result.error)
                if (window.$toast) {
                    window.$toast(`第${idx + 1}行采集失败：${result.error}`)
                }
            }
            
            // 清除进度显示
            delete collectProgress.value[idx]
        }
    ).then(result => {
        if (!result.success) {
            collectingIndex.value = null
            if (window.$toast) {
                window.$toast(`第${idx + 1}行启动采集失败：${result.error}`)
            }
        }
    })
}
</script>

<style scoped>
.table-input-group {
    background: #fff;
    border-radius: 12px;
    margin: 16px 12px 20px 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    padding: 8px 0;
}

.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #f2f3f5;
}

.row:last-child {
    border-bottom: none;
}

.cell {
    flex: 1;
    text-align: center;
    min-width: 0;
}

.index {
    color: #888;
    font-weight: 500;
    flex: 0.7;
}

.input {
    flex: 2;
}

.voltage {
    color: #2d8cf0;
    font-weight: 600;
    flex: 1.2;
}

.collecting-text {
    color: #ff6b35;
    font-size: 12px;
    font-weight: 500;
}

.btn {
    flex: 1.2;
    display: flex;
    justify-content: center;
}

.header-row {
    background: #f7f8fa;
    font-weight: 600;
    font-size: 15px;
    border-radius: 8px 8px 0 0;
    border-bottom: 1.5px solid #e3e9f4;
    margin-bottom: 2px;
}

.header {
    color: #222;
    font-weight: 600;
    background: transparent;
}
</style>