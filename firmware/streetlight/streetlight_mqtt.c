/*
 * 智慧路灯合并固件 — C3 传感器 + D5 MQTT，对接项目 smart-light/{deviceSn}/…
 * 阶段 D 使用；C3/D5 单独验收通过后再 sync + 烧录本 sample
 */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "ohos_init.h"
#include "cmsis_os2.h"
#include "lwip/sockets.h"
#include "wifi_connect.h"
#include "MQTTClient.h"
#include "E53_SC1.h"
#include "streetlight_config.h"

#define TASK_STACK_SIZE (16 * 1024)

static unsigned char sendBuf[1200];
static unsigned char readBuf[1200];
static Network network;
static MQTTClient client;
static char topicLight[64];
static char topicStatus[64];
static char topicCommand[64];
static E53_SC1_Status_ENUM lampStatus = OFF;
static volatile int pendingCommand = 0;
static char pendingCmdBuf[160];

static void buildTopics(void)
{
    snprintf(topicLight, sizeof(topicLight), "smart-light/%s/light", DEVICE_SN);
    snprintf(topicStatus, sizeof(topicStatus), "smart-light/%s/status", DEVICE_SN);
    snprintf(topicCommand, sizeof(topicCommand), "smart-light/%s/command", DEVICE_SN);
}

static void publishStatus(void)
{
    MQTTMessage message;
    char payload[128];
    const char *st = (lampStatus == ON) ? "ON" : "OFF";

    snprintf(payload, sizeof(payload),
        "{\"deviceSn\":\"%s\",\"status\":\"%s\",\"timestamp\":\"live\"}", DEVICE_SN, st);
    message.qos = 1;
    message.retained = 0;
    message.payload = payload;
    message.payloadlen = strlen(payload);
    if (MQTTPublish(&client, topicStatus, &message) != 0) {
        printf("publish status failed\n");
    } else {
        printf("published status %s\n", st);
    }
}

/* 从 JSON {"command":"MANUAL_ON",...} 或纯文本中提取 command */
static void parseCommandPayload(const char *payload, char *cmdOut, size_t cmdOutLen)
{
    const char *key = "\"command\"";
    const char *p = strstr(payload, key);
    if (p == NULL) {
        strncpy(cmdOut, payload, cmdOutLen - 1);
        cmdOut[cmdOutLen - 1] = '\0';
        return;
    }
    p = strchr(p + strlen(key), '"');
    if (p == NULL) {
        strncpy(cmdOut, payload, cmdOutLen - 1);
        cmdOut[cmdOutLen - 1] = '\0';
        return;
    }
    p++;
    {
        const char *end = strchr(p, '"');
        size_t n;
        if (end == NULL) {
            strncpy(cmdOut, payload, cmdOutLen - 1);
            cmdOut[cmdOutLen - 1] = '\0';
            return;
        }
        n = (size_t)(end - p);
        if (n >= cmdOutLen) {
            n = cmdOutLen - 1;
        }
        memcpy(cmdOut, p, n);
        cmdOut[n] = '\0';
    }
}

static void applyCommand(const char *rawPayload)
{
    char cmd[48];

    parseCommandPayload(rawPayload, cmd, sizeof(cmd));
    /* OFF 必须先于 ON：MANUAL_OFF / AUTO_OFF 都含 OFF，不能先匹配 ON */
    if (strstr(cmd, "OFF") != NULL) {
        Light_StatusSet(OFF);
        lampStatus = OFF;
    } else if (strstr(cmd, "ON") != NULL) {
        Light_StatusSet(ON);
        lampStatus = ON;
    } else {
        printf("unknown command: %s\n", cmd);
        return;
    }
    publishStatus();
}

static void messageArrived(MessageData *data)
{
    int len = data->message->payloadlen;
    if (len <= 0) {
        return;
    }
    if (len >= (int)sizeof(pendingCmdBuf)) {
        len = sizeof(pendingCmdBuf) - 1;
    }
    memcpy(pendingCmdBuf, data->message->payload, len);
    pendingCmdBuf[len] = '\0';
    pendingCommand = 1;
}

static void mqttCleanup(void)
{
    if (MQTTIsConnected(&client)) {
        MQTTDisconnect(&client);
    }
    if (network.my_socket > 0) {
        NetworkDisconnect(&network);
        network.my_socket = 0;
    }
}

