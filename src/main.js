/*
 * @Author: 241164@qq.com
 * @Date: 2025-05-29 17:22:20
 */
import { createApp } from "vue";
import App from "./App.vue";

const app = createApp(App);

// 全局Toast函数
let toastCount = 0; // 用于跟踪当前显示的toast数量

app.config.globalProperties.$toast = (message) => {
    // 创建toast容器（如果不存在）
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 350px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // 创建toast元素
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.4;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease, opacity 0.3s ease;
        opacity: 0;
        pointer-events: auto;
        word-wrap: break-word;
        max-width: 100%;
    `;
    
    // 添加到容器
    toastContainer.appendChild(toast);
    toastCount++;
    
    // 触发进入动画
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 10);
    
    // 自动移除
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
                toastCount--;
                
                // 如果没有toast了，移除容器
                if (toastCount === 0 && toastContainer.parentNode) {
                    document.body.removeChild(toastContainer);
                }
            }
        }, 300);
    }, 3000);
};

// 将toast函数挂载到window对象上，方便在组件中使用
window.$toast = app.config.globalProperties.$toast;

app.mount("#app");
