# BearPi E53 Notes

Official scenario boards commonly paired with course topics:

| Topic | Typical board | Sense | Actuate | Feasibility note |
|-------|---------------|-------|---------|------------------|
| 智慧农业 | E53-IA1 | Temp/humidity (SHT30), light (BH1750) | Motor / grow light GPIO | Strongest closed loop on stock kit |
| 智慧物流 | E53-ST1 | GPS / motion (board-dependent) | Limited | Highest delivery risk without confirmed GPS + map |
| 智慧烟感 | E53-SF1 | MQ2 gas/smoke | Buzzer | Good alert story; vision/broadcast often stretch |
| 智慧路灯 | E53-SC1 | Light sensor | Lamp GPIO | Easiest demo; highest homogenization |
| 人体感应 | E53-IS1 | PIR | Often buzzer / linked lamp | Arm/disarm state machine adds depth |

## Differentiation levers (reuse hardware) — IoT-first

1. Campus-specific stakeholder (实验室值班、宿舍绿植、社团温室、后厨误报)
2. Reliable closed loop: threshold + control feedback + online/offline
3. Multi-condition rules (threshold + slope + schedule + cooldown)
4. Confirm-then-act or auto-mode with safety interlocks + audit log
5. Lightweight business object (批次、地块、点位) without full CRM
6. Agent/RAG only as a side module after the above is solid

## Homogenization pattern to avoid

`传感器 → MQTT → 大屏折线图` with no real control/feedback — or renaming the official E53 sample only.

Also avoid: making the whole project story "我们做了个 Agent".
