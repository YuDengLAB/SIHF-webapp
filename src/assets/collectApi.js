import { formatTime } from "./util.js";
// Change this line - mqtt.js exports using module.exports, so we need to import it as default
import mqtt from "mqtt";

class CollectApi {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.voltageData = [];
    this.collectCount = 0;
    this.targetCount = 10;
    this.onDataCallback = null;
    this.onCompleteCallback = null;

    // MQTT配置 - 修改为浏览器环境的WebSocket协议
    this.mqttHost = "broker.emqx.io";
    this.mqttPort = 8083; // WebSocket端口
    this.deviceSubTopic = "/myad/sub";
    this.devicePubTopic = "/myad/pub";
    this.mpSubTopic = this.devicePubTopic;
    this.mpPubTopic = this.deviceSubTopic;
    this.mqttUrl = `ws://${this.mqttHost}:${this.mqttPort}/mqtt`; // 使用ws://协议
  }

  // 连接MQTT服务器
  async connectMqtt() {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve(true);
        return;
      }

      // 显示连接提示
      if (window.$toast) {
        window.$toast("Connecting to server...");
      }

      // 使用mqtt.connect方法 - mqtt is now imported as default export
      this.client = mqtt.connect(this.mqttUrl);

      // 设置连接超时
      const timeoutId = setTimeout(() => {
        if (window.$toast) {
          window.$toast("Connection timeout");
        }
        reject(new Error("Connection timeout"));
      }, 10000);

      this.client.on("connect", () => {
        clearTimeout(timeoutId);
        console.log("Successfully connected to MQTT server!");
        this.isConnected = true;

        if (window.$toast) {
          window.$toast("Connected successfully");
        }

        // 订阅主题
        setTimeout(() => {
          this.client.subscribe(this.mpSubTopic, (err) => {
            if (!err) {
              console.log("Successfully subscribed to device uplink data topic!");
              if (window.$toast) {
                window.$toast("Subscription successful");
              }
              resolve(true);
            } else {
              reject(err);
            }
          });
        }, 1000);
      });

      this.client.on("error", (error) => {
        clearTimeout(timeoutId);
        console.error("MQTT connection error:", error);
        if (window.$toast) {
          window.$toast("Connection failed");
        }
        reject(error);
      });

      // 监听消息
      this.client.on("message", (topic, message) => {
        this.handleMessage(topic, message);
      });
    });
  }

  // 处理接收到的消息
  handleMessage(topic, message) {
    // console.log("Received message:", topic);

    let dataFromDev = {};
    try {
      dataFromDev = JSON.parse(message.toString());
      console.log("Parsed data:", dataFromDev);

      // 如果正在采集数据 - 关键判断条件
      if (
        this.collectCount < this.targetCount && // 确保采集次数小于目标次数(10)
        dataFromDev.Voltage !== undefined
      ) {
        this.voltageData.push(dataFromDev.Voltage);
        this.collectCount++;

        // 回调进度更新
        if (this.onDataCallback) {
          this.onDataCallback({
            current: this.collectCount,
            total: this.targetCount,
            voltage: dataFromDev.Voltage,
          });
        }

        // 采集完成 - 达到10次后自动停止
        if (this.collectCount >= this.targetCount) {
          this.completeCollection();
        }
      }
    } catch (error) {
      console.group(`[${formatTime(new Date())}][Message parsing failed]`);
      console.log("[Error message]", message.toString());
      console.log("Reported data JSON format incorrect", error);
      console.groupEnd();
    }
  }

  // 完成采集
  completeCollection() {
    if (this.voltageData.length === 0) {
      if (this.onCompleteCallback) {
        this.onCompleteCallback({ success: false, error: "No valid data collected" });
      }
      return;
    }
  
    // 计算平均值
    const average =
      this.voltageData.reduce((sum, voltage) => sum + voltage, 0) /
      this.voltageData.length;
    const result = {
      success: true,
      average: Number(average.toFixed(3)),
      data: [...this.voltageData],
      count: this.voltageData.length,
    };
  
    console.log("Collection completed:", result);
  
    if (this.onCompleteCallback) {
      this.onCompleteCallback(result);
    }
  
    // 重置采集状态
    this.resetCollection();
    
    // 断开MQTT连接，确保不再接收新数据
    this.disconnect();
  }

  // 开始采集
  async startCollection(onDataCallback, onCompleteCallback) {
    try {
      // 确保MQTT已连接
      if (!this.isConnected) {
        await this.connectMqtt();
      }

      // 重置采集状态
      this.resetCollection();

      // 设置回调函数
      this.onDataCallback = onDataCallback;
      this.onCompleteCallback = onCompleteCallback;

      console.log("Starting voltage data collection...");
      if (window.$toast) {
        window.$toast("Starting data collection...");
      }

      return { success: true, message: "Collection started" };
    } catch (error) {
      console.error("Failed to start collection:", error);
      return { success: false, error: error.message };
    }
  }

  // 重置采集状态
  resetCollection() {
    this.voltageData = [];
    this.collectCount = 0;
    // 清空回调函数，避免后续误触发
    this.onDataCallback = null;
    this.onCompleteCallback = null;
  }

  // 断开连接
  disconnect() {
    if (this.client && this.isConnected) {
      this.client.end();
      this.isConnected = false;
      console.log("MQTT connection disconnected");
    }
  }
}

// 创建单例实例
const collectApi = new CollectApi();

export default collectApi;
