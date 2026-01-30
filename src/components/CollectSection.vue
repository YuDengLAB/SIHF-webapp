<template>
    <div class="collect-section">
        <div v-if="collecting" class="collect-progress">
            采集进度：{{ collectProgress.current }}/{{ collectProgress.total }}
        </div>
        <div v-if="voltage" class="collect-result">电压均值：{{ voltage }}</div>
        <div v-if="concentration" class="collect-result">推算浓度：{{ concentration }}</div>
        <van-button block type="warning" class="btn" @click="collect" :loading="collecting" :disabled="collecting">
            {{ collecting ? '采集中...' : '采集' }}
        </van-button>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import collectApi from '../assets/collectApi.js'
const props = defineProps(['regression'])
const voltage = ref('')
const concentration = ref('')
const collecting = ref(false)
const collectProgress = ref({ current: 0, total: 10 })

function collect() {
    if (collecting.value) return

    collecting.value = true
    voltage.value = ''
    concentration.value = ''
    collectProgress.value = { current: 0, total: 10 }

    // 开始采集
    collectApi.startCollection(
        // 数据回调
        (progress) => {
            collectProgress.value = {
                current: progress.current,
                total: progress.total
            }
            console.log(`采集进度: ${progress.current}/${progress.total}, 当前电压: ${progress.voltage}`)
        },
        // 完成回调
        (result) => {
            collecting.value = false

            if (result.success) {
                voltage.value = result.average

                // 根据回归方程反推浓度
                if (props.regression && props.regression.a) {
                    const calculatedConcentration = (result.average - props.regression.b) / props.regression.a
                    concentration.value = calculatedConcentration.toFixed(3)
                }

                if (window.$toast) {
                    window.$toast(`采集完成！平均电压：${result.average}V`)
                }
            } else {
                console.error('采集失败:', result.error)
                if (window.$toast) {
                    window.$toast(`采集失败：${result.error}`)
                }
            }
        }
    ).then(result => {
        if (!result.success) {
            collecting.value = false
            if (window.$toast) {
                window.$toast(`启动采集失败：${result.error}`)
            }
        }
    })
}
</script>

<style scoped>
.collect-section {
    margin: 18px 12px 20px 12px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    padding: 18px 0 18px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.collect-progress {
    margin-top: 8px;
    font-size: 14px;
    color: #666;
    background: #e8f4fd;
    border-radius: 8px;
    padding: 6px 12px;
    text-align: center;
}

.collect-result {
    margin-top: 16px;
    font-size: 16px;
    color: #333;
    background: #f7f8fa;
    border-radius: 8px;
    padding: 8px 16px;
    text-align: center;
}

.btn {
    margin-top: 18px;
    width: 90%;
    font-size: 16px;
    border-radius: 8px;
    letter-spacing: 2px;
}
</style>