static int mqttConnectLoop(void)
{
    int rc;
    MQTTString clientId = MQTTString_initializer;
    char clientIdBuf[32];
    snprintf(clientIdBuf, sizeof(clientIdBuf), "bearpi-%s", DEVICE_SN);
    clientId.cstring = clientIdBuf;

    MQTTPacket_connectData data = MQTTPacket_connectData_initializer;
    data.clientID = clientId;
    data.willFlag = 0;
    data.MQTTVersion = 3;
    data.keepAliveInterval = 30;
    data.cleansession = 1;

    mqttCleanup();
    NetworkInit(&network);
    rc = NetworkConnect(&network, MQTT_BROKER_IP, MQTT_BROKER_PORT);
    if (rc != 0) {
        printf("MQTT TCP connect failed: %d (%s:%d)\n", rc, MQTT_BROKER_IP, MQTT_BROKER_PORT);
        return rc;
    }
    MQTTClientInit(&client, &network, 2000, sendBuf, sizeof(sendBuf), readBuf, sizeof(readBuf));

    rc = MQTTConnect(&client, &data);
    if (rc != 0) {
        printf("MQTTConnect failed: %d\n", rc);
        NetworkDisconnect(&network);
        return rc;
    }
    rc = MQTTSubscribe(&client, topicCommand, 1, messageArrived);
    if (rc != 0) {
        printf("MQTTSubscribe failed: %d\n", rc);
        MQTTDisconnect(&client);
        NetworkDisconnect(&network);
        return rc;
    }
    /* 握手完成后再设非阻塞：Hi3861 的 SO_RCVTIMEO 经常不唤醒 recv，Yield 会堵死主循环 */
    {
        int nb = 1;
        lwip_ioctl(network.my_socket, FIONBIO, &nb);
    }
    printf("MQTT connected, subscribed %s\n", topicCommand);
    return 0;
}

static void publishLight(float lux)
{
    MQTTMessage message;
    char payload[160];
    snprintf(payload, sizeof(payload),
        "{\"deviceSn\":\"%s\",\"lightIntensity\":%.2f,\"timestamp\":\"live\"}", DEVICE_SN, lux);
    message.qos = 0;
    message.retained = 0;
    message.payload = payload;
    message.payloadlen = strlen(payload);
    if (MQTTPublish(&client, topicLight, &message) != 0) {
        printf("publish light failed\n");
    } else {
        printf("published light %.2f\n", lux);
    }
}

static void StreetlightTask(void)
{
    float lux;
    int reportTicks = 0;

    buildTopics();

    if (WifiConnect(WIFI_SSID, WIFI_PSK) != 0) {
        printf("WiFi connect failed\n");
        return;
    }

    /* DHCP 刚完成时协议栈未稳，先等再连 MQTT，避免 TCP 立刻被对端丢弃 */
    printf("MQTT target %s:%d deviceSn=%s\n", MQTT_BROKER_IP, MQTT_BROKER_PORT, DEVICE_SN);
    osDelay(300);

    /* WiFi 初始化后再初始化 I2C/GPIO，避免与联网冲突 */
    E53_SC1_Init();

    while (mqttConnectLoop() != 0) {
        osDelay(3000);
    }

    printf("streetlight loop start\n");
    lux = E53_SC1_Read_Data();
    printf("Lux: %.2f\n", lux);
    publishLight(lux);
    publishStatus();

    while (1) {
        int yieldRound;
        /* 短超时 + 非阻塞 socket：即使没有下行指令也要回到这里发光照 */
        for (yieldRound = 0; yieldRound < 3; yieldRound++) {
            (void)MQTTYield(&client, 10);
            if (pendingCommand) {
                break;
            }
        }

        if (pendingCommand) {
            printf("command arrived: %s\n", pendingCmdBuf);
            applyCommand(pendingCmdBuf);
            pendingCommand = 0;
        }

        reportTicks++;
        /* osDelay(100) × 10 ≈ 1 秒上报一次 */
        if (reportTicks >= 10) {
            reportTicks = 0;
            if (!MQTTIsConnected(&client)) {
                printf("MQTT offline, reconnect\n");
                while (mqttConnectLoop() != 0) {
                    osDelay(3000);
                }
            }
            lux = E53_SC1_Read_Data();
            printf("Lux: %.2f\n", lux);
            publishLight(lux);
        }

        osDelay(100);
    }
}

static void StreetlightEntry(void)
{
    osThreadAttr_t attr = {0};
    attr.name = "StreetlightTask";
    attr.stack_size = TASK_STACK_SIZE;
    attr.priority = osPriorityNormal;
    if (osThreadNew((osThreadFunc_t)StreetlightTask, NULL, &attr) == NULL) {
        printf("Failed to create StreetlightTask\n");
    }
}

APP_FEATURE_INIT(StreetlightEntry);
