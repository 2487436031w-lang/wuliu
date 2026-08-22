# Contract templates

## MQTT topic row

```markdown
| Topic | Dir | Publisher | Subscriber | Payload | Notes |
|-------|-----|-----------|------------|---------|-------|
| logistics/{deviceId}/telemetry | up | device | cloud | see schema | loc/heartbeat |
| logistics/{deviceId}/event | up | device | cloud | type, ts, data | unseal etc |
| logistics/{deviceId}/command | down | cloud | device | cmdId, type, args | |
| logistics/{deviceId}/command/ack | up | device | cloud | cmdId, result | |
```

### Payload schema example

```json
{
  "deviceId": "bp-001",
  "ts": 1710000000,
  "source": "gps|sim",
  "lat": 32.06,
  "lon": 118.79,
  "fix": true
}
```

## HTTP endpoint row

```markdown
| Method | Path | Role | Body | Response | Errors |
|--------|------|------|------|----------|--------|
| POST | /api/v1/shipments | 仓管 | {cargo, vehicleId} | {id, status} | 400,409 |
| GET | /api/v1/shipments/{id} | 货主 | — | shipment+lastLoc+eta | 404 |
```

## Sprint contract blurb

```markdown
## Sprint N contract
- Must in scope: M1,M2,…
- Frozen interfaces: mqtt.md#v1, http.md#v1
- Out of scope: …
- AI: in|out (if in: Judgment only / + CommandDraft)
- Demo gate date: YYYY-MM-DD
```

## Handoff packet

```markdown
### Handoff: <slice>
- Owner → Next: A → B
- Contracts touched:
- How to verify:
- Risks:
- Blockers:
```
